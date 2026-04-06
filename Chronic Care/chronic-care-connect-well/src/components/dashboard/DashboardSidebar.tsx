import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { Heart, Pill, MessageSquare, User, Bell, LogOut, AlarmClock } from "lucide-react";
import LogoutConfirm from "./LogoutConfirm";
import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/utils";
import { io } from "socket.io-client";

interface DashboardSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const menuItems = [
  { id: "health", title: "My Health", },
  { id: "medications", title: "Medications", icon: Pill },
  { id: "request-medication", title: "Request Medication", icon: Pill },
  { id: "my-requests", title: "My Requests", icon: Pill },
  { id: "chat-admin", title: "Chat with Admin", icon: MessageSquare },
  { id: "chat-doctor", title: "Chat with Doctor", icon: MessageSquare },
  { id: "chat-pharmacy", title: "Chat with Pharmacy", icon: MessageSquare },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "alerts", title: "Medication Alerts", icon: AlarmClock },
  { id: "profile", title: "Profile", icon: User },
];

export function DashboardSidebar({ activeSection, setActiveSection }: DashboardSidebarProps) {
  const [unreadAdmin, setUnreadAdmin] = useState(0);
  const [unreadDoctor, setUnreadDoctor] = useState(0);
  const [unreadPharmacy, setUnreadPharmacy] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const token = useMemo(()=> (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '', []);
  useEffect(() => {
    const h1 = (e: CustomEvent) => setUnreadAdmin(Number(e?.detail?.unread || 0));
    const h2 = (e: CustomEvent) => setUnreadDoctor(Number(e?.detail?.unread || 0));
    const h3 = () => setUnreadNotifications(0);
    const h4 = (e: CustomEvent) => setUnreadPharmacy(Number(e?.detail?.unread || 0));
    const h3b = (e: CustomEvent) => setUnreadNotifications((c)=> Math.max(0, c - Number(e?.detail?.n || 1)));
    const h5 = (e: CustomEvent) => setUnreadAlerts(Number(e?.detail?.pending || 0));
    window.addEventListener('patient-unread-admin:update', h1 as any);
    window.addEventListener('patient-unread-doctor:update', h2 as any);
    window.addEventListener('patient-unread-pharmacy:update', h4 as any);
    window.addEventListener('patient-notifications:markAllRead', h3 as any);
    window.addEventListener('patient-notifications:decUnread', h3b as any);
    window.addEventListener('patient-alerts:updateCount', h5 as any);
    return () => {
      window.removeEventListener('patient-unread-admin:update', h1 as any);
      window.removeEventListener('patient-unread-doctor:update', h2 as any);
      window.removeEventListener('patient-unread-pharmacy:update', h4 as any);
      window.removeEventListener('patient-notifications:markAllRead', h3 as any);
      window.removeEventListener('patient-notifications:decUnread', h3b as any);
      window.removeEventListener('patient-alerts:updateCount', h5 as any);
    };
  }, []);

  // Load unread counts (debounced to prevent request storms)
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadUnread = async () => {
      if (!token) return;
      try {
        // Notifications: use the lightweight count endpoint
        const res = await fetch(`${API_URL}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const body = await res.json();
          if (mounted) setUnreadNotifications(Number(body?.unreadCount || 0));
        }

        // Alerts: count endpoint
        const resA = await fetch(`${API_URL}/alerts/my/count`, { headers: { Authorization: `Bearer ${token}` } });
        if (resA.ok) {
          const bodyA = await resA.json();
          if (mounted) setUnreadAlerts(Number(bodyA?.pending || 0));
        }
      } catch (err) {
        console.error("Sidebar loadUnread error:", err);
      }
    };

    const debouncedLoad = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(loadUnread, 500);
    };

    debouncedLoad();

    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ['polling', 'websocket'] });

    const handleUpdate = () => {
      debouncedLoad();
      window.dispatchEvent(new CustomEvent('patient-notifications:refresh'));
      window.dispatchEvent(new CustomEvent('patient-alerts:refresh'));
    };

    socket.on('order:invoice_sent', handleUpdate);
    socket.on('order:invoice_canceled', handleUpdate);
    socket.on('order:payment_received', handleUpdate);
    socket.on('order:admin_approved', handleUpdate);
    socket.on('prescription:created', handleUpdate);
    socket.on('alert:scheduled', handleUpdate);
    socket.on('alert:due', handleUpdate);
    socket.on('alert:email_sent', handleUpdate);
    socket.on('alert:upcoming', handleUpdate);


    window.addEventListener('patient-alerts:refreshCount', debouncedLoad as any);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('patient-alerts:refreshCount', debouncedLoad as any);
      socket.disconnect();
    };
  }, [token]);
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <div className="bg-primary p-2 rounded-lg">
            <Pill className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-sidebar-foreground">ChronicCare</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveSection(item.id)}
                    isActive={activeSection === item.id}
                    className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
                  >
                    <div className="relative">
                      {item.icon && <item.icon className="h-5 w-5" />}
                      {item.id === 'chat-admin' && unreadAdmin > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">{unreadAdmin}</span>
                      )}
                      {item.id === 'chat-doctor' && unreadDoctor > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">{unreadDoctor}</span>
                      )}
                      {item.id === 'notifications' && unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">{unreadNotifications}</span>
                      )}
                      {item.id === 'alerts' && unreadAlerts > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">{unreadAlerts}</span>
                      )}
                      {item.id === 'chat-pharmacy' && unreadPharmacy > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold">{unreadPharmacy}</span>
                      )}
                    </div>
                    <span className="ml-2">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <div className="px-2">
            <LogoutConfirm triggerClassName="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive font-medium" />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
