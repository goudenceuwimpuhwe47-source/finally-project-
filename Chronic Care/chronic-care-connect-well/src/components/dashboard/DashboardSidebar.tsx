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

  // Load unread notifications count and subscribe to realtime events for new ones
  useEffect(() => {
    let mounted = true;
    const loadUnread = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/notifications/my?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const body = await res.json();
        const rows = Array.isArray(body?.notifications) ? body.notifications : [];
        const count = rows.reduce((acc: number, r: any) => acc + (String(r.status).toLowerCase() === 'unread' ? 1 : 0), 0);
        if (mounted) setUnreadNotifications(count);
      } catch {}
      // alerts: prefer exact count endpoint
      try {
        const resA = await fetch(`${API_URL}/alerts/my/count`, { headers: { Authorization: `Bearer ${token}` } });
        if (resA.ok) {
          const bodyA = await resA.json();
          const countA = Number(bodyA?.pending || 0);
          if (mounted) setUnreadAlerts(countA);
        }
      } catch {}
    };
    loadUnread();
    if (!token) return;
  const socket = io(API_URL, { auth: { token } });
  const onInvoice = () => setUnreadNotifications((c) => c + 1);
  const onInvoiceCanceled = () => setUnreadNotifications((c) => c + 1);
  const onPayment = () => setUnreadNotifications((c) => c + 1);
  const onPrescription = () => setUnreadNotifications((c) => c + 1);
  socket.on('order:invoice_sent', onInvoice);
  socket.on('order:invoice_canceled', onInvoiceCanceled);
  socket.on('order:payment_received', onPayment);
  socket.on('order:admin_approved', onPayment); // also increment for admin approval
  socket.on('prescription:created', onPrescription);
  const refreshAlerts = () => loadUnread();
  socket.on('alert:scheduled', refreshAlerts);
  socket.on('alert:due', refreshAlerts);
  socket.on('alert:email_sent', refreshAlerts);
  const onRefreshAlerts = () => loadUnread();
  window.addEventListener('patient-alerts:refreshCount', onRefreshAlerts as any);
    return () => { mounted = false; window.removeEventListener('patient-alerts:refreshCount', onRefreshAlerts as any); socket.disconnect(); };
  }, [token]);
  return (
    <Sidebar className="border-r border-gray-700 bg-gray-800">
      <SidebarHeader className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Pill className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ChronicCare</span>
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
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700 data-[state=open]:bg-blue-600 data-[state=open]:text-white"
                  >
                    <div className="relative">
                      {item.icon && <item.icon className="h-5 w-5" />}
                      {item.id === 'chat-admin' && unreadAdmin > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unreadAdmin}</span>
                      )}
                      {item.id === 'chat-doctor' && unreadDoctor > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unreadDoctor}</span>
                      )}
                      {item.id === 'notifications' && unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unreadNotifications}</span>
                      )}
                      {item.id === 'alerts' && unreadAlerts > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unreadAlerts}</span>
                      )}
                      {item.id === 'chat-pharmacy' && unreadPharmacy > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unreadPharmacy}</span>
                      )}
                    </div>
                    <span className="ml-2">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="px-2">
            <LogoutConfirm triggerClassName="w-full justify-start text-red-400 hover:text-red-300" />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
