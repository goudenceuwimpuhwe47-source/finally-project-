import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupContent } from '@/components/ui/sidebar';
import { MessageSquare, ClipboardList, Users, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import LogoutConfirm from '@/components/dashboard/LogoutConfirm';

interface DoctorSidebarProps {
  activeSection: string;
  setActiveSection: (s: string) => void;
}

const items = [
  { id: 'assigned', title: 'Assigned Orders', icon: ClipboardList },
  { id: 'history', title: 'Order History', icon: History },
  { id: 'chat', title: 'Patient Chat', icon: MessageSquare },
  { id: 'patients', title: 'Patients', icon: Users },
];

export default function DoctorSidebar({ activeSection, setActiveSection }: DoctorSidebarProps) {
  const [unreadTotal, setUnreadTotal] = useState(0);
  useEffect(() => {
    const handler = (e: any) => setUnreadTotal(Number(e?.detail?.unread || 0));
    window.addEventListener('doctor-unread:update', handler as any);
    return () => window.removeEventListener('doctor-unread:update', handler as any);
  }, []);
  return (
    <Sidebar className="border-r border-slate-100 bg-white shadow-sm">
      <SidebarHeader className="p-8 border-b border-slate-50 bg-slate-50/10">
        <div className="flex items-center space-x-2">
          <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tight">Clinical</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveSection(i.id)}
                    isActive={activeSection === i.id}
                    className={`w-full justify-start h-12 rounded-xl transition-all duration-200 font-bold uppercase text-[10px] tracking-widest ${activeSection === i.id ? 'bg-primary/5 text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    <div className="relative">
                      <i.icon className="h-5 w-5" />
                      {i.id === 'chat' && unreadTotal > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center">{unreadTotal}</span>
                      )}
                    </div>
                    <span>{i.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto pt-6 border-t border-slate-50 px-4 pb-8">
          <div className="px-2">
            <LogoutConfirm triggerClassName="w-full justify-start text-red-500 hover:text-red-700 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl hover:bg-red-50" />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
