
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, Pill, LogOut, Shield, Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
// Removed supabase import
import LogoutConfirm from "@/components/dashboard/LogoutConfirm";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Check user roles
  const { data: userRoles } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: async () => {
      if (!user) return { isAdmin: false, isProvider: false };
      
  const [adminCheck, providerCheck] = await Promise.all([
    Promise.resolve({ data: false }), // Replace with actual admin check query
    Promise.resolve({ data: false })  // Replace with actual provider check query
  ]);

      return {
        isAdmin: !!adminCheck.data,
        isProvider: !!providerCheck.data
      };
    },
    enabled: !!user,
  });

  const role = (user?.role || '').toString().toLowerCase();
  const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';

  return (
    <header className="bg-gray-900/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">Chronic Care Connect Well</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-blue-400 transition-colors">Features</a>
            <a href="#services" className="text-gray-300 hover:text-blue-400 transition-colors">Services</a>
            <a href="#about" className="text-gray-300 hover:text-blue-400 transition-colors">About Project</a>
            <a href="#contact" className="text-gray-300 hover:text-blue-400 transition-colors">Contact</a>
          </nav>

          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-300">Welcome, {user.email}</span>
                
                {/* Role-based navigation buttons */}
                {userRoles?.isAdmin && (
                  <Button 
                    variant="outline" 
                    className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    onClick={() => navigate('/admin')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                
                {userRoles?.isProvider && (
                  <Button 
                    variant="outline" 
                    className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                    onClick={() => navigate('/provider')}
                  >
                    <Stethoscope className="h-4 w-4 mr-2" />
                    Provider
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  onClick={() => navigate(dashPath)}
                >
                  Dashboard
                </Button>
                <LogoutConfirm 
                  variant="outline" 
                  size="sm"
                  label="Sign Out"
                  icon={<LogOut className="h-4 w-4" />}
                  triggerClassName="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                />
              </div>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  onClick={() => navigate('/auth')}
                >
                  Login
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate('/auth')}
                >
                  Register
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-gray-700">
            <nav className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-300 hover:text-blue-400 transition-colors px-2 py-1">Features</a>
              <a href="#services" className="text-gray-300 hover:text-blue-400 transition-colors px-2 py-1">Services</a>
              <a href="#about" className="text-gray-300 hover:text-blue-400 transition-colors px-2 py-1">About Project</a>
              <a href="#contact" className="text-gray-300 hover:text-blue-400 transition-colors px-2 py-1">Contact</a>
              <div className="flex flex-col space-y-2 pt-4 px-2">
                {user ? (
                  <>
                    <span className="text-gray-300 mb-2">Welcome, {user.email}</span>
                    
                    {/* Role-based navigation for mobile */}
                    {userRoles?.isAdmin && (
                      <Button 
                        variant="outline" 
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white w-full"
                        onClick={() => navigate('/admin')}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Button>
                    )}
                    
                    {userRoles?.isProvider && (
                      <Button 
                        variant="outline" 
                        className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white w-full"
                        onClick={() => navigate('/provider')}
                      >
                        <Stethoscope className="h-4 w-4 mr-2" />
                        Provider Portal
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white w-full"
                      onClick={() => navigate(dashPath)}
                    >
                      Dashboard
                    </Button>
                    <LogoutConfirm 
                      variant="outline"
                      size="sm"
                      label="Sign Out"
                      icon={<LogOut className="h-4 w-4" />}
                      triggerClassName="border-red-600 text-red-400 hover:bg-red-600 hover:text-white w-full"
                      fullWidth
                    />
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white w-full"
                      onClick={() => navigate('/auth')}
                    >
                      Login
                    </Button>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 w-full"
                      onClick={() => navigate('/auth')}
                    >
                      Register
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
