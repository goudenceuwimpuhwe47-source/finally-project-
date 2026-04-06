
import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Building2, MessageSquare, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/utils";
import { io, Socket } from "socket.io-client";

interface PharmacyCommunicationProps {
  pharmacy: any;
  onBack: () => void;
}

export const PharmacyCommunication = ({ pharmacy, onBack }: PharmacyCommunicationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState("general");
  const [selectedOrder, setSelectedOrder] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const token = useMemo(() => user?.token || localStorage.getItem('token') || '', [user?.token]);

  // Fetch messages for this pharmacy
  const { data: messages, isLoading } = useQuery({
    queryKey: ["pharmacyCommunications", pharmacy.id],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/admin/pharmacies/${encodeURIComponent(pharmacy.id)}/messages`, { headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token') || ''}` } });
        if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
        const body = await res.json();
        return (body?.messages ?? body ?? []) as any[];
      } catch (e) {
        console.warn('Load pharmacy messages failed', e);
        return [] as any[];
      }
    },
  });

  // Live socket updates for this pharmacy thread
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    const handler = (m: any) => {
      // Only handle messages in this admin<->provider thread
      const match = (m.from_role === 'provider' && Number(m.from_user_id) === Number(pharmacy.id) && m.to_role === 'admin') ||
                    (m.from_role === 'admin' && m.to_role === 'provider' && Number(m.to_user_id) === Number(pharmacy.id));
      if (!match) return;
      // Optimistically update cache list without refetch
      queryClient.setQueryData(["pharmacyCommunications", pharmacy.id], (prev: any) => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const normalized = {
          id: m.id,
          from_user_id: m.from_user_id,
          from_role: m.from_role,
          to_user_id: m.to_user_id,
          to_role: m.to_role,
          message: m.content,
          created_at: m.created_at || new Date().toISOString(),
          sender_type: m.from_role === 'admin' ? 'admin' : 'pharmacy',
          message_type: 'general',
          order_id: m.order_id || null,
        };
        // Prepend newest (list is rendered newest-first)
        return [normalized, ...list];
      });
    };
    socket.on('message:new', handler);
    // Optional: reflect delivered/read receipts in UI (no explicit status chip yet)
    const statusHandler = (s: any) => {
      if (!s || !s.id) return;
      queryClient.setQueryData(["pharmacyCommunications", pharmacy.id], (prev: any) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((msg: any) => msg.id === s.id ? { ...msg, status: s.status } : msg);
      });
    };
    socket.on('message:status', statusHandler);
    return () => { socket.off('message:new', handler); socket.disconnect(); };
  }, [token, pharmacy?.id, queryClient]);

  // Fetch pending orders for order-related messages
  const { data: pendingOrders } = useQuery({
    queryKey: ["pendingOrders"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/admin/orders?status=approved&pharmacy_status=pending`, { headers: { Authorization: `Bearer ${user?.token || localStorage.getItem('token') || ''}` } });
        if (!res.ok) throw new Error('orders failed');
        const body = await res.json();
        return (body?.orders ?? body ?? []) as any[];
      } catch {
        return [] as any[];
      }
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { message: string; type: string; orderId?: string }) => {
      const res = await fetch(`${API_URL}/admin/pharmacies/${encodeURIComponent(pharmacy.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token || localStorage.getItem('token') || ''}` },
        body: JSON.stringify({ message: payload.message, message_type: payload.type, order_id: payload.orderId || undefined }),
      });
      if (!res.ok) throw new Error(`Failed to send (${res.status})`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pharmacyCommunications", pharmacy.id] });
      setNewMessage("");
      setSelectedOrder("");
      toast({
        title: "Message sent",
        description: "Your message has been sent to the pharmacy"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // Emit optimistically via socket for immediate UI feel
    const payload = {
      message: newMessage,
      type: messageType,
      orderId: selectedOrder || undefined
    };
    const socket = socketRef.current;
    if (socket) {
      const optimistic = {
        id: `temp-${Date.now()}`,
        from_user_id: user?.id || 0,
        from_role: 'admin',
        to_user_id: pharmacy.id,
        to_role: 'provider',
        content: payload.message,
        created_at: new Date().toISOString(),
      };
      // Update cache instantly
      queryClient.setQueryData(["pharmacyCommunications", pharmacy.id], (prev: any) => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const normalized = {
          id: optimistic.id,
          from_user_id: optimistic.from_user_id,
          from_role: optimistic.from_role,
          to_user_id: optimistic.to_user_id,
          to_role: optimistic.to_role,
          message: optimistic.content,
          created_at: optimistic.created_at,
          sender_type: 'admin',
          message_type: messageType,
          order_id: selectedOrder || null,
        };
        return [normalized, ...list];
      });
      socket.emit('message:send', { toUserId: Number(pharmacy.id), toRole: 'provider', content: payload.message });
    }
    // Still persist via REST to ensure DB consistency
    sendMessageMutation.mutate(payload as any);
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'order_request':
        return 'bg-primary/10 text-primary border-primary/20 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-full';
      case 'order_confirmation':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-full';
      case 'delivery_update':
        return 'bg-amber-50 text-amber-600 border-amber-100 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-full';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-full';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl h-12 w-12 p-0 transition-all border border-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none truncate max-w-sm">Communication Hub</h1>
            </div>
            <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">Active session with {pharmacy.name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pharmacy Info */}
        <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden self-start">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-slate-800 font-black text-lg tracking-tight flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              Node Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional ID</p>
              <p className="text-slate-700 font-black text-sm">{pharmacy.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Registry</p>
              <p className="text-slate-600 font-bold text-sm leading-relaxed">{pharmacy.address}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice Uplink</p>
              <p className="text-slate-600 font-bold text-sm">{pharmacy.phone}</p>
            </div>
            {pharmacy.email && (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Digital Comms</p>
                <p className="text-slate-600 font-bold text-sm truncate">{pharmacy.email}</p>
              </div>
            )}
            <div className="pt-4 border-t border-slate-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Operational Status</p>
              <Badge variant="outline" className={
                pharmacy.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase text-[10px] rounded-full px-3 py-1'
                  : pharmacy.status === 'inactive'
                  ? 'bg-slate-100 text-slate-500 border-slate-200 font-black uppercase text-[10px] rounded-full px-3 py-1'
                  : 'bg-rose-50 text-rose-600 border-rose-100 font-black uppercase text-[10px] rounded-full px-3 py-1'
              }>
                {pharmacy.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden flex flex-col h-[500px]">
            <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-slate-800 font-black text-lg tracking-tight flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-primary" />
                Packet Stream
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secure Line Active</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden flex-1 flex flex-col bg-slate-50/30">
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-300">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Encrypted Buffer...</p>
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message.id} className={`flex flex-col ${message.sender_type === 'admin' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-5 rounded-[24px] shadow-sm transform transition-all group ${
                        message.sender_type === 'admin'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                      }`}>
                        <div className="flex items-center gap-3 mb-2 opacity-80">
                          <Badge variant="outline" className={`${getMessageTypeColor(message.message_type)} border-white/20 bg-transparent text-[8px] px-1.5`}>
                            {message.message_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {message.sender_type === 'admin' ? 'Nexus' : 'Remote Node'}
                          </span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed">{message.message}</p>
                        {message.order_id && (
                          <div className="mt-3 pt-2 border-t border-white/10 flex items-center gap-2">
                            <Clock className="h-3 w-3 opacity-60" />
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                              Order Reference: #{message.order_id}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 text-[8px] font-black uppercase tracking-tighter opacity-40 text-right">
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-60">
                    <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Quiet Frequency</h3>
                    <p className="text-[10px] font-bold mt-1">Initiate transmission to synchronize data.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Send Message */}
          <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Protocol Type</p>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl shadow-inner focus:ring-primary/40">
                      <SelectValue placeholder="Protocol" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-100 rounded-2xl shadow-xl">
                      <SelectItem value="general" className="font-bold focus:bg-slate-50">General Protocol</SelectItem>
                      <SelectItem value="order_request" className="font-bold focus:bg-primary/5">Order Dispatch</SelectItem>
                      <SelectItem value="order_confirmation" className="font-bold focus:bg-emerald-50">Order Verification</SelectItem>
                      <SelectItem value="delivery_update" className="font-bold focus:bg-amber-50">Logistics Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {messageType === 'order_request' && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Target Package</p>
                    <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                      <SelectTrigger className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl shadow-inner focus:ring-primary/40">
                        <SelectValue placeholder="Manifest Selection" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-100 rounded-2xl shadow-xl">
                        {pendingOrders?.map((order:any) => {
                          const label = order?.medication_name || order?.medicine_name || order?.disease || `Order #${order?.id}`;
                          const dt = order?.created_at ? new Date(order.created_at).toLocaleDateString() : '';
                          return (
                            <SelectItem key={order.id} value={String(order.id)} className="font-bold">
                              {label}{dt ? ` - [${dt}]` : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Manifest secure encryption packet..."
                  className="flex-1 h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl shadow-inner focus:ring-primary/40 placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="h-14 w-14 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-xl shadow-primary/20 active:scale-95 group transition-all shrink-0"
                >
                  <Send className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
