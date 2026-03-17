
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
    <section id="services" className="py-20 bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Comprehensive Care Solutions
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Whether you're a patient managing chronic illness or a healthcare provider, 
            this project offers practical tools to support your care journey.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Portal */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-gray-700 shadow-lg overflow-hidden bg-gray-900">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-white">
                <User className="h-12 w-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">For Patients</h3>
                <p className="text-blue-100">Complete chronic care management</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Register and create your health profile</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Chat with healthcare administrators</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Order medications and pain management solutions</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Track symptoms and wellness progress</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Secure password management</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handlePatientRegister}
                >
                  Register as Patient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Doctor Portal */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-gray-700 shadow-lg overflow-hidden bg-gray-900">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-green-600 to-green-700 p-8 text-white">
                <Shield className="h-12 w-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">For Doctors</h3>
                <p className="text-green-100">Professional medical care and patient management</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Review and manage patient health records</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Communicate directly with patients via chat</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Monitor patient symptoms and progress</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Provide medical advice and treatment plans</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Access patient analytics and health data</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleDoctorAccess}
                >
                  Doctor Access
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Healthcare Provider Portal */}
          <Card className="group hover:shadow-xl transition-all duration-300 border-gray-700 shadow-lg overflow-hidden bg-gray-900">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-8 text-white">
                <Stethoscope className="h-12 w-12 mb-4" />
                <h3 className="text-2xl font-bold mb-2">For Providers (Pharmacy)</h3>
                <p className="text-purple-100">Professional healthcare tools</p>
              </div>
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Access patient health profiles</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Prescribe and manage medications</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Coordinate with care teams</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Monitor chronic condition progress</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-gray-300">Secure communication platform</span>
                  </li>
                </ul>
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={handleProviderPortal}
                >
                  Provider (Pharmacy) Portal
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
