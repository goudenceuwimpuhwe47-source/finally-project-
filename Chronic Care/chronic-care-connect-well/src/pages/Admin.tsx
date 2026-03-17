
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminContent } from "@/components/admin/AdminContent";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
// Removed supabase import

const Admin = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { user, loading } = useAuth();

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
  queryFn: async () => {
    // TODO: Replace with actual MySQL query to check admin status
    if (!user) return false;
    // Example: Replace with your API call or logic
    // const response = await fetch(`/api/admin/check?userId=${user.id}`);
    // const result = await response.json();
    // return result.isAdmin;
    return false; // Default to false until implemented
  },
  enabled: !!user,
  });

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <AdminSidebar 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
          />
          <main className="flex-1 overflow-x-auto">
            <AdminContent activeSection={activeSection} />
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default Admin;
