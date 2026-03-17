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
    <Sidebar className="border-r border-gray-700 bg-gray-800">
      <SidebarHeader className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Doctor</span>
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
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700 data-[state=open]:bg-blue-600 data-[state=open]:text-white"
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
        <div className="mt-auto pt-4 border-t border-gray-700">
          <div className="px-2">
            <LogoutConfirm triggerClassName="w-full justify-start text-red-400 hover:text-red-300" />
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
