
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Shield, Users, Package, FileText, Settings, Bell, UserPlus, LogOut, BarChart3, MessageSquare, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/utils";

interface AdminSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const AdminSidebar = ({ activeSection, setActiveSection }: AdminSidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const token = useMemo(()=> (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '', []);


  // Debug: Log state changes
  useEffect(() => {
    console.log('[AdminSidebar] Badge State - Unread Notifications:', unreadNotifs);
  }, [unreadNotifs]);

  useEffect(() => {
    const handler = (e: any) => {
      const val = e?.detail?.unread || 0;
      setUnreadTotal(val);
    };
    window.addEventListener('admin-unread:update', handler as any);
    return () => window.removeEventListener('admin-unread:update', handler as any);
  }, []);

  // Load unread notifications count and keep it updated
  useEffect(() => {
    const load = async () => {
      try {
        console.log('[AdminSidebar] === START LOADING NOTIFICATIONS ===');
        console.log('[AdminSidebar] Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
        console.log('[AdminSidebar] Fetching from:', `${API_URL}/admin/notifications`);
        
        const res = await fetch(`${API_URL}/admin/notifications`, { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        });
        
        console.log('[AdminSidebar] Response status:', res.status, res.statusText);
        
        if (!res.ok) {
          console.error('[AdminSidebar] API call failed:', res.status, res.statusText);
          const errorText = await res.text();
          console.error('[AdminSidebar] Error response:', errorText);
          setLoading(false);
          return;
        }
        
        const body = await res.json();
        console.log('[AdminSidebar] Response body:', body);
        console.log('[AdminSidebar] Notifications array:', body?.notifications);
        
        const rows = Array.isArray(body?.notifications) ? body.notifications : [];
        console.log('[AdminSidebar] Valid notifications array length:', rows.length);
        
        const cnt = rows.reduce((n: number, r: any) => {
          const isUnread = String(r.status).toLowerCase() === 'unread';
          console.log(`[AdminSidebar] Notification ID ${r.id}: status="${r.status}", isUnread=${isUnread}`);
          return n + (isUnread ? 1 : 0);
        }, 0);
        
        console.log('[AdminSidebar] ⭐ FINAL UNREAD COUNT:', cnt);
        setUnreadNotifs(cnt);
        setLoading(false);
        console.log('[AdminSidebar] === END LOADING NOTIFICATIONS ===');
      } catch (err) {
        console.error('[AdminSidebar] ❌ EXCEPTION:', err);
        setLoading(false);
      }
    };
    
    console.log('[AdminSidebar] useEffect triggered, token exists:', !!token);
    if (token) {
      load();
    } else {
      console.warn('[AdminSidebar] No token found, skipping notification load');
    }
    
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    
    // Increment badge on payment notification
    const onPay = () => setUnreadNotifs(c => c + 1);
    socket.on('order:payment_received', onPay);
    
    // Increment badge on new order notification
    const onNewOrder = () => setUnreadNotifs(c => c + 1);
    socket.on('order:new_order', onNewOrder);
    
    // Decrement badge when notification marked as read
    const onReadOne = () => setUnreadNotifs(c => Math.max(0, c - 1));
    window.addEventListener('admin-notification:read', onReadOne as any);
    
    return () => { 
      socket.disconnect(); 
      window.removeEventListener('admin-notification:read', onReadOne as any); 
    };
  }, [token]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "patients", label: "Patients", icon: Users },
    { id: "providers", label: "Doctors", icon: UserPlus },
    { id: "pharmacies", label: "Pharmacies", icon: Building2 },
    { id: "orders", label: "Order Requests", icon: FileText },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "chat", label: "Patient Chat", icon: MessageSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="w-64 bg-gray-800 border-r border-gray-700">
      <SidebarHeader className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <p className="text-sm text-gray-400">ChronicCare</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.id === 'chat' && unreadTotal > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-semibold z-10">
                      {unreadTotal}
                    </span>
                  )}
                  {item.id === 'notifications' && (
                    <>
                      {/* Always show badge for testing - will show 0 or actual count */}
                      <span 
                        className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-semibold z-10"
                        title={`Unread notifications: ${unreadNotifs}`}
                      >
                        {unreadNotifs || '0'}
                      </span>
                    </>
                  )}
                </div>
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <SidebarMenuItem className="mt-8">
            <SidebarMenuButton
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-600 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};
