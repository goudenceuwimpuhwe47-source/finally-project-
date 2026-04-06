import React, { useState } from 'react';
import DoctorHeader from '../components/dashboard/DoctorHeader';
import DoctorFooter from '../components/dashboard/DoctorFooter';
import { SidebarProvider } from '@/components/ui/sidebar';
import DoctorSidebar from '@/components/doctor/DoctorSidebar';
import DoctorContent from '@/components/doctor/DoctorContent';

export default function DashboardDoctor() {
	const [activeSection, setActiveSection] = useState('assigned');
	return (
		<>
			<DoctorHeader />
			<div className="min-h-screen bg-slate-50/50">
				<SidebarProvider>
					<div className="flex w-full min-h-screen">
						<DoctorSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
						<main className="flex-1 overflow-x-auto">
							<DoctorContent activeSection={activeSection} setActiveSection={setActiveSection} />
						</main>
					</div>
				</SidebarProvider>
			</div>
			<DoctorFooter />
		</>
	);
}
