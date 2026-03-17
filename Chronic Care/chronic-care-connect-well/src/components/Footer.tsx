
import { Heart, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

const Footer = () => {
  const handleLinkClick = (section: string) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      toast.info(`${section} section coming soon!`);
    }
  };

  const handleSupportClick = (type: string) => {
    switch (type) {
      case 'help':
        toast.info("Help Center: Visit our FAQ section or contact support");
        break;
      case 'patient':
        toast.info("Patient Portal: Sign in to access your dashboard");
        break;
      case 'provider':
        toast.info("Provider (Pharmacy) Resources: Contact us for provider documentation");
        break;
      case 'technical':
        toast.info("Technical Support: Email tech@chroniccare.com or call 1-800-CHRONIC");
        break;
      case 'emergency':
        toast.error("Emergency: Call 911 for medical emergencies");
        break;
      default:
        toast.info("More information coming soon!");
    }
  };

  return (
    <footer id="contact" className="bg-gray-900 text-white py-16 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold">Chronic Care Connect Well</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Medication Ordering and Care Coordination system for chronic care management.
            </p>
            <div className="space-y-3">
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => toast.info("Email us at medicationorderingsystemforchr@gmail.com")}
              >
                <Mail className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300">medicationorderingsystemforchr@gmail.com</span>
              </div>
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => toast.info("Call: +250 786 500 175")}
              >
                <Phone className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300">+250 786 500 175</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-blue-400" />
                <span className="text-gray-300">RP-College Ngoma</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => handleLinkClick('features')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('services')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Services
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('about')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => toast.info("Privacy Policy: We protect your data with HIPAA compliance")}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => toast.info("Terms of Service: Project terms and conditions")}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => handleSupportClick('help')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSupportClick('patient')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Patient Portal
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSupportClick('provider')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Provider (Pharmacy) Resources
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSupportClick('technical')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Technical Support
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSupportClick('emergency')}
                  className="text-gray-400 hover:text-white transition-colors text-left"
                >
                  Emergency Contact
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">© {new Date().getFullYear()} Byenvenue Fabrice — Chronic Care Connect Well (FYP).</p>
            <div className="flex space-x-6">
              <button 
                onClick={() => toast.info("HIPAA Compliant: Your health data is fully protected")}
                className="text-gray-400 hover:text-white transition-colors"
              >
                HIPAA Compliant
              </button>
              <button 
                onClick={() => toast.info("Student Project: RP-College Ngoma, IT Year 3")}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Student Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
