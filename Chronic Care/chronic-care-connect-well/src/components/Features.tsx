
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, MessageSquare, Pill, Users, Settings } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Shield,
      title: "Secure & Private",
      description: "HIPAA-compliant platform ensuring your medical data is always protected with end-to-end encryption."
    },
    {
      icon: MessageSquare,
      title: "Direct Communication",
      description: "Chat directly with healthcare administrators and providers (pharmacies) about your condition and medication needs."
    },
    {
      icon: Pill,
      title: "Medication Management",
      description: "Easy ordering system for chronic illness medications with automatic refill reminders."
    },
    {
      icon: Clock,
      title: "24/7 Access",
      description: "Access your health dashboard, order medications, and communicate with providers (pharmacies) anytime."
    },
    {
      icon: Users,
      title: "Provider (Pharmacy) Network",
      description: "Connect with a network of specialized healthcare providers (pharmacies) and chronic care specialists."
    },
    {
      icon: Settings,
      title: "Personalized Care",
      description: "Customizable dashboard to track symptoms, medication schedules, and health progress."
    }
  ];

  return (
    <section id="features" className="py-12 sm:py-16 lg:py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose ChronicCare?
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Our platform is designed specifically for chronic illness management, 
            providing tools and features that make your healthcare journey smoother.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border shadow-sm hover:-translate-y-1 bg-card">
              <CardContent className="p-6 sm:p-8">
                <div className="bg-primary/10 w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary transition-colors duration-300 mx-auto sm:mx-0">
                  <feature.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 text-center sm:text-left">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-center sm:text-left">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
