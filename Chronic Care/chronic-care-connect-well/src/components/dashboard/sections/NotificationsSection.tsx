import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/utils";

type PatientNotification = {
  id: string | number;
  title: string;
  message: string;
  created_at: string;
  status?: 'unread'|'read';
};

export function NotificationsSection() {
  const [items, setItems] = useState<PatientNotification[]>([]);
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '', []);

  // Load existing notifications on mount
  const { data, refetch } = useQuery({
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

  // Listen for refresh signals from Sidebar or markAllRead
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };
    window.addEventListener('patient-notifications:refresh', handleRefresh);
    window.addEventListener('patient-notifications:markAllRead', handleRefresh);
    return () => {
      window.removeEventListener('patient-notifications:refresh', handleRefresh);
      window.removeEventListener('patient-notifications:markAllRead', handleRefresh);
    };
  }, [refetch]);

  useEffect(() => {
    if (Array.isArray(data)) setItems(data);
  }, [data]);

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
    // Decrement sidebar badge by 1 (local sync)
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
