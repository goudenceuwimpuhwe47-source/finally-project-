
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      {realtime.length > 0 && (
        <Card className="bg-green-900/20 border-green-700">
          <CardHeader>
            <CardTitle className="text-white">Live Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {realtime.map(n => (
                <div key={n.id} className="text-sm text-green-200">
                  <div className="font-medium text-white">{n.title}</div>
                  <div>{n.message}</div>
                  <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            System Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications?.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.status === 'unread'
                    ? 'bg-blue-900/20 border-blue-700'
                    : 'bg-gray-700 border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{notification.title}</h3>
                    <p className="text-gray-300 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  {notification.status === 'unread' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-4"
                      onClick={() => markAsReadMutation.mutate(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {notifications?.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No notifications yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
