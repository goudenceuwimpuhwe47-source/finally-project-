import { Mail, Phone, School, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadPdf } from "@/lib/useDownloadPdf";

const About = () => {
  const { download } = useDownloadPdf();
  return (
    <section id="about" className="py-16 bg-secondary/30 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">About This Project</h2>
          <p className="text-muted-foreground mb-6 font-medium">
            Chronic Care Connect Well is a Medication Ordering and Care Coordination system built as a Final Year Project.
          </p>
          <div className="bg-card rounded-xl p-6 border border-border text-left shadow-sm">
            <p className="text-foreground"><span className="font-bold text-primary">Student:</span> UWIMPUHWE Gaudence</p>
            <p className="text-foreground"><span className="font-bold text-primary">Faculty:</span> Faculty of Computing information sciences</p>
            <p className="text-foreground"><span className="font-bold text-primary">Department:</span> Department of software engineering</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <a href="mailto:goudenceuwimpuhwe47@gmail.com" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white transition-all shadow-md shadow-primary/20">
                <Mail className="h-4 w-4"/> goudenceuwimpuhwe47@gmail.com
              </a>
              <a href="tel:+250792369995" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-all shadow-sm">
                <Phone className="h-4 w-4"/> +250 792369995
              </a>
              <Button onClick={() => download('about')} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md shadow-green-100">
                <Download className="h-4 w-4"/> Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
