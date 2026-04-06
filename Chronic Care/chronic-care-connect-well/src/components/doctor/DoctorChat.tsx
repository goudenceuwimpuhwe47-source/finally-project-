import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search, MessageSquare, User, Clock, MoreVertical, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/utils';

type UserItem = { id: number; name?: string; username?: string; email?: string; lastMessage?: string; unreadCount?: number };
type Msg = { id: number|string; from_user_id?: number; from_role: string; to_user_id?: number|null; to_role: string; content: string; created_at: string; status?: 'sent'|'delivered'|'read' };

export default function DoctorChat({ initialPatientId }: { initialPatientId?: number }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filter, setFilter] = useState('');
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [patientTyping, setPatientTyping] = useState(false);
  const [onlinePatients, setOnlinePatients] = useState<Set<number>>(new Set());
  const [clearedAt, setClearedAt] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const { toast } = useToast();

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/doctor/chat/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data.users) ? data.users : [];
      setUsers(list);
      const total = list.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
      try { window.dispatchEvent(new CustomEvent('doctor-unread:update', { detail: { unread: total } })); } catch {}
    } catch (e:any) {
      toast({ title: 'Network error', description: 'Failed to load patients list.', variant: 'destructive' });
    }
  };

  const fetchThread = async (patientId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/doctor/chat/messages/${patientId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data.messages) ? data.messages : [];
      const key = `doctor:patient:${patientId}`;
      const ts = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
      const hidden = new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]'));
      const activeMsgs = list.filter((m: any) => {
        const t = new Date(m.created_at || 0).getTime();
        return (!ts || t >= ts) && !hidden.has(String(m.id));
      });
      setMessages(activeMsgs.sort((a,b)=> new Date(a.created_at||0).getTime() - new Date(b.created_at||0).getTime()));
      setClearedAt(Number.isFinite(ts) ? ts : 0);
      // mark read
      await fetch(`${API_URL}/doctor/chat/mark-read`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId })
      });
    } catch (e:any) {
      toast({ title: 'Network error', description: 'Failed to load conversation.', variant: 'destructive' });
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const pid = Number(initialPatientId);
    if (Number.isFinite(pid) && pid > 0 && pid !== activeUserId) {
      openThread(pid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatientId]);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { 
      auth: { token },
      transports: ['polling', 'websocket'] 
    });
    socketRef.current = socket;
    socket.on('message:new', async (m: any) => {
      const otherIsActive = (m.from_role === 'patient' && m.from_user_id === activeUserId) || (m.to_role === 'patient' && m.to_user_id === activeUserId);
      if (!((m.from_role === 'patient' && m.to_role === 'doctor') || (m.from_role === 'doctor' && m.to_role === 'patient'))) return;
      
      setMessages(prev => {
        if (!otherIsActive) return prev;
        const t = new Date((m as any).created_at || 0).getTime();
        if (clearedAt && t < clearedAt) return prev;
        const key = `doctor:patient:${activeUserId}`;
        const hidden = new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]'));
        if (hidden.has(String((m as any).id))) return prev;

        const next = [...prev, m];
        return next.sort((a,b)=> new Date(a.created_at||0).getTime() - new Date(b.created_at||0).getTime());
      });

      if (m.from_role === 'patient') {
        setUsers(prev => {
          const updated = prev.map(u => u.id === m.from_user_id ? { ...u, unreadCount: (u.unreadCount || 0) + (otherIsActive ? 0 : 1), lastMessage: m.content } : u);
          const total = updated.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
          try { window.dispatchEvent(new CustomEvent('doctor-unread:update', { detail: { unread: total } })); } catch {}
          return updated;
        });
        try {
          if (otherIsActive && m.from_user_id) {
            await fetch(`${API_URL}/doctor/chat/mark-read`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ patientId: m.from_user_id })
            });
          }
        } catch {}
      } else if (m.to_role === 'patient') {
        setUsers(prev => prev.map(u => u.id === m.to_user_id ? { ...u, lastMessage: m.content } : u));
      }
    });

    socket.on('message:status', (s: any) => {
      setMessages(prev => prev.map(mm => mm.id === s.id ? { ...mm, status: s.status } : mm));
    });

    socket.on('presence:update', (p: any) => {
      if (p?.role === 'patient' && p.userId != null) {
        const id = Number(p.userId);
        if (!Number.isFinite(id)) return;
        setOnlinePatients(prev => {
          const n = new Set(prev);
          if (p.online) n.add(id); else n.delete(id);
          return n;
        });
      }
    });

    socket.on('typing:start', (ev: any) => {
      if (ev?.fromRole === 'patient' && ev.fromUserId && ev.fromUserId === activeUserId) setPatientTyping(true);
    });

    socket.on('typing:stop', (ev: any) => {
      if (ev?.fromRole === 'patient' && ev.fromUserId && ev.fromUserId === activeUserId) setPatientTyping(false);
    });

    return () => { socket.disconnect(); };
  }, [token, activeUserId]);

  useEffect(() => {
    const socket = socketRef.current; if (!socket) return;
    if (!activeUserId) return;
    if (typing) socket.emit('typing:start', { toRole: 'patient', toUserId: activeUserId });
    else socket.emit('typing:stop', { toRole: 'patient', toUserId: activeUserId });
  }, [typing, activeUserId]);

  const visibleUsers = users.filter(u => {
    const needle = filter.toLowerCase();
    return !needle || (u.username || '').toLowerCase().includes(needle) || (u.name || '').toLowerCase().includes(needle) || (u.email || '').toLowerCase().includes(needle);
  });

  const openThread = async (patientId: number) => {
    const key = `doctor:patient:${patientId}`;
    const ts = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
    setClearedAt(Number.isFinite(ts) ? ts : 0);
    setActiveUserId(patientId);
    await fetchThread(patientId);
    setUsers(prev => {
      const updated = prev.map(u => u.id === patientId ? { ...u, unreadCount: 0 } : u);
      const total = updated.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
      try { window.dispatchEvent(new CustomEvent('doctor-unread:update', { detail: { unread: total } })); } catch {}
      return updated;
    });
  };

  const onSend = () => {
    if (!text.trim() || !activeUserId) return;
    const socket = socketRef.current; if (!socket) return;
    const content = text.trim();
    const optimistic: Msg = { id: `temp-${Date.now()}`, from_role: 'doctor', to_role: 'patient', to_user_id: activeUserId, content, created_at: new Date().toISOString(), status: 'sent' };
    setMessages(prev => [...prev, optimistic].sort((a,b)=> new Date(a.created_at||0).getTime() - new Date(b.created_at||0).getTime()));
    setText('');
    socket.emit('message:send', { toUserId: activeUserId, toRole: 'patient', content }, (ack: any) => {
      if (ack?.ok && ack.message) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: ack.message.id, status: ack.message.status } : m));
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px] max-w-7xl mx-auto overflow-hidden">
      {/* Patients List */}
      <Card className="bg-white border-slate-200 lg:col-span-4 flex flex-col overflow-hidden shadow-xl rounded-3xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 flex items-center uppercase tracking-tight">
              <User className="h-5 w-5 mr-2 text-primary" />
              Patient Registry
            </h3>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              value={filter} 
              onChange={e=>setFilter(e.target.value)} 
              placeholder="Search registries..." 
              className="w-full pl-10 pr-4 bg-white border border-slate-200 text-slate-800 h-10 rounded-xl placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {visibleUsers.map(u => (
              <button 
                key={u.id} 
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between border ${activeUserId === u.id ? 'bg-primary/5 border-primary/20 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`} 
                onClick={() => openThread(u.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-11 w-11 border-2 border-slate-200 group-hover:border-primary/30 transition-all shadow-sm">
                      <AvatarFallback className="bg-slate-100 text-slate-500 font-black">
                        {(u.username || u.name || 'P').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${onlinePatients.has(u.id) ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-black truncate ${activeUserId === u.id ? 'text-primary' : 'text-slate-700'}`}>
                      {u.username || u.name || u.email}
                    </div>
                    {u.lastMessage && (
                      <div className="text-[10px] font-bold text-slate-400 truncate mt-0.5 group-hover:text-slate-500">
                        {u.lastMessage}
                      </div>
                    )}
                  </div>
                </div>
                {u.unreadCount ? (
                  <span className="bg-primary text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg shadow-primary/20 animate-in zoom-in duration-300 uppercase tracking-widest">
                    {u.unreadCount} NEW
                  </span>
                ) : null}
              </button>
            ))}
            {visibleUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="p-3 bg-slate-50 rounded-2xl mb-3">
                  <Search className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest italic">No matches found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Window */}
      <Card className="bg-white border-slate-200 lg:col-span-8 flex flex-col overflow-hidden shadow-2xl relative rounded-3xl">
        {!activeUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 bg-slate-50/20">
             <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-inner">
               <MessageSquare className="h-10 w-10 text-primary" />
             </div>
             <div>
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Clinical Direct</h2>
               <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto font-medium">
                 Select a satellite station from the registry to begin high-fidelity clinical synchronization.
               </p>
             </div>
          </div>
        ) : (
          <>
            <CardHeader className="border-b border-slate-100 bg-white py-4 flex flex-row items-center justify-between px-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-primary/10 shadow-lg">
                    <AvatarFallback className="bg-primary text-white font-black text-lg">
                      {(() => {
                        const u = users.find(x => x.id === activeUserId);
                        return (u?.username || u?.name || 'P').charAt(0).toUpperCase();
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${onlinePatients.has(activeUserId) ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}`} />
                </div>
                <div>
                  <div className="text-base font-black text-slate-800 flex items-center gap-2 tracking-tight">
                    {(() => {
                      const u = users.find(x => x.id === activeUserId);
                      return u?.username || u?.name || u?.email || `Patient #${activeUserId}`;
                    })()}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${patientTyping ? 'text-primary animate-pulse' : 'text-slate-400'}`}>
                      {patientTyping ? 'Input Incoming…' : (onlinePatients.has(activeUserId) ? 'Link Established' : 'Telemetry Lost')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                        const key = `doctor:patient:${activeUserId}`;
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
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-slate-50/30">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar scroll-smooth">
                {messages.map(m => {
                  const mine = m.from_role === 'doctor';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`relative group max-w-[85%] sm:max-w-md ${mine ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-none shadow-lg shadow-primary/10' : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm'} p-4 transition-all hover:shadow-md`}>
                        <div className="text-[14px] sm:text-[15px] leading-relaxed font-medium select-text tracking-tight">{m.content}</div>
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
              
              <div className="p-4 sm:p-6 bg-white border-t border-slate-100">
                <div className="flex space-x-3 items-center">
                  <Input 
                    disabled={!activeUserId} 
                    value={text} 
                    onChange={e=>{ setText(e.target.value); if (!typing) setTyping(true); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(()=>setTyping(false), 1200); }} 
                    onKeyDown={e=>{ if (e.key==='Enter') onSend(); }} 
                    placeholder="Provide medical guidance..." 
                    className="flex-1 bg-white border-slate-200 text-slate-800 h-12 sm:h-14 rounded-2xl focus:ring-primary/40 focus:border-primary shadow-sm transition-all placeholder:text-slate-400 font-medium px-5" 
                  />
                  <Button 
                    disabled={!activeUserId} 
                    className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 rounded-2xl w-12 sm:w-14 h-12 sm:h-14 flex items-center justify-center p-0 transition-all active:scale-95" 
                    onClick={onSend}
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
  );
}
