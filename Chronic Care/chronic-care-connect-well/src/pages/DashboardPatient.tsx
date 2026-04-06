import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import PatientHeader from "@/components/dashboard/PatientHeader";

const DashboardPatient = () => {
	const [activeSection, setActiveSection] = useState("health");

	return (
		<div className="min-h-screen bg-background">
			<SidebarProvider>
				<DashboardSidebar 
					activeSection={activeSection} 
					setActiveSection={setActiveSection} 
				/>
				<SidebarInset className="bg-background flex flex-col min-h-screen overflow-x-hidden">
					<PatientHeader />
					<div className="flex-1 p-2 sm:p-4 md:p-6">
						<DashboardContent activeSection={activeSection} setActiveSection={setActiveSection} />
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
};

export default DashboardPatient;
