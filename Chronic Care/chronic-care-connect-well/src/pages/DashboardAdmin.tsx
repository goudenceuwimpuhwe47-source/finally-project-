import React, { useState } from 'react';
import AdminFooter from '../components/dashboard/AdminFooter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboard } from '@/components/admin/sections/AdminDashboard';
import { AdminOrders } from '@/components/admin/sections/AdminOrders';
import { AdminPatients } from '@/components/admin/sections/AdminPatients';
import { AdminProviders } from '@/components/admin/sections/AdminProviders';
import { AdminPharmacies } from '@/components/admin/sections/AdminPharmacies';
import { AdminInventory } from '@/components/admin/sections/AdminInventory';
import { AdminReports } from '@/components/admin/sections/AdminReports';
import { AdminNotifications } from '@/components/admin/sections/AdminNotifications';
import { AdminSettings } from '@/components/admin/sections/AdminSettings';
import { AdminChat } from '@/components/admin/sections/AdminChat';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import LogoutConfirm from '@/components/dashboard/LogoutConfirm';
import { useNavigate } from 'react-router-dom';

export default function DashboardAdmin() {
	const [tab, setTab] = useState<string>('overview');
	const { user } = useAuth();
	const username = (user?.username || user?.email || 'Admin') as string;
	const role = (user?.role || 'Admin').toString();
	const navigate = useNavigate();
	const dashPath = role.toLowerCase() === 'provider' ? '/provider' : role.toLowerCase() === 'doctor' ? '/doctor' : role.toLowerCase() === 'admin' ? '/admin' : '/dashboard';
	return (
		<>
			<main className="p-4">
				<h1 className="text-2xl font-bold">
					Admin Dashboard
					<span className="ml-2 text-sm font-normal text-gray-400">({username})</span>
				</h1>
				<p className="text-gray-400 mt-2">Welcome to the admin dashboard{username ? `, ${username}.` : '.'}</p>

				{/* Admin sections (added, non-destructive) */}
				<div className="mt-6">
								<Tabs value={tab} onValueChange={setTab} className="w-full">
									<TabsList className="bg-gray-800 border border-gray-700 w-full">
							<TabsTrigger value="overview">Overview</TabsTrigger>
							<TabsTrigger value="orders">Orders</TabsTrigger>
							<TabsTrigger value="patients">Patients</TabsTrigger>
							<TabsTrigger value="providers">Providers (Pharmacy)</TabsTrigger>
							<TabsTrigger value="pharmacies">Pharmacies</TabsTrigger>
							<TabsTrigger value="inventory">Inventory</TabsTrigger>
							<TabsTrigger value="reports">Reports</TabsTrigger>
							<TabsTrigger value="notifications">Notifications</TabsTrigger>
							<TabsTrigger value="settings">Settings</TabsTrigger>
							<TabsTrigger value="chat">Chat</TabsTrigger>
										<div className="ml-auto flex items-center gap-2 pl-2 border-l border-gray-700">
											<Button variant="outline" size="sm" onClick={() => navigate('/')}>Home</Button>
											<Button variant="outline" size="sm" onClick={() => navigate(dashPath)}>Dashboard</Button>
											<span className="text-sm text-gray-300 px-2 whitespace-nowrap">{username} • {role}</span>
											<LogoutConfirm />
										</div>
						</TabsList>

									<TabsContent value="overview" className="mt-4">
										<AdminDashboard />
									</TabsContent>
						<TabsContent value="orders" className="mt-4"><AdminOrders /></TabsContent>
						<TabsContent value="patients" className="mt-4"><AdminPatients /></TabsContent>
						<TabsContent value="providers" className="mt-4"><AdminProviders /></TabsContent>
						<TabsContent value="pharmacies" className="mt-4"><AdminPharmacies /></TabsContent>
						<TabsContent value="inventory" className="mt-4"><AdminInventory /></TabsContent>
						<TabsContent value="reports" className="mt-4"><AdminReports /></TabsContent>
						<TabsContent value="notifications" className="mt-4"><AdminNotifications /></TabsContent>
						<TabsContent value="settings" className="mt-4"><AdminSettings /></TabsContent>
						<TabsContent value="chat" className="mt-4"><AdminChat /></TabsContent>
					</Tabs>
				</div>
			</main>
			<AdminFooter />
		</>
	);
}
