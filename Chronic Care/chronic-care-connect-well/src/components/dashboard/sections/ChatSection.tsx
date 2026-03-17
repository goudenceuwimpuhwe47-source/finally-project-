
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/utils";

type Msg = { id: number | string; from_role: string; to_role: string; content: string; created_at: string; status?: 'sent'|'delivered'|'read' };
type ChatTarget = 'admin'|'doctor'|'pharmacy';

export function ChatSection({ to }: { to?: ChatTarget }) {
  const [target, setTarget] = useState<ChatTarget>('admin');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  const [adminTyping, setAdminTyping] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [doctorTyping, setDoctorTyping] = useState(false);
  const [doctorOnline, setDoctorOnline] = useState(false);
  const [onlineDoctors, setOnlineDoctors] = useState<Set<number>>(new Set());
  const [onlineProviders, setOnlineProviders] = useState<Set<number>>(new Set());
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [providerId, setProviderId] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const token = useMemo(() => localStorage.getItem('token') || '', []);
  const { toast } = useToast();
  const [unreadDoctor, setUnreadDoctor] = useState(0);
  const [unreadAdmin, setUnreadAdmin] = useState(0);
  const [unreadPharmacy, setUnreadPharmacy] = useState(0);
  const [doctorName, setDoctorName] = useState<string>('Doctor');
  const [clearedAt, setClearedAt] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sortByTime = (list: Msg[]) => list.slice().sort((a,b)=> new Date(a.created_at||0).getTime() - new Date(b.created_at||0).getTime());

  // auto scroll to bottom whenever messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // respond to parent-provided target changes
  useEffect(() => {
    if (to) {
      setTarget(to);
      try { sessionStorage.setItem('chatTarget', to); } catch {}
    } else {
      try {
        const t = sessionStorage.getItem('chatTarget');
        if (t === 'doctor' || t === 'pharmacy' || t === 'admin') setTarget(t);
        else setTarget('admin');
      } catch {
        setTarget('admin');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  // removed initial target read, now handled in the effect above

  // Load initial history based on target
  useEffect(() => {
    const load = async () => {
      try {
        const convKey = (() => {
          if (target === 'admin') return 'patient:admin';
          if (target === 'doctor' && doctorId) return `patient:doctor:${doctorId}`;
          if (target === 'pharmacy' && providerId) return `patient:provider:${providerId}`;
          return null;
        })();
        if (convKey) {
          const ts = Number(localStorage.getItem(`chatClearedAt:${convKey}`) || '0');
          if (Number.isFinite(ts)) setClearedAt(ts);
        } else {
          setClearedAt(0);
        }
        if (target === 'admin') {
          const res = await fetch(`${API_URL}/chat/messages/admin`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.messages) {
            const ts = (() => {
              const key = 'patient:admin';
              const v = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
              return Number.isFinite(v) ? v : 0;
            })();
            const hidden = new Set<string>(JSON.parse(localStorage.getItem('chatHidden:patient:admin') || '[]'));
            const filtered = data.messages.filter((m:any)=> {
              const t = new Date(m.created_at||0).getTime();
              return (!ts || t>=ts) && !hidden.has(String(m.id));
            });
            setMessages(sortByTime(filtered));
            setClearedAt(ts);
          }
          await fetch(`${API_URL}/chat/mark-read/admin`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }
          });
          // clear admin unread badge when entering
          setUnreadAdmin(0);
          window.dispatchEvent(new CustomEvent('patient-unread-admin:update', { detail: { unread: 0 } }));
  } else if (target === 'doctor') {
          // Determine current assigned doctor from last order with under_review/doctor_status pending/approved
          const ord = await fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
          const list = await ord.json();
          const orders: any[] = Array.isArray(list.orders) ? list.orders : [];
          const active = orders.find((o:any) => o.admin_status === 'under_review' && o.doctor_status !== 'approved' && o.doctor_id) || orders.find((o:any) => o.doctor_id);
          const doctorId = active?.doctor_id;
          if (!doctorId) { setDoctorId(null); setMessages([]); setDoctorName('Doctor'); return; }
          setDoctorId(Number(doctorId));
          const res = await fetch(`${API_URL}/chat/messages/doctor?doctorId=${doctorId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.messages) {
            const key = `patient:doctor:${doctorId}`;
            const ts = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
            const hidden = new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]'));
            const filtered = data.messages.filter((m:any)=> {
              const t = new Date(m.created_at||0).getTime();
              return (!ts || t>=ts) && !hidden.has(String(m.id));
            });
            setMessages(sortByTime(filtered));
            setClearedAt(Number.isFinite(ts) ? ts : 0);
          }
          await fetch(`${API_URL}/chat/mark-read/doctor`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ doctorId })
          });
          sessionStorage.setItem('chatDoctorId', String(doctorId));
          // clear unread badge
          setUnreadDoctor(0);
          window.dispatchEvent(new CustomEvent('patient-unread-doctor:update', { detail: { unread: 0 } }));
          // try to resolve doctor name
          try {
            const ures = await fetch(`${API_URL}/admin/doctors`, { headers: { Authorization: `Bearer ${token}` } });
            if (ures.ok) {
              const body = await ures.json();
              const list = Array.isArray(body.users) ? body.users : [];
              const doc = list.find((u:any)=> Number(u.id) === Number(doctorId));
              if (doc) setDoctorName(doc.name || doc.username || doc.email || 'Doctor');
            }
          } catch {}
        } else if (target === 'pharmacy') {
          // Determine current assigned provider from last active order (admin approved, paid, with provider assigned)
          const ord = await fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
          const list = await ord.json();
          const orders: any[] = Array.isArray(list.orders) ? list.orders : [];
          const active = orders.find((o:any) => !!o.provider_id) || orders[0];
          const provId = active?.provider_id;
          if (!provId) { setProviderId(null); setMessages([]); return; }
          setProviderId(Number(provId));
          const res = await fetch(`${API_URL}/chat/messages/provider?providerId=${provId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.messages) {
            const key = `patient:provider:${provId}`;
            const ts = Number(localStorage.getItem(`chatClearedAt:${key}`) || '0');
            const hidden = new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]'));
            const filtered = data.messages.filter((m:any)=> {
              const t = new Date(m.created_at||0).getTime();
              return (!ts || t>=ts) && !hidden.has(String(m.id));
            });
            setMessages(sortByTime(filtered));
            setClearedAt(Number.isFinite(ts) ? ts : 0);
          }
          await fetch(`${API_URL}/chat/mark-read/provider`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ providerId: provId })
          });
          sessionStorage.setItem('chatProviderId', String(provId));
          // clear pharmacy unread badge when entering
          setUnreadPharmacy(0);
          window.dispatchEvent(new CustomEvent('patient-unread-pharmacy:update', { detail: { unread: 0 } }));
        }
      } catch (e:any) {
        toast({ title: 'Network error', description: 'Failed to load chat history.', variant: 'destructive' });
      }
    };
    if (token) load();
  }, [token, target]);

  // Socket setup
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
  socketRef.current = socket;
  socket.on('message:new', async (m: any) => {
      const isAdminPair = (m.from_role === 'admin' && m.to_role === 'patient') || (m.from_role === 'patient' && m.to_role === 'admin');
      const isDoctorPair = (m.from_role === 'doctor' && m.to_role === 'patient') || (m.from_role === 'patient' && m.to_role === 'doctor');
  const isProviderPair = (m.from_role === 'provider' && m.to_role === 'patient') || (m.from_role === 'patient' && m.to_role === 'provider');
  if ((target === 'admin' && isAdminPair) || (target === 'doctor' && isDoctorPair) || (target === 'pharmacy' && isProviderPair)) {
        // filter by clearedAt and hidden ids
        const key = target === 'admin' ? 'patient:admin' : target === 'doctor' && doctorId ? `patient:doctor:${doctorId}` : target === 'pharmacy' && providerId ? `patient:provider:${providerId}` : null;
        const hidden = key ? new Set<string>(JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]')) : new Set<string>();
        const t = new Date(m.created_at||0).getTime();
        if (!clearedAt || t >= clearedAt) {
          if (!hidden.has(String(m.id))) setMessages(prev => sortByTime([...prev, m]));
        }
        // Auto mark-read when receiving messages while thread is open
        try {
          if (m.to_role === 'patient') {
            if (target === 'admin' && m.from_role === 'admin') {
              await fetch(`${API_URL}/chat/mark-read/admin`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
            } else if (target === 'doctor' && m.from_role === 'doctor') {
              const d = Number(sessionStorage.getItem('chatDoctorId') || '0');
              if (isFinite(d) && d > 0) {
                await fetch(`${API_URL}/chat/mark-read/doctor`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ doctorId: d })
                });
              }
            } else if (target === 'pharmacy' && m.from_role === 'provider') {
              let p = Number(sessionStorage.getItem('chatProviderId') || '0');
              // derive providerId from message payload if not already stored
              if (!isFinite(p) || p <= 0) {
                const fromId = Number(m.from_user_id ?? m.provider_id);
                const toId = Number(m.to_user_id ?? m.provider_id);
                const candidate = isFinite(fromId) && m.from_role === 'provider' ? fromId : (isFinite(toId) ? toId : 0);
                if (candidate > 0) {
                  p = candidate;
                  sessionStorage.setItem('chatProviderId', String(p));
                  setProviderId(p);
                }
              }
              if (isFinite(p) && p > 0) {
                await fetch(`${API_URL}/chat/mark-read/provider`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ providerId: p })
                });
              }
            }
          }
        } catch {}
      }
      // bump patient unread when message from doctor or admin and not currently viewing that chat
      if (isDoctorPair && m.from_role === 'doctor' && target !== 'doctor') {
        setUnreadDoctor(prev => {
          const val = prev + 1;
          window.dispatchEvent(new CustomEvent('patient-unread-doctor:update', { detail: { unread: val } }));
          return val;
        });
      }
      if (isAdminPair && m.from_role === 'admin' && target !== 'admin') {
        setUnreadAdmin(prev => {
          const val = prev + 1;
          window.dispatchEvent(new CustomEvent('patient-unread-admin:update', { detail: { unread: val } }));
          return val;
        });
      }
      if (isProviderPair && m.from_role === 'provider' && target !== 'pharmacy') {
        setUnreadPharmacy(prev => {
          const val = prev + 1;
          window.dispatchEvent(new CustomEvent('patient-unread-pharmacy:update', { detail: { unread: val } }));
          return val;
        });
      }
      // If a provider message arrives but providerId hasn't been resolved yet, set it so subsequent sends update ticks correctly
      if (isProviderPair && !providerId && m.from_role === 'provider') {
        const fromId = Number(m.from_user_id ?? m.provider_id);
        if (Number.isFinite(fromId) && fromId > 0) {
          setProviderId(fromId);
          sessionStorage.setItem('chatProviderId', String(fromId));
        }
      }
    });
    socket.on('message:status', (s: any) => {
      setMessages(prev => prev.map(mm => mm.id === s.id ? { ...mm, status: s.status } as any : mm));
    });
    socket.on('presence:update', (p: any) => {
      if (p?.role === 'admin') setAdminOnline(!!p.online);
      if (p?.role === 'doctor') {
        const id = Number(p.userId);
        if (!Number.isFinite(id)) return;
        setOnlineDoctors(prev => {
          const n = new Set(prev);
          if (p.online) n.add(id); else n.delete(id);
          return n;
        });
        if (doctorId && id === doctorId) setDoctorOnline(!!p.online);
      }
    });
    socket.on('presence:snapshot', (snap: any) => {
      if (typeof snap?.adminOnline === 'boolean') setAdminOnline(!!snap.adminOnline);
      if (Array.isArray(snap?.doctorsOnline)) {
        const set = new Set<number>();
        for (const v of snap.doctorsOnline) {
          const id = Number(v);
          if (Number.isFinite(id)) set.add(id);
        }
        setOnlineDoctors(set);
        if (doctorId) setDoctorOnline(set.has(doctorId));
      }
      if (Array.isArray(snap?.providersOnline)) {
        const set = new Set<number>();
        for (const v of snap.providersOnline) {
          const id = Number(v);
          if (Number.isFinite(id)) set.add(id);
        }
        setOnlineProviders(set);
      }
    });
    socket.on('typing:start', (ev: any) => {
      if (ev.fromRole === 'admin') setAdminTyping(true);
  const id = Number(ev.fromUserId);
      if (ev.fromRole === 'doctor' && doctorId && Number.isFinite(id) && id === doctorId) setDoctorTyping(true);
  // Could add provider typing indicator if needed later
    });
    socket.on('typing:stop', (ev: any) => {
      if (ev.fromRole === 'admin') setAdminTyping(false);
  const id = Number(ev.fromUserId);
      if (ev.fromRole === 'doctor' && doctorId && Number.isFinite(id) && id === doctorId) setDoctorTyping(false);
    });
    return () => { socket.disconnect(); };
  }, [token, doctorId]);

  // When current doctor changes or online snapshot updates, recompute indicator
  useEffect(() => {
    if (doctorId) setDoctorOnline(onlineDoctors.has(doctorId));
    else setDoctorOnline(false);
  }, [doctorId, onlineDoctors]);

  const providerOnline = providerId ? onlineProviders.has(providerId) : false;

  const onSend = () => {
    if (!text.trim()) return;
    const socket = socketRef.current; if (!socket) return;
    const content = text.trim();
    const toRole = target === 'pharmacy' ? 'provider' : target; // align with backend roles
  const optimistic: Msg = { id: `temp-${Date.now()}`, from_role: 'patient', to_role: toRole, content, created_at: new Date().toISOString(), status: 'sent' };
  setMessages(prev => sortByTime([...prev, optimistic]));
    setText('');
    let toUserId: number | null = null;
    if (target === 'doctor') {
      const d = Number(sessionStorage.getItem('chatDoctorId') || '0');
      toUserId = isFinite(d) && d > 0 ? d : null;
    } else if (target === 'pharmacy') {
      const p = Number(sessionStorage.getItem('chatProviderId') || '0');
      toUserId = isFinite(p) && p > 0 ? p : null;
    }
    socket.emit('message:send', { toUserId, toRole, content }, (ack: any) => {
      if (ack?.ok && ack.message) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: ack.message.id, status: ack.message.status } : m));
      } else if (ack?.error) {
        toast({ title: 'Send failed', description: ack.error, variant: 'destructive' });
      }
    });
  };

  // Helpers to compute conversation key
  const getConvKey = () => {
    if (target === 'admin') return 'patient:admin';
    if (target === 'doctor' && doctorId) return `patient:doctor:${doctorId}`;
    if (target === 'pharmacy' && providerId) return `patient:provider:${providerId}`;
    return null;
  };

  // Emit typing events
  useEffect(() => {
    const socket = socketRef.current; if (!socket) return;
    if (typing) {
      if (target === 'admin') socket.emit('typing:start', { toRole: 'admin', toUserId: null });
      else if (target === 'doctor') {
        const d = Number(sessionStorage.getItem('chatDoctorId') || '0');
        socket.emit('typing:start', { toRole: 'doctor', toUserId: isFinite(d) && d>0 ? d : null });
      } else if (target === 'pharmacy') {
        const p = Number(sessionStorage.getItem('chatProviderId') || '0');
        socket.emit('typing:start', { toRole: 'provider', toUserId: isFinite(p) && p>0 ? p : null });
      }
    } else {
      if (target === 'admin') socket.emit('typing:stop', { toRole: 'admin', toUserId: null });
      else if (target === 'doctor') {
        const d = Number(sessionStorage.getItem('chatDoctorId') || '0');
        socket.emit('typing:stop', { toRole: 'doctor', toUserId: isFinite(d) && d>0 ? d : null });
      } else if (target === 'pharmacy') {
        const p = Number(sessionStorage.getItem('chatProviderId') || '0');
        socket.emit('typing:stop', { toRole: 'provider', toUserId: isFinite(p) && p>0 ? p : null });
      }
    }
  }, [typing, target]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
  <h1 className="text-3xl font-bold text-white">{`Chat with ${target === 'admin' ? 'Admin' : target === 'doctor' ? doctorName : 'Pharmacy'}`}</h1>
        <div className="flex items-center text-sm text-gray-300">
          <div className={`w-2 h-2 rounded-full mr-2 ${target === 'admin' ? (adminOnline ? 'bg-green-500' : 'bg-gray-500') : target === 'doctor' ? (doctorOnline ? 'bg-green-500' : 'bg-gray-500') : (providerOnline ? 'bg-green-500' : 'bg-gray-500')}`}></div>
          {(target === 'admin' ? (adminOnline ? 'Admin Online' : 'Admin Offline') : target === 'doctor' ? (doctorOnline ? 'Doctor Online' : 'Doctor Offline') : (providerOnline ? 'Pharmacy Online' : 'Pharmacy Offline'))}
        </div>
      </div>

  <Card className="h-[600px] flex flex-col bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Medical Support Chat {target === 'admin' ? (adminTyping ? '• Admin is typing…' : '') : target === 'doctor' ? (doctorTyping ? `• ${doctorName} is typing…` : '') : ''}
          </CardTitle>
          <button
            className="ml-auto px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-red-600 hover:text-white text-xs font-medium"
            onClick={() => {
              const key = getConvKey();
              const now = Date.now();
              if (key) localStorage.setItem(`chatClearedAt:${key}`, String(now));
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
            {messages.map((m) => {
              const mine = m.from_role === 'patient';
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`relative group max-w-xs lg:max-w-md ${mine ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'} rounded-lg p-3 shadow-sm`}>
                    <p className="text-sm">{m.content}</p>
                    <div className={`text-xs mt-1 ${mine ? 'text-blue-200' : 'text-orange-200'} flex items-center gap-2`}>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {mine && <span className="text-[10px] opacity-80">{m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : '✓'}</span>}
                    </div>
                    {mine && (
                      <button
                        aria-label="Delete for me"
                        title="Delete for me"
                        className="hidden group-hover:flex absolute -top-2 -right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1"
                        onClick={() => {
                          const key = getConvKey();
                          if (key) {
                            const arr = JSON.parse(localStorage.getItem(`chatHidden:${key}`) || '[]');
                            const set = new Set<string>(Array.isArray(arr) ? arr.map(String) : []);
                            set.add(String(m.id));
                            localStorage.setItem(`chatHidden:${key}`, JSON.stringify(Array.from(set)));
                          }
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
            <Input 
              placeholder="Type your message about your symptoms or medication concerns..."
              className="flex-1"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!typing) setTyping(true);
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => setTyping(false), 1200);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
            />
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={onSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Health Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto p-3 text-left">
              <div>
                <p className="font-medium text-sm">Pain Management</p>
                <p className="text-xs text-gray-500">Discuss pain levels</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-3 text-left">
              <div>
                <p className="font-medium text-sm">Medication Side Effects</p>
                <p className="text-xs text-gray-500">Report side effects</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-3 text-left">
              <div>
                <p className="font-medium text-sm">Dosage Questions</p>
                <p className="text-xs text-gray-500">Ask about dosing</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-3 text-left">
              <div>
                <p className="font-medium text-sm">Emergency</p>
                <p className="text-xs text-gray-500">Urgent concerns</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// always keep scroll pinned to bottom when message list changes
// placed after component to avoid cluttering the main body
// but still within module scope
// hook into messages length change
export function useAutoScroll(ref: React.RefObject<HTMLDivElement>, dep: any) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // scroll to bottom
    el.scrollTop = el.scrollHeight;
  }, [ref, dep]);
}
