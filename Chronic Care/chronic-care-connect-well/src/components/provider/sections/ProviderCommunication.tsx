import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, User, Clock, ShieldCheck, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  useEffect(() => {
    const loadMsgs = async () => {
      if (!token) return;
      if (activeAdmin) { await loadAdminMessages(); return; }
      if (!activePatient) return;
      try {
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
        await markRead(activePatient.id);
        setPatients(prev => prev.map(u => u.id === activePatient.id ? { ...u, unreadCount: 0 } : u));
      } catch {}
    };
    loadMsgs();
  }, [token, activePatient, activeAdmin]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('message:new', (m: any) => {
      const isProvPair = (m.from_role === 'provider' && m.to_role === 'patient') || (m.from_role === 'patient' && m.to_role === 'provider');
      const isAdminPair = (m.from_role === 'admin' && m.to_role === 'provider') || (m.from_role === 'provider' && m.to_role === 'admin');
      if (!isProvPair && !isAdminPair) return;

      if (isAdminPair) {
        if (activeAdmin) {
          setMessages(prev => sortByTime([...prev, m]));
          if (m.from_role === 'admin') fetch(`${API_URL}/provider/chat/admin/mark-read`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
          setAdminUnread(0);
        } else if (m.from_role === 'admin') setAdminUnread(prev => prev + 1);
        return;
      }
      const pid = activePatient?.id;
      const fromId = Number(m.from_user_id ?? m.patient_id);
      const toId = Number(m.to_user_id ?? m.patient_id);
      const belongs = !!pid && (pid === fromId || pid === toId);
      if (activePatient && belongs) {
        const t = new Date((m as any).created_at || 0).getTime();
        if ((!clearedAt || t >= clearedAt) && !hiddenIds.has(String((m as any).id))) setMessages(prev => sortByTime([...prev, m]));
        if (m.from_role === 'patient') markRead(activePatient.id);
        setPatients(prev => prev.map(u => u.id === activePatient.id ? { ...u, unreadCount: 0 } : u));
      } else {
        setPatients(prev => prev.map(u => {
          const match = u.id === fromId || u.id === Number(m.from_user_id) || u.id === Number(m.patient_id);
          return match ? { ...u, unreadCount: (u.unreadCount || 0) + 1 } : u;
        }));
      }
    });
    socket.on('presence:update', (p: any) => {
      if (p?.role === 'patient') {
        const id = Number(p.userId);
        if (!Number.isFinite(id)) return;
        setOnlinePatients(prev => {
          const n = new Set(prev);
          if (p.online) n.add(id); else n.delete(id);
          return n;
        });
      }
      if (p?.role === 'admin') setAdminOnline(!!p.online);
    });
    socket.on('message:status', (s: any) => {
      setMessages(prev => prev.map(mm => mm.id === s.id ? { ...mm, status: s.status } as any : mm));
    });
    return () => { socket.disconnect(); };
  }, [token, activePatient, activeAdmin, clearedAt, hiddenIds]);

  const send = () => {
    if (!text.trim()) return;
    const content = text.trim(); setText('');
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
            <div className="p-2 bg-primary/10 rounded-xl shadow-sm">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            Clinical Relay
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-bold uppercase tracking-widest text-[10px]">Secure multi-channel clinical linkage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px] overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="lg:col-span-4 flex flex-col space-y-4 overflow-hidden">
          <Card className="bg-white border-slate-200 flex flex-col overflow-hidden shadow-xl rounded-3xl h-full border-t-4 border-t-primary">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
              <CardTitle className="text-lg font-black text-slate-800 flex items-center uppercase tracking-tight">
                <User className="h-5 w-5 mr-2 text-primary" />
                Active Links
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <button 
                  onClick={()=> { setActiveAdmin(true); setActivePatient(null); loadAdminMessages(); }} 
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between border ${activeAdmin ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 border-2 border-slate-200 group-hover:border-primary/20 transition-all shadow-sm">
                        <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">AD</AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${adminOnline ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-black truncate ${activeAdmin ? 'text-primary' : 'text-slate-700'}`}>Operations Command</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Primary Node Line</div>
                    </div>
                  </div>
                  {adminUnread ? (
                    <span className="bg-primary text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg shadow-primary/20 animate-in zoom-in uppercase tracking-widest">
                      {adminUnread} NEW
                    </span>
                  ) : null}
                </button>

                {patients.map((u) => (
                  <button 
                    key={u.id} 
                    onClick={()=> { setActivePatient(u); setActiveAdmin(false); }} 
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between border ${activePatient?.id === u.id && !activeAdmin ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-11 w-11 border-2 border-slate-200 group-hover:border-primary/20 transition-all shadow-sm">
                          <AvatarFallback className="bg-slate-100 text-slate-500 font-black">
                            {(u.name || u.username || 'P').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${onlinePatients.has(u.id) ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-black truncate ${activePatient?.id === u.id && !activeAdmin ? 'text-primary' : 'text-slate-700'}`}>
                          {u.name || u.username || u.email || `Patient #${u.id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic">{u.lastMessage || 'Link Inactive'}</div>
                      </div>
                    </div>
                    {u.unreadCount ? (
                      <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg shadow-rose-500/20 animate-in zoom-in uppercase tracking-widest">
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
          <Card className="bg-white border-slate-200 h-full flex flex-col overflow-hidden shadow-2xl relative rounded-3xl">
            {!activeAdmin && !activePatient ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 bg-slate-50/20">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-inner">
                  <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Clinical Relay Station</h2>
                  <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto font-medium">
                    Establish a high-fidelity clinical link to coordinate pharmacological fulfillment.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <CardHeader className="border-b border-slate-100 bg-white py-4 flex flex-row items-center justify-between px-6">
                  <CardTitle className="text-slate-800 flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-primary/10 shadow-sm">
                        <AvatarFallback className={`${activeAdmin ? 'bg-primary' : 'bg-slate-100'} ${activeAdmin ? 'text-white' : 'text-slate-500'} font-black`}>
                          {activeAdmin ? 'AD' : (() => {
                            const label = activePatient?.name || activePatient?.username || activePatient?.email || 'PT';
                            return (label as string).charAt(0).toUpperCase();
                          })()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${activeAdmin ? (adminOnline ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300') : (activePatient && onlinePatients.has(activePatient.id) ? 'bg-emerald-500 shadow-sm text-[8px] flex items-center justify-center' : 'bg-slate-300')}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 tracking-tight">
                        {activeAdmin ? 'Operations Command' : (activePatient?.name || activePatient?.username || activePatient?.email || 'Active Node')}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {activeAdmin ? (adminOnline ? 'Link Established' : 'Telemetry Lost') : (activePatient && onlinePatients.has(activePatient.id) ? 'Active Link' : 'Telemetry Lost')}
                      </span>
                    </div>
                  </CardTitle>
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
                          if (activeAdmin) { setMessages([]); setAdminUnread(0); return; }
                          if (!activePatient) return;
                          const key = `provider:patient:${activePatient.id}`;
                          const now = Date.now();
                          localStorage.setItem(`chatClearedAt:${key}`, String(now));
                          setClearedAt(now);
                          setMessages([]);
                        }}
                      >
                        Clear Channel History
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-slate-50/30">
                  <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 custom-scrollbar scroll-smooth">
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                        <MessageSquare className="h-8 w-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No history recorded</p>
                      </div>
                    )}
                    {messages.map(m => {
                      const mine = m.from_role === 'provider';
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`relative group max-w-[85%] sm:max-w-md ${mine ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10 rounded-2xl rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-none'} p-4 shadow-sm hover:shadow-md transition-all`}>
                            <p className="text-[14px] leading-relaxed select-text font-medium tracking-tight">{m.content}</p>
                            <div className={`text-[9px] mt-2 flex items-center gap-2 font-black uppercase tracking-widest ${mine ? 'text-primary-foreground/60' : 'text-slate-400'}`}>
                              <Clock className="h-3 w-3" />
                              <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {mine && (
                                <span className={`ml-1 ${m.status === 'read' ? 'text-emerald-300' : 'text-primary-foreground/80'}`}>
                                  {m.status === 'read' ? 'READ' : m.status === 'delivered' ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full border border-slate-100 shadow-xl bg-white/90 backdrop-blur-md text-slate-500 hover:text-primary">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-slate-100 rounded-xl shadow-xl">
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 font-bold uppercase text-[9px] tracking-widest cursor-pointer"
                                    onClick={() => {
                                      const key = activeAdmin ? 'provider:admin' : `provider:patient:${activePatient?.id}`;
                                      const arr = JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]');
                                      const hs = new Set<string>(Array.isArray(arr) ? arr.map(String) : []);
                                      hs.add(String(m.id));
                                      localStorage.setItem(`chatHidden:${key}`, JSON.stringify(Array.from(hs)));
                                      setHiddenIds(new Set(hs));
                                      setMessages(prev => prev.filter(x => x.id !== m.id));
                                    }}
                                  >
                                    Clear Message
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-4 sm:p-6 bg-white border-t border-slate-100 mt-auto">
                    <div className="flex space-x-3 items-center">
                      <Input 
                        placeholder="Respond to clinical inquiry..." 
                        value={text} 
                        onChange={(e)=> setText(e.target.value)} 
                        onKeyDown={(e)=> { if (e.key === 'Enter') send(); }} 
                        className="flex-1 bg-white border-slate-200 text-slate-800 h-12 sm:h-14 rounded-2xl focus:ring-primary/40 focus:border-primary shadow-sm transition-all placeholder:text-slate-400 font-medium px-5" 
                        disabled={!activeAdmin && !activePatient}
                      />
                      <Button 
                        className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 rounded-2xl w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center p-0 active:scale-95 transition-all shrink-0" 
                        onClick={send} 
                        disabled={!activeAdmin && !activePatient}
                      >
                        <Send className="h-6 w-6" />
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
