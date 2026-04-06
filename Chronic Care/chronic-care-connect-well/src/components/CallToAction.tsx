
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CallToAction = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = (user?.role || '').toString().toLowerCase();
  const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';

  const handleStartJourney = () => {
    if (user) {
  navigate(dashPath);
      toast.success("Welcome to your dashboard!");
    } else {
      navigate('/auth');
      toast.info("Let's get you started with your chronic care journey!");
    }
  };

  const handleContactSales = () => {
    toast.info("Contact: +250 792369995 • goudenceuwimpuhwe47@gmail.com");
  };

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-primary shadow-inner">
      <div className="container mx-auto px-4">
        <div className="text-center text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 px-4">
            Ready to Transform Your Chronic Care Experience?
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-primary-foreground/90 max-w-2xl mx-auto px-4 font-medium italic">
            A final year project providing a practical medication ordering and care coordination system.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 sm:mb-12 px-4 font-bold">
            <Button 
              size="lg" 
              className="bg-background text-primary hover:bg-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto shadow-xl transition-all"
              onClick={handleStartJourney}
            >
              Start Your Journey
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto transition-all"
              onClick={handleContactSales}
            >
              <Phone className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Contact Sales
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground/80 flex-shrink-0" />
              <span className="text-sm sm:text-base text-primary-foreground/90 font-medium italic">HIPAA Compliant</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground/80 flex-shrink-0" />
              <span className="text-sm sm:text-base text-primary-foreground/90 font-medium italic">24/7 Support</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground/80 flex-shrink-0" />
              <span className="text-sm sm:text-base text-primary-foreground/90 font-medium italic">Free Setup</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
