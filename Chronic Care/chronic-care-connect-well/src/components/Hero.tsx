import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Pill, Shield, Activity, Clock } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { API_URL } from '@/lib/utils';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface SystemStats {
  activePatients: number;
  healthcareProviders: number;
  doctors: number;
  uptime: number;
}

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || '').toString().toLowerCase();
  const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';
  
  const [stats, setStats] = useState<SystemStats>({
    activePatients: 0,
    healthcareProviders: 0,
    doctors: 0,
    uptime: 99.9
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_URL}/users/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const { toast } = useToast();
  const handleGetStarted = () => {
    if (user) {
  navigate(dashPath);
      toast({ title: "Welcome back!", description: "Welcome back to your dashboard!" });
    } else {
      navigate('/auth');
      toast({ title: "Getting started", description: "Sign up to start managing your chronic care!" });
    }
  };

  const handleWatchDemo = () => {
    toast({ title: "Demo mode", description: "Demo video coming soon! Contact us for a live demonstration." });
  };

  return (
    <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          <div className="w-full lg:w-1/2 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Manage Your <span className="text-blue-400">Chronic Care</span> with Confidence
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Connect with healthcare providers (pharmacies), order medications, and track your wellness journey. 
              Chronic Care Connect Well makes chronic illness management simple, secure, and personalized.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
                onClick={handleGetStarted}
              >
                Get Started Today
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto"
                onClick={handleWatchDemo}
              >
                <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Watch Demo
              </Button>
            </div>
            <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-400">
                  {loading ? '...' : (stats.activePatients > 0 ? stats.activePatients.toLocaleString() : '0')}
                </div>
                <div className="text-sm text-gray-400">Active Patients</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-400">
                  {loading ? '...' : (stats.healthcareProviders + stats.doctors > 0 ? (stats.healthcareProviders + stats.doctors).toLocaleString() : '0')}
                </div>
                <div className="text-sm text-gray-400">Healthcare Professionals</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-400">
                  {loading ? '...' : `${stats.uptime}%`}
                </div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 relative mt-8 lg:mt-0">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-3xl p-4 sm:p-8 transform hover:rotate-0 transition-transform duration-500 rotate-1 lg:rotate-3">
              <img 
                src="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?auto=format&fit=crop&w=800&q=80" 
                alt="Patient using healthcare app" 
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
            </div>
            <div className="absolute -bottom-2 sm:-bottom-4 -left-2 sm:-left-4 bg-gray-800 p-3 sm:p-4 rounded-xl shadow-lg border border-gray-700">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-medium text-white">Online Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
