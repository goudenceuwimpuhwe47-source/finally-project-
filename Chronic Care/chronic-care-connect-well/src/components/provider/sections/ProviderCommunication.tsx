
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Trash2, User, Clock, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/lib/utils";

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
      await fetch(`${API_URL}/provider/chat/mark-read`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId })
      });
    } catch {}
  };
  const reloadActiveMessages = async (pid: number) => {
    try {
      const res = await fetch(`${API_URL}/provider/chat/messages/${pid}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
  const list = Array.isArray(data.messages) ? data.messages : [];
  setMessages(sortByTime(list));
    } catch {}
  };

  const loadAdminMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/provider/chat/admin/messages`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data.messages) ? data.messages : [];
      setMessages(sortByTime(list));
      await fetch(`${API_URL}/provider/chat/admin/mark-read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      setAdminUnread(0);
    } catch {}
  };

  // load conversation list
  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/provider/chat/users`, { headers: { Authorization: `Bearer ${token}` } });
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
        const res = await fetch(`${API_URL}/provider/chat/messages/${activePatient.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const list = Array.isArray(data.messages) ? data.messages : [];
        const filtered = list.filter((m:any) => {
          const t = new Date(m.created_at||0).getTime();
          return (!ts || t>=ts) && !hidden.has(String(m.id));
        });
  setMessages(sortByTime(filtered));
        await fetch(`${API_URL}/provider/chat/mark-read`, {
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
    const socket = io(API_URL, { auth: { token } });
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
            fetch(`${API_URL}/provider/chat/admin/mark-read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
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
    <div className="space-y-6 flex flex-col h-full max-w-7xl mx-auto overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-indigo-400" />
            Pharmacy Communications
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Secure clinical & administrative messaging</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px] overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="lg:col-span-4 flex flex-col space-y-4 overflow-hidden">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl flex flex-col overflow-hidden shadow-2xl h-full">
            <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-4">
              <CardTitle className="text-lg font-bold text-slate-100 flex items-center">
                <User className="h-5 w-5 mr-2 text-indigo-400" />
                Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                {/* Admin thread */}
                <button 
                  onClick={()=> { setActiveAdmin(true); setActivePatient(null); loadAdminMessages(); }} 
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between border ${activeAdmin ? 'bg-indigo-600/20 border-indigo-500/30 shadow-lg' : 'bg-transparent border-transparent hover:bg-slate-800/40'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 border-2 border-slate-800 group-hover:border-indigo-500/30 transition-all">
                        <AvatarFallback className="bg-indigo-900/50 text-indigo-300 font-black">AD</AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${adminOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-bold truncate ${activeAdmin ? 'text-indigo-300' : 'text-slate-200'}`}>System Administration</div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">Secure operations line</div>
                    </div>
                  </div>
                  {adminUnread ? (
                    <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-in zoom-in">
                      {adminUnread}
                    </span>
                  ) : null}
                </button>

                {patients.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <p className="text-xs text-slate-600 font-medium tracking-wide italic">No patient inquiries available.</p>
                  </div>
                )}
                
                {patients.map((u) => (
                  <button 
                    key={u.id} 
                    onClick={()=> { setActivePatient(u); setActiveAdmin(false); }} 
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between border ${activePatient?.id === u.id && !activeAdmin ? 'bg-indigo-600/20 border-indigo-500/30 shadow-lg' : 'bg-transparent border-transparent hover:bg-slate-800/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-11 w-11 border-2 border-slate-800 group-hover:border-indigo-500/30 transition-all">
                          <AvatarFallback className="bg-slate-800 text-slate-300 font-bold">
                            {(u.name || u.username || 'P').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${onlinePatients.has(u.id) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-bold truncate ${activePatient?.id === u.id && !activeAdmin ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {u.name || u.username || u.email || `Patient #${u.id}`}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5 italic">{u.lastMessage || 'Open thread...'}</div>
                      </div>
                    </div>
                    {u.unreadCount ? (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-in zoom-in">
                        {u.unreadCount} NEW
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Window */}
        <div className="lg:col-span-8 h-full overflow-hidden">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl h-full flex flex-col overflow-hidden shadow-2xl relative">
            {!activeAdmin && !activePatient ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 bg-slate-950/20">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
                  <MessageSquare className="h-10 w-10 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-200">Patient Care Line</h2>
                  <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto">
                    Select a secure communication channel to review prescriptions and provide pharmacological assistance.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-4 flex flex-row items-center justify-between px-6">
                  <CardTitle className="text-white flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-indigo-500/20">
                        <AvatarFallback className={`${activeAdmin ? 'bg-indigo-600' : 'bg-slate-800'} text-white font-bold`}>
                          {activeAdmin ? 'AD' : (() => {
                            const label = activePatient?.name || activePatient?.username || activePatient?.email || 'PT';
                            return (label as string).charAt(0).toUpperCase();
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${activeAdmin ? (adminOnline ? 'bg-emerald-500' : 'bg-slate-600') : (activePatient && onlinePatients.has(activePatient.id) ? 'bg-emerald-500 text-[8px] flex items-center justify-center' : 'bg-slate-600')}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-100">
                        {activeAdmin ? 'System Admin' : (activePatient?.name || activePatient?.username || activePatient?.email || 'Patient')}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {activeAdmin ? (adminOnline ? 'Active' : 'Offline') : (activePatient && onlinePatients.has(activePatient.id) ? 'Online Now' : 'Disconnected')}
                      </span>
                    </div>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-tighter"
                    onClick={() => {
                      if (activeAdmin) { setMessages([]); setAdminUnread(0); return; }
                      if (!activePatient) return;
                      const key = `provider:patient:${activePatient.id}`;
                      const now = Date.now();
                      localStorage.setItem(`chatClearedAt:${key}`, String(now));
                      setClearedAt(now);
                      setMessages([]);
                    }}
                  >
                    Clear History
                  </Button>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-slate-950/20">
                  <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 custom-scrollbar scroll-smooth">
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                        <MessageSquare className="h-8 w-8 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest">No history recorded</p>
                      </div>
                    )}
                    {messages.map(m => {
                      const mine = m.from_role === 'provider';
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`relative group max-w-[85%] sm:max-w-md ${mine ? 'bg-indigo-600 rounded-2xl rounded-tr-none' : 'bg-slate-800 rounded-2xl rounded-tl-none'} p-3.5 sm:p-4 shadow-xl shadow-black/10`}>
                            <p className="text-[14px] leading-relaxed text-slate-100 select-text font-medium">{m.content}</p>
                            <div className={`text-[10px] mt-2 flex items-center gap-2 font-black tracking-tight ${mine ? 'text-indigo-200/80' : 'text-slate-500'}`}>
                              <Clock className="h-3 w-3" />
                              <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {mine && (
                                <span className={`ml-1 ${m.status === 'read' ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                  {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                            {mine && (
                              <button
                                aria-label="Delete message locally"
                                className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 bg-slate-950/90 text-slate-500 hover:text-rose-400 rounded-full p-1.5 border border-slate-800 shadow-xl transition-all scale-75 group-hover:scale-100"
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
                  
                  <div className="p-4 bg-slate-900/40 border-t border-slate-800 mt-auto">
                    <div className="flex space-x-2 items-center">
                      <Input 
                        placeholder="Respond to inquiry..." 
                        value={text} 
                        onChange={(e)=> setText(e.target.value)} 
                        onKeyDown={(e)=> { if (e.key === 'Enter') send(); }} 
                        className="flex-1 bg-slate-950/40 border-slate-700 text-slate-200 h-11 sm:h-12 rounded-xl focus:ring-indigo-500/30 transition-all placeholder:text-slate-600" 
                        disabled={!activeAdmin && !activePatient}
                      />
                      <Button 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-900/20 rounded-xl w-11 sm:w-14 h-11 sm:h-12 flex items-center justify-center p-0 active:scale-95 transition-all shrink-0" 
                        onClick={send} 
                        disabled={!activeAdmin && !activePatient}
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
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
