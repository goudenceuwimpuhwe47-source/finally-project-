
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Stethoscope, Users, Pill, MessageSquare, FileText, Settings, LogOut, Activity, Package, Boxes } from "lucide-react";
import LogoutConfirm from "@/components/dashboard/LogoutConfirm";

interface ProviderSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const ProviderSidebar = ({ activeSection, setActiveSection }: ProviderSidebarProps) => {

  const menuItems = [
    { id: "patients", label: "Patients", icon: Users },
    { id: "assigned", label: "Assigned Orders", icon: Package },
  { id: "stock", label: "Stock", icon: Boxes },
    { id: "prescriptions", label: "Prescriptions", icon: Pill },
    { id: "monitoring", label: "Patient Monitoring", icon: Activity },
    { id: "communication", label: "Communications", icon: MessageSquare },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <Sidebar className="w-64 bg-gray-800 border-r border-gray-700">
      <SidebarHeader className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="bg-green-600 p-2 rounded-lg">
            <Stethoscope className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Provider (Pharmacy) Portal</h2>
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
                    ? "bg-green-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <SidebarMenuItem className="mt-8">
            <LogoutConfirm 
              label="Sign Out"
              variant="outline"
              size="sm"
              triggerClassName="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
              icon={<LogOut className="h-5 w-5" />}
              fullWidth
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};
