
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
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      {renderContent()}
    </div>
  );
};
