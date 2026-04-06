
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
    <Sidebar className="w-80 bg-white border-r border-slate-100 shadow-xl z-20">
      <SidebarHeader className="p-8 border-b border-slate-50">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-600 p-3 rounded-[20px] shadow-lg shadow-emerald-500/20 text-white">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">PharmaSync</h2>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest leading-none mt-1">Provider Nexus</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-6">
        <SidebarMenu className="space-y-1.5">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                  activeSection === item.id
                    ? "bg-emerald-50 text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${activeSection === item.id ? "text-emerald-600" : "text-slate-300 group-hover:text-slate-500"}`} />
                <span className={`font-bold tracking-tight ${activeSection === item.id ? "text-slate-800" : ""}`}>{item.label}</span>
                {activeSection === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          <SidebarMenuItem className="pt-8">
            <LogoutConfirm 
              label="Sign Out"
              variant="outline"
              size="sm"
              triggerClassName="w-full flex items-center justify-center space-x-3 px-5 py-4 rounded-2xl border-rose-100 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-500 shadow-sm"
              icon={<LogOut className="h-5 w-5" />}
              fullWidth
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};
