
import { MyHealthSection } from "./sections/MyHealthSection";
import { MedicationsSection } from "./sections/MedicationsSection";
import { RequestMedicationSection } from "./sections/RequestMedicationSection";
import { MyRequestsSection } from "./sections/MyRequestsSection";
import { ChatSection } from "./sections/ChatSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { PatientAlertsSection } from "./sections/PatientAlertsSection";
import { ProfileSection } from "./sections/ProfileSection";

interface DashboardContentProps {
  activeSection: string;
  setActiveSection?: (section: string) => void;
}

export function DashboardContent({ activeSection, setActiveSection }: DashboardContentProps) {
  const renderContent = () => {
    switch (activeSection) {
      case "health":
        return <MyHealthSection />;
      case "medications":
        return (
          <MedicationsSection
            onRequestMedication={() => setActiveSection && setActiveSection("request-medication")}
          />
        );
      case "request-medication":
        return <RequestMedicationSection setActiveSection={setActiveSection} />;
      case "my-requests":
        return <MyRequestsSection setActiveSection={setActiveSection} />;
      case "chat-admin":
        return <ChatSection to="admin" />;
      case "chat-doctor":
        return <ChatSection to="doctor" />;
      case "chat-pharmacy":
        return <ChatSection to="pharmacy" />;
      case "notifications":
        return <NotificationsSection />;
      case "alerts":
        return <PatientAlertsSection />;
      case "profile":
        return <ProfileSection />;
      default:
        return <MyHealthSection />;
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-background rounded-xl shadow-inner min-h-full">
      {renderContent()}
    </div>
  );
}
