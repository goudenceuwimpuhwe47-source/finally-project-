
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || '').toString().toLowerCase();
  const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';

  const handlePatientRegister = () => {
    if (user) {
      navigate(dashPath);
      toast.success("Welcome to your patient dashboard!");
    } else {
      navigate('/auth');
      toast.info("Please sign up to access patient features");
    }
  };

  const handleDoctorAccess = () => {
    if (user) {
      if (role === 'doctor') {
        navigate('/doctor');
        toast.success("Welcome to your doctor dashboard!");
      } else {
        toast.info("Doctor features require a doctor account. Contact administrator for access.");
      }
    } else {
      navigate('/auth');
      toast.info("Please sign in to access doctor features");
    }
  };

  const handleProviderPortal = () => {
    if (user) {
      toast.info("Provider portal available with provider credentials.");
    } else {
      navigate('/auth');
      toast.info("Please sign in to access provider features");
    }
  };

  return (
    <section id="services" className="py-20 bg-background text-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comprehensive Care Solutions
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-medium">
            Whether you're a patient managing chronic illness or a healthcare provider, 
            this project offers practical tools to support your care journey.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Portal */}
          <Card className="group hover:shadow-2xl transition-all duration-300 border-border shadow-lg overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-white">
                <User className="h-12 w-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">For Patients</h3>
                <p className="text-primary-foreground/90">Complete chronic care management</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Register and create your health profile</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Chat with healthcare administrators</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Order medications and pain management solutions</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Track symptoms and wellness progress</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Secure password management</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                  onClick={handlePatientRegister}
                >
                  Register as Patient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Doctor Portal */}
          <Card className="group hover:shadow-2xl transition-all duration-300 border-border shadow-lg overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white">
                <Shield className="h-12 w-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">For Doctors</h3>
                <p className="text-emerald-50/90">Professional medical care and patient management</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Review and manage patient health records</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Communicate directly with patients via chat</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Monitor patient symptoms and progress</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Provide medical advice and treatment plans</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Access patient analytics and health data</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200"
                  onClick={handleDoctorAccess}
                >
                  Doctor Access
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Healthcare Provider Portal */}
          <Card className="group hover:shadow-2xl transition-all duration-300 border-border shadow-lg overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-violet-600 to-violet-700 p-8 text-white">
                <Stethoscope className="h-12 w-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">For Pharmacies</h3>
                <p className="text-violet-50/90">Professional pharmacy tools</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-violet-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Manage medication inventory</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-violet-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Process prescription orders</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-violet-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Coordinate with healthcare teams</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-violet-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Update stock availability</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-violet-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-muted-foreground font-medium">Secure pharmacy portal access</span>
                  </li>
                </ul>
                <Button 
                   className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200"
                  onClick={handleProviderPortal}
                >
                  Pharmacy Portal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Services;
