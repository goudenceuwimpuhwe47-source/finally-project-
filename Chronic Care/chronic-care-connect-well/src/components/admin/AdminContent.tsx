
import { AdminDashboard } from "./sections/AdminDashboard";
import { AdminPatients } from "./sections/AdminPatients";
import { AdminProviders } from "./sections/AdminProviders";
import { AdminPharmacies } from "./sections/AdminPharmacies";
import { AdminOrders } from "./sections/AdminOrders";
import { AdminInventory } from "./sections/AdminInventory";
import { AdminNotifications } from "./sections/AdminNotifications";
import { AdminReports } from "./sections/AdminReports";
import { AdminSettings } from "./sections/AdminSettings";
import { AdminChat } from "./sections/AdminChat";

interface AdminContentProps {
  activeSection: string;
}

export const AdminContent = ({ activeSection }: AdminContentProps) => {
  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard />;
      case "patients":
        return <AdminPatients />;
      case "providers":
        return <AdminProviders />;
      case "pharmacies":
        return <AdminPharmacies />;
      case "orders":
        return <AdminOrders />;
      case "inventory":
        return <AdminInventory />;
      case "chat":
        return <AdminChat />;
      case "notifications":
        return <AdminNotifications />;
      case "reports":
        return <AdminReports />;
      case "settings":
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      {renderContent()}
    </div>
  );
};
