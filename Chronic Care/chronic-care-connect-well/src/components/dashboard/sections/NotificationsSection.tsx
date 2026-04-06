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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Notifications</h1>
        <Button
          variant="outline"
          className="w-full sm:w-auto text-sm border-border text-foreground hover:bg-accent"
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
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-muted-foreground">No notifications yet.</CardContent>
          </Card>
        )}
        {items.map((n) => (
          <Card
            key={n.id}
            className={`border transition-all duration-200 cursor-pointer hover:shadow-md ${
              n.status === 'unread' 
                ? 'bg-blue-50 border-blue-100 shadow-sm ring-1 ring-blue-50' 
                : 'bg-white border-border shadow-sm opacity-80 hover:opacity-100'
            }`}
            onClick={() => markOneRead(n)}
          >
            <CardHeader className="pb-1 pt-4">
              <CardTitle className={`text-sm md:text-base font-black flex items-center gap-2 ${n.status === 'unread' ? 'text-blue-800' : 'text-foreground'}`}>
                {n.status === 'unread' && <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />}
                <Bell className={`h-4 w-4 ${n.status === 'unread' ? 'text-blue-600' : 'text-muted-foreground'}`} /> 
                {n.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 text-muted-foreground">
              <div className={`text-sm font-medium ${n.status === 'unread' ? 'text-blue-900/80' : 'text-muted-foreground'}`}>{n.message}</div>
              <div className="flex items-center gap-2 mt-3 overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 bg-secondary/50 px-2 py-0.5 rounded-full">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 bg-secondary/50 px-2 py-0.5 rounded-full">
                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
