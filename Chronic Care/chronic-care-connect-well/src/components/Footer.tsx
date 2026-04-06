
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
    <footer id="contact" className="bg-background text-foreground py-16 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-primary p-2 rounded-lg">
                <Heart className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Chronic Care Connect Well</span>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md font-medium">
              Medication Ordering and Care Coordination system for chronic care management.
            </p>
            <div className="space-y-3">
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:text-primary transition-colors group"
                onClick={() => toast.info("Email us at goudenceuwimpuhwe47@gmail.com")}
              >
                <Mail className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-muted-foreground group-hover:text-foreground">goudenceuwimpuhwe47@gmail.com</span>
              </div>
              <div 
                className="flex items-center space-x-3 cursor-pointer hover:text-primary transition-colors group"
                onClick={() => toast.info("Call: +250 792369995")}
              >
                <Phone className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-muted-foreground group-hover:text-foreground">+250 792369995</span>
              </div>
              <div className="flex items-center space-x-3 group">
                <MapPin className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-muted-foreground group-hover:text-foreground">Software Engineering Department</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-foreground">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => handleLinkClick('features')}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Features
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('services')}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Services
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleLinkClick('about')}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => toast.info("Privacy Policy: We protect your data with HIPAA compliance")}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => toast.info("Terms of Service: Project terms and conditions")}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Terms of Service
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-foreground">Support</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => handleSupportClick('help')}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSupportClick('patient')}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Patient Portal
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSupportClick('provider')}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Provider (Pharmacy) Resources
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSupportClick('technical')}
                  className="text-muted-foreground hover:text-primary transition-colors text-left font-medium"
                >
                  Technical Support
                </button>
              </li>
              <li>
                <button 
                   onClick={() => handleSupportClick('emergency')}
                  className="text-destructive hover:text-destructive/80 transition-colors text-left font-bold"
                >
                  Emergency Contact
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm">
            <p className="text-muted-foreground mb-4 md:mb-0">© {new Date().getFullYear()} <span className="font-bold text-foreground">UWIMPUHWE Gaudence</span> — Chronic Care Connect Well (FYP).</p>
            <div className="flex space-x-6">
              <button 
                onClick={() => toast.info("HIPAA Compliant: Your health data is fully protected")}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                HIPAA Compliant
              </button>
              <button 
                onClick={() => toast.info("Student Project: Department of software engineering")}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
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
