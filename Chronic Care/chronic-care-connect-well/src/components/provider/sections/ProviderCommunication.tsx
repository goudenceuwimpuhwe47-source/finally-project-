
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Msg = { id: number | string; from_role: string; to_role: string; content: string; created_at: string; status?: 'sent'|'delivered'|'read' };
type ChatUser = { id: number; name?: string; email?: string; username?: string; lastMessage?: string; unreadCount?: number };

export const ProviderCommunication = () => {
  const [patients, setPatients] = useState<ChatUser[]>([]);
  const [activePatient, setActivePatient] = useState<ChatUser | null>(null);
  const [activeAdmin, setActiveAdmin] = useState<boolean>(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const token = useMemo(()=> localStorage.getItem('token') || '', []);
  const socketRef = useRef<Socket | null>(null);
  const [onlinePatients, setOnlinePatients] = useState<Set<number>>(new Set());
  const [adminOnline, setAdminOnline] = useState<boolean>(false);
  const [adminUnread, setAdminUnread] = useState<number>(0);
  const [clearedAt, setClearedAt] = useState<number>(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sortByTime = (list: Msg[]) => list.slice().sort((a,b)=> new Date(a.created_at||0).getTime() - new Date(b.created_at||0).getTime());
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);
  const markRead = async (patientId: number) => {
    try {
      await fetch('http://localhost:5000/provider/chat/mark-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId })
      });
    } catch {}
  };
  const reloadActiveMessages = async (pid: number) => {
    try {
      const res = await fetch(`http://localhost:5000/provider/chat/messages/${pid}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
  const list = Array.isArray(data.messages) ? data.messages : [];
  setMessages(sortByTime(list));
    } catch {}
  };

  const loadAdminMessages = async () => {
    try {
      const res = await fetch('http://localhost:5000/provider/chat/admin/messages', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data.messages) ? data.messages : [];
      setMessages(sortByTime(list));
      await fetch('http://localhost:5000/provider/chat/admin/mark-read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setAdminUnread(0);
    } catch {}
  };

  // load conversation list
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5000/provider/chat/users', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setPatients(Array.isArray(data.users) ? data.users : []);
      } catch {}
    };
    load();
  }, [token]);

  // load messages when selecting patient or admin
  useEffect(() => {
    const loadMsgs = async () => {
      if (!token) return;
      if (activeAdmin) { await loadAdminMessages(); return; }
      if (!activePatient) return;
      try {
        // read clearedAt & hidden for this conversation
        const key = `provider:patient:${activePatient.id}`;
        const ts = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
        setClearedAt(Number.isFinite(ts) ? ts : 0);
  const hidden = new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]'));
  setHiddenIds(hidden);
        const res = await fetch(`http://localhost:5000/provider/chat/messages/${activePatient.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const list = Array.isArray(data.messages) ? data.messages : [];
        const filtered = list.filter((m:any) => {
          const t = new Date(m.created_at||0).getTime();
          return (!ts || t>=ts) && !hidden.has(String(m.id));
        });
  setMessages(sortByTime(filtered));
        await fetch('http://localhost:5000/provider/chat/mark-read', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ patientId: activePatient.id })
        });
  // Clear unread for this patient locally
  setPatients(prev => prev.map(u => u.id === activePatient.id ? { ...u, unreadCount: 0 } : u));
      } catch {}
    };
    loadMsgs();
  }, [token, activePatient, activeAdmin]);

  // socket wiring
  useEffect(() => {
    if (!token) return;
    const socket = io('http://localhost:5000', { auth: { token } });
    socketRef.current = socket;
    socket.on('message:new', (m: any) => {
      // Support provider<->patient and admin<->provider threads
      const isProvPair = (m.from_role === 'provider' && m.to_role === 'patient') || (m.from_role === 'patient' && m.to_role === 'provider');
      const isAdminPair = (m.from_role === 'admin' && m.to_role === 'provider') || (m.from_role === 'provider' && m.to_role === 'admin');
      if (!isProvPair && !isAdminPair) return;

      // Admin thread logic
      if (isAdminPair) {
        if (activeAdmin) {
          setMessages(prev => sortByTime([...prev, m]));
          if (m.from_role === 'admin') {
            fetch('http://localhost:5000/provider/chat/admin/mark-read', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
          }
          setAdminUnread(0);
        } else if (m.from_role === 'admin') {
          setAdminUnread(prev => prev + 1);
        }
        return;
      }
      const pid = activePatient?.id;
      const fromId = Number(m.from_user_id ?? m.patient_id);
      const toId = Number(m.to_user_id ?? m.patient_id);
      const belongs = !!pid && (pid === fromId || pid === toId);
      if (activePatient && belongs) {
        // filter against clearedAt & hiddenIds
        const t = new Date((m as any).created_at || 0).getTime();
        if ((!clearedAt || t >= clearedAt) && !hiddenIds.has(String((m as any).id))) {
          setMessages(prev => sortByTime([...prev, m]));
        }
        // auto mark-read if message came from patient and this thread is open
        if (m.from_role === 'patient') markRead(activePatient.id);
        // ensure unread bubble stays cleared for active thread
        setPatients(prev => prev.map(u => u.id === activePatient.id ? { ...u, unreadCount: 0 } : u));
      } else if (activePatient && m.from_role === 'patient' && pid) {
        // If payload lacks IDs, refresh current thread defensively
        reloadActiveMessages(pid);
      } else {
        // bump unread count in list (fallback to from_user_id/patient_id)
        setPatients(prev => prev.map(u => {
          const match = u.id === fromId || u.id === Number(m.from_user_id) || u.id === Number(m.patient_id);
          return match ? { ...u, unreadCount: (u.unreadCount || 0) + 1 } : u;
        }));
      }
    });
  // Presence: track patients online/offline and admin
    socket.on('presence:update', (p: any) => {
      if (!p) return;
      if (p.role === 'patient') {
        const id = Number(p.userId);
        if (!Number.isFinite(id)) return;
        setOnlinePatients(prev => {
          const n = new Set(prev);
          if (p.online) n.add(id); else n.delete(id);
          return n;
        });
  }
  if (p.role === 'admin') setAdminOnline(!!p.online);
    });
    socket.on('presence:snapshot', (snap: any) => {
      if (Array.isArray(snap?.patientsOnline)) {
        const set = new Set<number>();
        for (const v of snap.patientsOnline) {
          const id = Number(v);
          if (Number.isFinite(id)) set.add(id);
        }
        setOnlinePatients(set);
      }
      if (typeof snap?.adminOnline === 'boolean') setAdminOnline(!!snap.adminOnline);
    });
    socket.on('message:status', (s: any) => {
      setMessages(prev => prev.map(mm => mm.id === s.id ? { ...mm, status: s.status } as any : mm));
    });
    return () => { socket.disconnect(); };
  }, [token, activePatient, activeAdmin]);

  const send = () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    const socket = socketRef.current; if (!socket) return;
    if (activeAdmin) {
      const optimistic: Msg = { id: `temp-${Date.now()}`, from_role: 'provider', to_role: 'admin', content, created_at: new Date().toISOString(), status: 'sent' };
      setMessages(prev => sortByTime([...prev, optimistic]));
      socket.emit('message:send', { toRole: 'admin', content }, (ack: any) => {
        if (ack?.ok && ack.message) setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: ack.message.id, status: ack.message.status } : m));
      });
      return;
    }
    if (!activePatient) return;
    const optimistic: Msg = { id: `temp-${Date.now()}`, from_role: 'provider', to_role: 'patient', content, created_at: new Date().toISOString(), status: 'sent' };
    setMessages(prev => sortByTime([...prev, optimistic]));
    socket.emit('message:send', { toUserId: activePatient.id, toRole: 'patient', content }, (ack: any) => {
      if (ack?.ok && ack.message) setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: ack.message.id, status: ack.message.status } : m));
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Secure Communications</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Active Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Admin thread */}
                <button onClick={()=> { setActiveAdmin(true); setActivePatient(null); loadAdminMessages(); }} className={`w-full text-left p-3 rounded-lg ${activeAdmin ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'} transition`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${adminOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                        Admin
                      </div>
                      <div className="text-xs text-gray-300 truncate">Direct line with Admin</div>
                    </div>
                    {adminUnread ? (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">{adminUnread}</span>
                    ) : null}
                  </div>
                </button>
                {patients.length === 0 && <div className="text-sm text-gray-400">No conversations yet.</div>}
                {patients.map((u) => (
                  <button key={u.id} onClick={()=> { setActivePatient(u); setActiveAdmin(false); }} className={`w-full text-left p-3 rounded-lg ${activePatient?.id === u.id && !activeAdmin ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'} transition`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${onlinePatients.has(u.id) ? 'bg-green-500' : 'bg-gray-500'}`} />
                          {u.name || u.username || u.email || `Patient #${u.id}`}
                        </div>
                        <div className="text-xs text-gray-300 truncate">{u.lastMessage || 'No messages yet'}</div>
                      </div>
                      {u.unreadCount ? (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">{u.unreadCount}</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="bg-gray-800 border-gray-700 h-[600px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-3">
                <MessageSquare className="h-5 w-5" />
                {activeAdmin ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-purple-600 text-white">AD</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${adminOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Admin</span>
                      <span className="text-xs text-gray-400">{adminOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                ) : activePatient ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {(() => {
                            const label = activePatient.name || activePatient.username || activePatient.email || 'PT';
                            const parts = String(label).split(' ');
                            return (parts[0]?.[0] || 'P') + (parts[1]?.[0] || 'T');
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${onlinePatients.has(activePatient.id) ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{activePatient.name || activePatient.username || activePatient.email || 'Patient'}</span>
                      <span className="text-xs text-gray-400">{onlinePatients.has(activePatient.id) ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm">Select a conversation</span>
                )}
              </CardTitle>
              <button
                className="ml-auto px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-red-600 hover:text-white text-xs font-medium"
                onClick={() => {
                  if (activeAdmin) {
                    setMessages([]);
                    setAdminUnread(0);
                    return;
                  }
                  if (!activePatient) return;
                  const key = `provider:patient:${activePatient.id}`;
                  const now = Date.now();
                  localStorage.setItem(`chatClearedAt:${key}`, String(now));
                  setClearedAt(now);
                  setMessages([]);
                }}
                title="Clear chat"
              >
                Clear Chat
              </button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto mb-4 p-4 bg-gray-900 rounded-lg">
                {messages.map(m => {
                  const mine = m.from_role === 'provider';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative group max-w-xs lg:max-w-md ${mine ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} rounded-lg p-3`}>
                        <p className="text-sm">{m.content}</p>
                        <div className={`text-xs mt-1 ${mine ? 'text-blue-200' : 'text-gray-300'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {mine && <span className="ml-2 text-[10px] opacity-80">{m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}</span>}
                        </div>
                        {mine && (
                          <button
                            aria-label="Delete for me"
                            title="Delete for me"
                            className="hidden group-hover:flex absolute -top-2 -right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1"
                            onClick={() => {
                              if (!activePatient) return;
                              const key = `provider:patient:${activePatient.id}`;
                              const arr = JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]');
                              const hs = new Set<string>(Array.isArray(arr) ? arr.map(String) : []);
                              hs.add(String(m.id));
                              localStorage.setItem(`chatHidden:${key}`, JSON.stringify(Array.from(hs)));
                              setHiddenIds(new Set(hs));
                              setMessages(prev => prev.filter(x => x.id !== m.id));
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex space-x-2">
                <Input placeholder="Type your message..." value={text} onChange={(e)=> setText(e.target.value)} onKeyDown={(e)=> { if (e.key === 'Enter') send(); }} className="bg-gray-700 border-gray-600 text-white" />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={send} disabled={!activeAdmin && !activePatient}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// auto-scroll to bottom when messages change
function useAutoScroll(ref: React.RefObject<HTMLDivElement>, dep: any) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [ref, dep]);
}
