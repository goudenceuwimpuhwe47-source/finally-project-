
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import DashboardPatient from "./pages/DashboardPatient";
import DashboardProvider from "./pages/DashboardProvider";
import DashboardDoctor from "./pages/DashboardDoctor";
import DashboardAdmin from "./pages/DashboardAdmin";
import Auth from "./pages/Auth";
import Order from "./pages/Order";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Provider from "./pages/Provider";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={
              <ProtectedRoute>
        <DashboardPatient />
              </ProtectedRoute>
            } />
            <Route path="/order" element={
              <ProtectedRoute>
                <Order />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <DashboardAdmin />
              </ProtectedRoute>
            } />
            <Route path="/provider" element={
              <ProtectedRoute>
                <DashboardProvider />
              </ProtectedRoute>
            } />
            <Route path="/doctor" element={
              <ProtectedRoute>
                <DashboardDoctor />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
