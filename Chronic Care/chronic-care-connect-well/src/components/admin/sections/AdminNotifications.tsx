
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";
import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { API_URL } from "@/lib/utils";

export const AdminNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["adminNotifications"],
    queryFn: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/admin/notifications`, { headers: { Authorization: `Bearer ${token || ''}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return Array.isArray(body?.notifications) ? body.notifications : [];
    },
    enabled: !!user,
  });

  // Lightweight real-time banner for payment notifications via socket
  const [realtime, setRealtime] = useState<{ id: string; title: string; message: string; created_at: string }[]>([]);
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    
    // Listen for payment notifications
    socket.on('order:payment_received', (p: any) => {
      setRealtime(prev => ([{ 
        id: `rt-pay-${p?.orderId}-${Date.now()}`, 
        title: `Payment received for Order #${p?.orderId}`, 
        message: 'Patient has paid. You can proceed to approve and move to pharmacy.', 
        created_at: new Date().toISOString() 
      }, ...prev]).slice(0, 20));
      // also refresh list if applicable
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
    });
    
    // Listen for new order notifications
    socket.on('order:new_order', (p: any) => {
      setRealtime(prev => ([{ 
        id: `rt-order-${p?.orderId}-${Date.now()}`, 
        title: p?.title || 'New Order Received', 
        message: p?.message || `New order #${p?.orderId} from ${p?.patientName}`, 
        created_at: p?.created_at || new Date().toISOString() 
      }, ...prev]).slice(0, 20));
      // Refresh notifications list
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
      // Show toast notification
      toast.info(`New order from ${p?.patientName || 'patient'}`);
    });
    
    return () => { socket.disconnect(); };
  }, [queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/admin/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminNotifications"] });
      toast.success("Notification marked as read");
      // decrement unread badge in sidebar
      try {
        window.dispatchEvent(new CustomEvent('admin-notification:read'));
      } catch {}
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading notifications...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Bell className="h-6 w-6 text-white" />
          </div>
          Communication Hub
        </h1>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px]">
          {notifications?.filter((n:any) => n.status === 'unread').length || 0} Critical Segments
        </Badge>
      </div>

      {realtime.length > 0 && (
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm rounded-[32px] overflow-hidden animate-pulse">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-emerald-100/50">
            <CardTitle className="text-emerald-800 font-black tracking-tight text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              Live Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 py-6">
            <div className="space-y-4">
              {realtime.map(n => (
                <div key={n.id} className="p-4 bg-white/60 rounded-2xl border border-emerald-100/50 shadow-sm">
                  <div className="font-black text-emerald-900 text-sm">{n.title}</div>
                  <div className="text-emerald-700 font-bold text-xs mt-1">{n.message}</div>
                  <div className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mt-3">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden">
        <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
          <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center">
            <Bell className="h-5 w-5 mr-3 text-primary" />
            Operational History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-8">
          <div className="space-y-4">
            {notifications?.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 rounded-[24px] border transition-all hover:shadow-md ${
                  notification.status === 'unread'
                    ? 'bg-primary/5 border-primary/10 shadow-sm'
                    : 'bg-slate-50 border-slate-100 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <h3 className={`font-black tracking-tight ${notification.status === 'unread' ? 'text-primary' : 'text-slate-700'}`}>
                      {notification.title}
                    </h3>
                    <p className="text-slate-500 font-bold text-sm mt-1 leading-relaxed">{notification.message}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4 flex items-center gap-2">
                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                      {format(new Date(notification.created_at), 'MMM dd, yyyy · HH:mm')}
                    </p>
                  </div>
                  {notification.status === 'unread' && (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-10 px-5 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <Check className="h-4 w-4 mr-2" /> Mark Done
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {notifications?.length === 0 && (
              <div className="text-center py-24 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Bell className="h-8 w-8 text-slate-200" />
                </div>
                <h3 className="text-slate-400 font-black uppercase text-xs tracking-widest">Registry Silent</h3>
                <p className="text-slate-400 font-bold text-[10px] mt-2">No operational alerts currently pending in the system.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
