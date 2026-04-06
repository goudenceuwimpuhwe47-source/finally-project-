import React, { useState } from 'react';
import ProviderHeader from '../components/dashboard/ProviderHeader';
import ProviderFooter from '../components/dashboard/ProviderFooter';
import { ProviderSidebar } from '@/components/provider/ProviderSidebar';
import { ProviderContent } from '@/components/provider/ProviderContent';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function DashboardProvider() {
	const [activeSection, setActiveSection] = useState<string>('patients');
	return (
		<div className="min-h-screen bg-slate-50/50">
			<ProviderHeader />
			<main className="p-0">
				<SidebarProvider>
					<div className="flex w-full min-h-[calc(100vh-140px)]">
						<ProviderSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
						<div className="flex-1">
							<ProviderContent activeSection={activeSection} />
						</div>
					</div>
				</SidebarProvider>
			</main>
			<ProviderFooter />
		</div>
	);
}
