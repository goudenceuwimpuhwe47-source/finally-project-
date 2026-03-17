
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState("health");

  return (
    <div className="min-h-screen bg-gray-900">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <DashboardSidebar 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
          />
          <main className="flex-1 overflow-x-auto">
            <DashboardContent activeSection={activeSection} setActiveSection={setActiveSection} />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Dashboard;
