import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";

type PatientNotification = {
  id: string | number;
  title: string;
  message: string;
  created_at: string;
  status?: 'unread'|'read';
};

export function NotificationsSection() {
  const [items, setItems] = useState<PatientNotification[]>([]);
  const token = useMemo(()=> localStorage.getItem('token') || '', []);
  const API_URL = 'http://localhost:5000';

  // Load existing notifications on mount
  const { data } = useQuery({
    queryKey: ["patientNotifications"],
    queryFn: async () => {
      if (!token) return [] as PatientNotification[];
      const res = await fetch(`${API_URL}/notifications/my?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const body = await res.json();
      const rows = Array.isArray(body?.notifications) ? body.notifications : [];
      return rows.map((r: any) => ({ id: r.id, title: r.title, message: r.message, created_at: r.created_at, status: r.status })) as PatientNotification[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (Array.isArray(data) && data.length) setItems(data);
  }, [data]);

  useEffect(() => {
    if (!token) return;
    const socket = io('http://localhost:5000', { auth: { token } });
    // when admin sends invoice, notify patient to pay
  socket.on('order:invoice_sent', (p: any) => {
      const n: PatientNotification = {
        id: `inv-${p?.orderId}-${Date.now()}`,
        title: `Invoice for Order #${p?.orderId}`,
    message: 'Your invoice is ready. We sent it to your email and posted it here. Please pay to proceed.',
        created_at: new Date().toISOString(),
        status: 'unread',
      };
      setItems(prev => [n, ...prev]);
    });
    socket.on('order:payment_received', (p: any) => {
      const n: PatientNotification = {
        id: `pay-${p?.orderId}-${Date.now()}`,
        title: `Payment received for Order #${p?.orderId}`,
        message: 'Thanks! Your order will move to pharmacy stage now.',
        created_at: new Date().toISOString(),
        status: 'unread',
      };
      setItems(prev => [n, ...prev]);
    });
    socket.on('prescription:created', (p: any) => {
      const orderId = p?.orderId;
      const n: PatientNotification = {
        id: `presc-${orderId}-${Date.now()}`,
        title: `New prescription for Order #${orderId}`,
        message: `The pharmacy created your prescription: ${p?.prescription?.medicine_name || ''} — ${p?.prescription?.quantity || ''}.`,
        created_at: new Date().toISOString(),
        status: 'unread',
      };
      setItems(prev => [n, ...prev]);
    });
    socket.on('order:admin_approved', (p: any) => {
      const providerName = p?.provider?.name || 'assigned provider';
      const n: PatientNotification = {
        id: `adm-appr-${p?.orderId}-${Date.now()}`,
        title: `Order #${p?.orderId} approved`,
        message: `Your order is approved. You can now coordinate with ${providerName}.`,
        created_at: new Date().toISOString(),
        status: 'unread',
      };
      setItems(prev => [n, ...prev]);
    });
    return () => { socket.disconnect(); };
  }, [token]);

  const markOneRead = async (n: PatientNotification) => {
    if (!token) return;
    // If it already looks read, no-op
    if (n.status === 'read') return;
    // If ID is numeric, persist to backend; otherwise just flip locally (ephemeral socket item)
    const idNum = typeof n.id === 'number' ? n.id : (Number(n.id) || NaN);
    if (!Number.isNaN(idNum)) {
      try {
        const res = await fetch(`${API_URL}/notifications/${idNum}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to mark read');
      } catch {}
    }
    // Update local state
    setItems(prev => prev.map(i => i.id === n.id ? { ...i, status: 'read' } : i));
    // Decrement sidebar badge by 1
    const evt = new CustomEvent('patient-notifications:decUnread', { detail: { n: 1 } });
    window.dispatchEvent(evt);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Notifications</h1>
        <Button
          variant="outline"
          onClick={()=> {
            setItems(prev => prev.map(i=> ({ ...i, status: 'read' })));
            // inform sidebar to clear unread badge immediately
            const evt = new CustomEvent('patient-notifications:markAllRead');
            window.dispatchEvent(evt);
          }}
        >
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-4">
        {items.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-gray-300">No notifications yet.</CardContent>
          </Card>
        )}
        {items.map((n) => (
          <Card
            key={n.id}
            className={`border ${n.status === 'unread' ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-800 border-gray-700'} cursor-pointer`}
            onClick={() => markOneRead(n)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2"><Bell className="h-4 w-4" /> {n.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-gray-300">
              <div className="text-sm">{n.message}</div>
              <div className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
