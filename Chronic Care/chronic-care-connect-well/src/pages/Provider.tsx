
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProviderSidebar } from "@/components/provider/ProviderSidebar";
import { ProviderContent } from "@/components/provider/ProviderContent";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Provider = () => {
  const [activeSection, setActiveSection] = useState("patients");
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const isProvider = user && String(user.role || '').toLowerCase() === 'provider';
  if (!user || !isProvider) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <ProviderSidebar 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
          />
          <main className="flex-1 overflow-x-auto">
            <ProviderContent activeSection={activeSection} />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Provider;
