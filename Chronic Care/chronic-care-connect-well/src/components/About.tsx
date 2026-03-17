import { Mail, Phone, School, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDownloadPdf } from "@/lib/useDownloadPdf";

const About = () => {
  const { download } = useDownloadPdf();
  return (
    <section id="about" className="py-16 bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">About This Project</h2>
          <p className="text-gray-300 mb-6">
            Chronic Care Connect Well is a Medication Ordering and Care Coordination system built as a Final Year Project.
          </p>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 text-left">
            <p className="text-gray-200"><span className="font-semibold">Student:</span> UWIMPUHWE Gaudence</p>
            <p className="text-gray-200"><span className="font-semibold">Faculty:</span> Faculty of Computing information sciences</p>
            <p className="text-gray-200"><span className="font-semibold">Department:</span> Department of software engineering</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <a href="mailto:goudenceuwimpuhwe47@gmail.com" className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
                <Mail className="h-4 w-4"/> goudenceuwimpuhwe47@gmail.com
              </a>
              <a href="tel:+250792369995" className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-100">
                <Phone className="h-4 w-4"/> +250 792369995
              </a>
              <Button onClick={() => download('about')} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
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
