
import { ProviderPatients } from "./sections/ProviderPatients";
import { ProviderPrescriptions } from "./sections/ProviderPrescriptions";
import { ProviderMonitoring } from "./sections/ProviderMonitoring";
import { ProviderCommunication } from "./sections/ProviderCommunication";
import { ProviderReports } from "./sections/ProviderReports";
import { ProviderSettings } from "./sections/ProviderSettings";
import { ProviderAssigned } from "./sections/ProviderAssigned";
import { ProviderStock } from "./sections/ProviderStock";

interface ProviderContentProps {
  activeSection: string;
}

export const ProviderContent = ({ activeSection }: ProviderContentProps) => {
  const renderContent = () => {
    switch (activeSection) {
      case "patients":
        return <ProviderPatients />;
      case "assigned":
        return <ProviderAssigned />;
      case "stock":
        return <ProviderStock />;
      case "prescriptions":
        return <ProviderPrescriptions />;
      case "monitoring":
        return <ProviderMonitoring />;
      case "communication":
        return <ProviderCommunication />;
      case "reports":
        return <ProviderReports />;
      case "settings":
        return <ProviderSettings />;
      default:
        return <ProviderPatients />;
    }
  };

  return (
    <div className="p-10 bg-slate-50/50 text-slate-800 min-h-screen transition-all duration-500">
      <div className="max-w-[1600px] mx-auto">
        {renderContent()}
      </div>
      <footer className="bg-white border-t border-slate-100 p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        © {new Date().getFullYear()} ChronicCare Network — Secure Provider Distribution Area
      </footer>
    </div>
  );
};
