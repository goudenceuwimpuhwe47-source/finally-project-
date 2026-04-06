import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, User, MoreVertical } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./chat/ChatMessage";
import { ChatHeader } from "./chat/ChatHeader";
import { MessageInput } from "./chat/MessageInput";
import { PatientListItem } from "./chat/PatientListItem";
import { EmptyChat } from "./chat/EmptyChat";
import { io, Socket } from "socket.io-client";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/utils";

export interface ChatMessage {
  id: number | string;
  sender: 'admin' | 'patient';
  message: string;
  timestamp: string;
  senderName: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Patient {
  id: number | string;
  name: string;
  avatar?: string;
  lastMessage: string;
  unreadCount: number;
  status: 'online' | 'offline';
}

export const AdminChat = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [counterpartyTyping, setCounterpartyTyping] = useState(false);
  const [adminOnline, setAdminOnline] = useState(true);
  const [clearedAt, setClearedAt] = useState<number>(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const socketRef = useRef<Socket | null>(null);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/chat/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.users) {
          setPatients(
            data.users.map((u: any) => ({
              id: u.id,
              name: u.name || u.email,
              lastMessage: u.lastMessage || '',
              unreadCount: u.unreadCount || 0,
              status: 'offline'
            }))
          );
        }
      } catch {}
    };
    if (token) loadUsers();
  }, [token]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedPatient) return;
      try {
        const res = await fetch(`${API_URL}/admin/chat/messages/${selectedPatient.id}?page=${page}&pageSize=${pageSize}` ,{
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.messages) {
          const msgs: ChatMessage[] = data.messages.map((m: any) => ({
            id: m.id,
            sender: m.from_role === 'admin' ? 'admin' : 'patient',
            message: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            senderName: m.from_role === 'admin' ? 'Admin' : selectedPatient.name,
            status: m.status
          }));
          const key = `admin:patient:${selectedPatient.id}`;
          const ts = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
          const hidden = new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]'));
          const filtered = msgs.filter((m: any) => {
            const t = new Date((m as any).created_at || 0).getTime();
            return (!ts || t >= ts) && !hidden.has(String(m.id));
          });
          setMessages(filtered);
          setClearedAt(Number.isFinite(ts) ? ts : 0);
          setHiddenIds(hidden);
          await fetch(`${API_URL}/admin/chat/mark-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ patientId: selectedPatient.id })
          });
        }
      } catch {}
    };
    loadMessages();
  }, [selectedPatient, token, page]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('presence:snapshot', (snap: any) => {
      if (typeof snap?.adminOnline === 'boolean') setAdminOnline(!!snap.adminOnline);
    });
    socket.on('message:new', async (m: any) => {
      if (selectedPatient) {
        const isInThread =
          (m.from_role === 'patient' && m.from_user_id === Number(selectedPatient.id) && m.to_role === 'admin') ||
          (m.from_role === 'admin' && m.to_role === 'patient' && m.to_user_id === Number(selectedPatient.id));
        if (isInThread) {
          const t = new Date(m.created_at || 0).getTime();
          const key = `admin:patient:${selectedPatient.id}`;
          const hidden = new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]'));
          
          if ((!clearedAt || t >= clearedAt) && !hidden.has(String(m.id))) {
            setMessages(prev => [
              ...prev,
              {
                id: m.id,
                sender: m.from_role === 'admin' ? 'admin' : 'patient',
                message: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                senderName: m.from_role === 'admin' ? 'Admin' : selectedPatient.name,
                status: m.status
              }
            ]);
          }
          if (m.from_role === 'patient') {
            try {
              await fetch(`${API_URL}/admin/chat/mark-read`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ patientId: selectedPatient.id })
              });
            } catch {}
          }
          return;
        }
      }
      if (m.from_role === 'patient' && m.to_role === 'admin') {
        setPatients(prev => {
          const found = prev.some(p => Number(p.id) === Number(m.from_user_id));
          const updated = prev.map(p => Number(p.id) === Number(m.from_user_id)
            ? { ...p, unreadCount: (p.unreadCount || 0) + 1, lastMessage: m.content }
            : p
          );
          if (!found) {
            updated.unshift({ id: m.from_user_id, name: `Patient ${m.from_user_id}`, lastMessage: m.content, unreadCount: 1, status: 'online' });
          }
          const total = updated.reduce((sum, p) => sum + (p.unreadCount || 0), 0);
          window.dispatchEvent(new CustomEvent('admin-unread:update', { detail: { unread: total } }));
          return updated;
        });
      }
    });
    socket.on('message:status', (s: any) => {
      setMessages(prev => prev.map(msg => msg.id === s.id ? { ...msg, status: s.status } : msg));
    });
    socket.on('presence:update', (p: any) => {
      if (p.role === 'admin') setAdminOnline(!!p.online);
      if (p.role === 'patient' && p.userId != null) {
        setPatients(prev => prev.map(pt => Number(pt.id) === Number(p.userId) ? { ...pt, status: p.online ? 'online' : 'offline' } : pt));
        setSelectedPatient(curr => curr && Number(curr.id) === Number(p.userId) ? { ...curr, status: p.online ? 'online' : 'offline' } as any : curr);
      }
    });
    socket.on('typing:start', (ev: any) => {
      if (selectedPatient && ev.fromRole === 'patient' && Number(ev.fromUserId) === Number(selectedPatient.id)) setCounterpartyTyping(true);
    });
    socket.on('typing:stop', (ev: any) => {
      if (selectedPatient && ev.fromRole === 'patient' && Number(ev.fromUserId) === Number(selectedPatient.id)) setCounterpartyTyping(false);
    });
    return () => {
      socket.disconnect();
    };
  }, [token, selectedPatient]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedPatient) return;
    const socket = socketRef.current;
    if (!socket) return;
    const content = newMessage.trim();
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'admin',
      message: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: 'Admin',
      status: 'sent'
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
  socket.emit('message:send', { toUserId: Number(selectedPatient.id), toRole: 'patient', content }, (ack: any) => {
      if (ack?.ok && ack.message) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? {
          ...m,
          id: ack.message.id,
          status: ack.message.status
        } : m));
      }
    });
  };

  const handlePatientSelect = (patient: Patient) => {
    const key = `admin:patient:${patient.id}`;
    const ts = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
    setClearedAt(Number.isFinite(ts) ? ts : 0);
    setHiddenIds(new Set(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]')));
    setSelectedPatient(patient);
    setPatients(prev => {
      const updated = prev.map(p => p.id === patient.id ? { ...p, unreadCount: 0 } : p);
      const total = updated.reduce((sum, p) => sum + (p.unreadCount || 0), 0);
      window.dispatchEvent(new CustomEvent('admin-unread:update', { detail: { unread: total } }));
      return updated;
    });
  };

  useEffect(() => {
    const socket = socketRef.current; if (!socket) return;
    if (!selectedPatient) return;
    if (isTyping) socket.emit('typing:start', { toRole: 'patient', toUserId: Number(selectedPatient.id) });
    else socket.emit('typing:stop', { toRole: 'patient', toUserId: Number(selectedPatient.id) });
  }, [isTyping, selectedPatient]);

  return (
    <div className="space-y-8 flex flex-col h-full max-h-[calc(100vh-140px)]">
      <div className="flex items-center gap-4 px-1">
        <div className="p-2.5 bg-primary rounded-2xl shadow-lg shadow-primary/20">
          <MessageSquare className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none">Telemetry Uplink</h1>
          <p className="text-slate-400 font-bold text-xs mt-1.5 uppercase tracking-widest">Real-time patient communication terminal</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className={`bg-white border-slate-200 flex flex-col min-h-0 shadow-xl rounded-3xl overflow-hidden border-t-4 border-t-primary ${selectedPatient ? 'hidden lg:flex' : 'flex'}`}>
          <CardHeader className="py-3 px-4 sm:py-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-slate-800 text-lg font-black tracking-tight flex items-center uppercase">
              <User className="h-5 w-5 mr-3 text-primary" />
              Active Nodes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="px-5 pb-4">
              <Input 
                placeholder="Search registries…" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-50 border-slate-100 focus:ring-primary/40 focus:border-primary transition-all h-12 rounded-xl font-bold placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest mt-4"
              />
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {patients.filter(p => 
                  p.name.toLowerCase().includes(search.toLowerCase()) || 
                  String(p.id).includes(search)
                ).map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handlePatientSelect(patient)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      selectedPatient?.id === patient.id 
                        ? 'bg-primary/5 border-primary/20 shadow-sm ring-1 ring-primary/5' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`font-black tracking-tight truncate ${selectedPatient?.id === patient.id ? 'text-primary' : 'text-slate-800'}`}>{patient.name}</p>
                      {patient.unreadCount > 0 && (
                        <span className="bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 shadow-lg shadow-primary/20">
                          {patient.unreadCount} NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-bold truncate leading-none">{patient.lastMessage}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className={`lg:col-span-2 min-h-0 ${!selectedPatient ? 'hidden lg:block' : 'block'}`}>
          {selectedPatient ? (
            <Card className="bg-white border-slate-100 shadow-sm h-full flex flex-col min-h-0 rounded-[32px] relative overflow-hidden">
              <CardHeader className="border-b border-slate-50 py-5 px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex flex-row items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight leading-none">{selectedPatient.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5 flex items-center gap-2">
                    {counterpartyTyping ? (
                      <>
                        <div className="flex gap-0.5 items-center">
                          <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-75" />
                          <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-150" />
                        </div>
                        Typing Signal
                      </>
                    ) : (
                      selectedPatient.status === 'online' ? 'Active Connection' : 'Station Offline'
                    )}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 transition-all rounded-xl">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white border-slate-100 rounded-xl shadow-xl">
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-700 focus:bg-red-50 font-bold uppercase text-[10px] tracking-widest py-3 cursor-pointer"
                      onClick={() => {
                        const key = `admin:patient:${selectedPatient.id}`;
                        const now = Date.now();
                        localStorage.setItem(`chatClearedAt:${key}`, String(now));
                        setClearedAt(now);
                        setMessages([]);
                      }}
                    >
                      Clear Conversation History
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="flex-1 p-0 min-h-0 relative">
                <ScrollArea className="h-full max-h-[400px] lg:max-h-[500px]">
                  <div className="p-4 space-y-4">
                    {messages.length > 0 ? (
                      messages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                        <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                        <p className="font-bold text-xs uppercase tracking-widest">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              <div className="px-8 py-2 border-t border-slate-50 bg-slate-50/50">
                <button 
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-all flex items-center gap-2" 
                  onClick={() => setPage(p => p + 1)}
                >
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  Request Historic Packets
                </button>
              </div>

              <div className="p-6 border-t border-slate-50 bg-white">
                <MessageInput
                  value={newMessage}
                  onChange={setNewMessage}
                  onSend={handleSendMessage}
                />
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-50/50 border-2 border-dashed border-slate-100 h-full flex items-center justify-center rounded-[40px] opacity-70">
              <EmptyChat />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
