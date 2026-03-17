
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
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'order_confirmation':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'delivery_update':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Building2 className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold text-white">Communication</h1>
          <p className="text-gray-400">with {pharmacy.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pharmacy Info */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Pharmacy Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Name</p>
              <p className="text-white">{pharmacy.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Address</p>
              <p className="text-white">{pharmacy.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Phone</p>
              <p className="text-white">{pharmacy.phone}</p>
            </div>
            {pharmacy.email && (
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{pharmacy.email}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <Badge className={
                pharmacy.status === 'active' 
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : pharmacy.status === 'inactive'
                  ? 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }>
                {pharmacy.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center text-gray-400">Loading messages...</div>
                ) : messages && messages.length > 0 ? (
                  messages.map((message) => (
                    <div key={message.id} className="p-4 rounded-lg bg-gray-700/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getMessageTypeColor(message.message_type)}>
                            {message.message_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-gray-400">
                            {message.sender_type === 'admin' ? 'Admin' : 'Pharmacy'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-white">{message.message}</p>
                      {message.order_id && (
                        <p className="text-xs text-gray-400 mt-2">
                          Related to order: {message.order_id}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No messages yet. Start a conversation!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Send Message */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Send Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Message type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    <SelectItem value="general">General Message</SelectItem>
                    <SelectItem value="order_request">Order Request</SelectItem>
                    <SelectItem value="order_confirmation">Order Confirmation</SelectItem>
                    <SelectItem value="delivery_update">Delivery Update</SelectItem>
                  </SelectContent>
                </Select>

                {messageType === 'order_request' && (
                  <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select order" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {pendingOrders?.map((order:any) => {
                        const label = order?.medication_name || order?.medicine_name || order?.disease || `Order #${order?.id}`;
                        const dt = order?.created_at ? new Date(order.created_at).toLocaleDateString() : '';
                        return (
                          <SelectItem key={order.id} value={String(order.id)}>
                            {label}{dt ? ` - ${dt}` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="bg-gray-700 border-gray-600 text-white"
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
                  className="bg-blue-600 hover:bg-blue-700"
                >
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
