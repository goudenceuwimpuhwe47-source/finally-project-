import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import PatientHeader from "@/components/dashboard/PatientHeader";

const DashboardPatient = () => {
	const [activeSection, setActiveSection] = useState("health");

	return (
		<div className="min-h-screen bg-gray-900">
			<SidebarProvider>
				<div className="flex w-full min-h-screen">
					<DashboardSidebar 
						activeSection={activeSection} 
						setActiveSection={setActiveSection} 
					/>
								<main className="flex-1 overflow-x-auto flex flex-col">
									<PatientHeader />
									<div className="flex-1">
										<DashboardContent activeSection={activeSection} setActiveSection={setActiveSection} />
									</div>
								</main>
				</div>
			</SidebarProvider>
		</div>
	);
};

export default DashboardPatient;
