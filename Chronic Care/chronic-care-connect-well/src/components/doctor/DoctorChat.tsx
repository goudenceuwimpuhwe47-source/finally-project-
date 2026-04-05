import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Search, MessageSquare } from 'lucide-react';
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-gray-800 border-gray-700 md:col-span-1">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search patients" className="pl-8 bg-gray-700 border-gray-600 text-white" />
          </div>
          <div className="max-h-[520px] overflow-y-auto space-y-1">
            {visibleUsers.map(u => (
              <button key={u.id} className={`w-full text-left p-3 rounded ${activeUserId === u.id ? 'bg-gray-700' : 'hover:bg-gray-700/60'} flex items-center justify-between`} onClick={() => openThread(u.id)}>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${onlinePatients.has(u.id) ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <div>
                    <div className="text-sm text-white font-medium">{u.username || u.name || u.email}</div>
                    {u.lastMessage && <div className="text-xs text-gray-300 line-clamp-1">{u.lastMessage}</div>}
                  </div>
                </div>
                {u.unreadCount ? <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">{u.unreadCount}</span> : null}
              </button>
            ))}
            {visibleUsers.length === 0 && <div className="text-gray-400 text-sm">No patients found.</div>}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-gray-800 border-gray-700 md:col-span-2 h-[600px] flex flex-col">
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            {activeUserId ? (
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {(() => {
                        const u = users.find(x => x.id === activeUserId);
                        const label = u?.username || u?.name || u?.email || 'PT';
                        const parts = String(label).split(' ');
                        return (parts[0]?.[0] || 'P') + (parts[1]?.[0] || 'T');
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${onlinePatients.has(activeUserId) ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
                <div>
                  <div className="text-white text-sm font-medium">
                    {(() => {
                      const u = users.find(x => x.id === activeUserId);
                      return u?.username || u?.name || u?.email || `Patient #${activeUserId}`;
                    })()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {patientTyping ? 'Typing…' : (onlinePatients.has(activeUserId) ? 'Online' : 'Offline')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-300">Select a patient</div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 bg-gray-900 rounded p-3">
            {messages.map(m => {
              const mine = m.from_role === 'doctor';
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md ${mine ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'} rounded-lg p-3`}>
                    <div className="text-sm">{m.content}</div>
                    <div className={`text-[10px] mt-1 ${mine ? 'text-blue-200' : 'text-gray-300'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine ? ` • ${m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}` : ''}</div>
                  </div>
                </div>
              );
            })}
            {!activeUserId && <div className="text-gray-400 text-sm">Select a patient to view messages.</div>}
          </div>
          <div className="mt-3 flex gap-2">
            <Input disabled={!activeUserId} value={text} onChange={e=>{ setText(e.target.value); if (!typing) setTyping(true); if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(()=>setTyping(false), 1200); }} onKeyDown={e=>{ if (e.key==='Enter') onSend(); }} placeholder={activeUserId ? 'Type a message...' : 'Select a patient to start chatting'} className="bg-gray-700 border-gray-600 text-white" />
            <Button disabled={!activeUserId} className="bg-blue-600 hover:bg-blue-700" onClick={onSend}><Send className="h-4 w-4"/></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
