
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const socketRef = useRef<Socket | null>(null);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  // Load users for admin list
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
              // default to offline; will flip to online via presence events
              status: 'offline'
            }))
          );
        }
      } catch {}
    };
    if (token) loadUsers();
  }, [token]);

  // Load conversation when selecting a patient
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
          setMessages(msgs);
          // mark read
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

  // Socket setup
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => {});
    socket.on('presence:snapshot', (snap: any) => {
      // snap.providersOnline, doctorsOnline already exist; handle patients via updates later
      // For admin chat, use updates as they happen; snapshot is useful for adminOnline state
      if (typeof snap?.adminOnline === 'boolean') setAdminOnline(!!snap.adminOnline);
    });
    socket.on('message:new', async (m: any) => {
      // If message belongs to the current thread, append; else bump unread in list
      if (selectedPatient) {
        const isInThread =
          (m.from_role === 'patient' && m.from_user_id === Number(selectedPatient.id) && m.to_role === 'admin') ||
          (m.from_role === 'admin' && m.to_role === 'patient' && m.to_user_id === Number(selectedPatient.id));
        if (isInThread) {
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
          // If incoming from patient while open, mark read immediately
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
      // Not current thread: if from a patient -> admin, update unread counts in list
      if (m.from_role === 'patient' && m.to_role === 'admin') {
        setPatients(prev => {
          const found = prev.some(p => Number(p.id) === Number(m.from_user_id));
          const updated = prev.map(p => Number(p.id) === Number(m.from_user_id)
            ? { ...p, unreadCount: (p.unreadCount || 0) + 1, lastMessage: m.content }
            : p
          );
          // If sender not in list yet, add it
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
      // reflect patient online/offline in list and header
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
    setSelectedPatient(patient);
  // Clear unread for this patient locally
    setPatients(prev => {
      const updated = prev.map(p => p.id === patient.id ? { ...p, unreadCount: 0 } : p);
      const total = updated.reduce((sum, p) => sum + (p.unreadCount || 0), 0);
      window.dispatchEvent(new CustomEvent('admin-unread:update', { detail: { unread: total } }));
      return updated;
    });
  };

  // Emit typing events
  useEffect(() => {
    const socket = socketRef.current; if (!socket) return;
    if (!selectedPatient) return;
    if (isTyping) socket.emit('typing:start', { toRole: 'patient', toUserId: Number(selectedPatient.id) });
    else socket.emit('typing:stop', { toRole: 'patient', toUserId: Number(selectedPatient.id) });
  }, [isTyping, selectedPatient]);

  return (
    <div className="space-y-4 sm:space-y-6 flex flex-col h-full max-h-[calc(100vh-200px)]">
      <h1 className="text-2xl sm:text-3xl font-bold text-white px-1">Patient Communication</h1>
      
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Patient List - Hidden on mobile if a patient is selected */}
        <Card className={`bg-gray-800 border-gray-700 flex flex-col min-h-0 ${selectedPatient ? 'hidden lg:flex' : 'flex'}`}>
          <CardHeader className="py-3 px-4 sm:py-4 sm:px-6">
            <CardTitle className="text-white text-lg flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
              Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0">
            <div className="px-4 pb-2">
              <Input 
                placeholder="Search patients…" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="bg-gray-900/50 border-gray-700 focus:border-blue-500 transition-colors"
              />
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {patients.filter(p => 
                  p.name.toLowerCase().includes(search.toLowerCase()) || 
                  String(p.id).includes(search)
                ).map((patient) => (
                  <PatientListItem
                    key={patient.id}
                    patient={patient}
                    isSelected={selectedPatient?.id === patient.id}
                    onClick={() => handlePatientSelect(patient)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area - Full width on mobile if a patient is selected */}
        <div className={`lg:col-span-2 min-h-0 ${!selectedPatient ? 'hidden lg:block' : 'block'}`}>
          {selectedPatient ? (
            <Card className="bg-gray-800 border-gray-700 h-full flex flex-col min-h-0 shadow-2xl relative overflow-hidden">
              {/* Chat Header */}
              <CardHeader className="border-b border-gray-700 py-3 px-4 sm:py-4 sm:px-6 bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
                <ChatHeader
                  patient={selectedPatient}
                  onBack={() => setSelectedPatient(null)}
                  typing={counterpartyTyping}
                  online={adminOnline}
                />
              </CardHeader>

              {/* Messages Area */}
              <CardContent className="flex-1 p-0 min-h-0 relative">
                <ScrollArea className="h-full max-h-[400px] lg:max-h-[500px]">
                  <div className="p-4 space-y-4">
                    {messages.length > 0 ? (
                      messages.map((message) => (
                        <ChatMessage key={message.id} message={message} />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                        <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Load More Button */}
              <div className="px-4 py-1 border-t border-gray-700/50 bg-gray-900/10">
                <button 
                  className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1" 
                  onClick={() => setPage(p => p + 1)}
                >
                  Load older messages
                </button>
              </div>

              {/* Message Input */}
              <div className="p-3 sm:p-4 border-t border-gray-700 bg-gray-800/80 backdrop-blur-sm">
                <MessageInput
                  value={newMessage}
                  onChange={setNewMessage}
                  onSend={handleSendMessage}
                />
              </div>
            </Card>
          ) : (
            <Card className="bg-gray-800 border-gray-700 h-full flex items-center justify-center border-dashed border-2 opacity-50">
              <EmptyChat />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
