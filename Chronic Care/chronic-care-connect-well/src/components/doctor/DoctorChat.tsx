import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search, MessageSquare, User, Clock } from 'lucide-react';
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
      setMessages(Array.isArray(data.messages) ? data.messages.reverse() : []);
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

  // auto-open initial patient thread when provided
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
      // Only process doctor <-> patient
      if (!((m.from_role === 'patient' && m.to_role === 'doctor') || (m.from_role === 'doctor' && m.to_role === 'patient'))) return;
      setMessages(prev => otherIsActive ? [...prev, m] : prev);
      if (m.from_role === 'patient') {
        setUsers(prev => {
          const updated = prev.map(u => u.id === m.from_user_id ? { ...u, unreadCount: (u.unreadCount || 0) + (otherIsActive ? 0 : 1), lastMessage: m.content } : u);
          const total = updated.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
          try { window.dispatchEvent(new CustomEvent('doctor-unread:update', { detail: { unread: total } })); } catch {}
          return updated;
        });
        // mark read if viewing this patient's thread
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
    setActiveUserId(patientId);
    await fetchThread(patientId);
    // reset unread count
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
    setMessages(prev => [...prev, optimistic]);
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
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl lg:col-span-4 flex flex-col overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center">
              <User className="h-5 w-5 mr-2 text-indigo-400" />
              Patients
            </h3>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              value={filter} 
              onChange={e=>setFilter(e.target.value)} 
              placeholder="Search patients..." 
              className="pl-10 bg-slate-950/50 border-slate-700 text-slate-200 rounded-xl placeholder:text-slate-600 focus:ring-indigo-500/30" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {visibleUsers.map(u => (
              <button 
                key={u.id} 
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group flex items-center justify-between ${activeUserId === u.id ? 'bg-indigo-600/20 border border-indigo-500/30 shadow-lg' : 'hover:bg-slate-800/40 border border-transparent'}`} 
                onClick={() => openThread(u.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-11 w-11 border-2 border-slate-800 group-hover:border-indigo-500/30 transition-all">
                      <AvatarFallback className="bg-slate-800 text-slate-300 font-bold">
                        {(u.username || u.name || 'P').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${onlinePatients.has(u.id) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-bold truncate ${activeUserId === u.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                      {u.username || u.name || u.email}
                    </div>
                    {u.lastMessage && (
                      <div className="text-xs text-slate-500 truncate mt-0.5 group-hover:text-slate-400">
                        {u.lastMessage}
                      </div>
                    )}
                  </div>
                </div>
                {u.unreadCount ? (
                  <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg shadow-indigo-500/20 animate-in zoom-in duration-300 uppercase">
                    {u.unreadCount} New
                  </span>
                ) : null}
              </button>
            ))}
            {visibleUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="p-3 bg-slate-800/30 rounded-2xl mb-3">
                  <Search className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-xs text-slate-500 font-medium tracking-wide italic">No active patient threads found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Chat Window */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl lg:col-span-8 flex flex-col overflow-hidden shadow-2xl relative">
        {!activeUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
             <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 shadow-inner">
               <MessageSquare className="h-10 w-10 text-indigo-400" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-200">Clinical Consultation</h2>
               <p className="text-sm text-slate-500 mt-2 max-w-[280px] mx-auto">
                 Select a patient from the list to synchronize health data and begin the medical consultation.
               </p>
             </div>
          </div>
        ) : (
          <>
            <CardHeader className="border-b border-slate-800/50 bg-slate-900/30 py-4 flex flex-row items-center justify-between px-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-indigo-500/20 shadow-xl">
                    <AvatarFallback className="bg-indigo-600 text-white font-black text-lg">
                      {(() => {
                        const u = users.find(x => x.id === activeUserId);
                        return (u?.username || u?.name || 'P').charAt(0).toUpperCase();
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${onlinePatients.has(activeUserId) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-100 flex items-center gap-2">
                    {(() => {
                      const u = users.find(x => x.id === activeUserId);
                      return u?.username || u?.name || u?.email || `Patient #${activeUserId}`;
                    })()}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${patientTyping ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`}>
                      {patientTyping ? 'Typing…' : (onlinePatients.has(activeUserId) ? 'Active Now' : 'Offline')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl">
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-slate-950/20">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                {messages.map(m => {
                  const mine = m.from_role === 'doctor';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`relative group max-w-[85%] sm:max-w-md ${mine ? 'bg-indigo-600 rounded-2xl rounded-tr-none shadow-indigo-900/10' : 'bg-slate-800 rounded-2xl rounded-tl-none shadow-black/10'} p-3.5 sm:p-4 shadow-xl`}>
                        <div className="text-[14px] sm:text-[15px] leading-relaxed text-slate-100 select-text font-medium">{m.content}</div>
                        <div className={`text-[10px] mt-2 flex items-center gap-2 font-bold tracking-tight ${mine ? 'text-indigo-200/70' : 'text-slate-500'}`}>
                          <Clock className="h-3 w-3" />
                          <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {mine && (
                            <span className={`ml-1 ${m.status === 'read' ? 'text-emerald-400' : 'text-indigo-300'}`}>
                              {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-4 bg-slate-900/40 border-t border-slate-800">
                <div className="flex space-x-2 items-center">
                  <Input 
                    disabled={!activeUserId} 
                    value={text} 
                    onChange={e=>{ setText(e.target.value); if (!typing) setTyping(true); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(()=>setTyping(false), 1200); }} 
                    onKeyDown={e=>{ if (e.key==='Enter') onSend(); }} 
                    placeholder="Provide medical guidance..." 
                    className="flex-1 bg-slate-950/50 border-slate-700 text-slate-200 h-11 sm:h-12 rounded-xl focus:ring-indigo-500/30 transition-all placeholder:text-slate-600" 
                  />
                  <Button 
                    disabled={!activeUserId} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-900/20 rounded-xl w-11 sm:w-14 h-11 sm:h-12 flex items-center justify-center p-0 transition-all active:scale-95" 
                    onClick={onSend}
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
  );
}
