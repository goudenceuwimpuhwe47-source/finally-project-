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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Menu, Home, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardAdmin() {
	const [tab, setTab] = useState<string>('overview');
	const { user } = useAuth();
	const username = (user?.username || user?.email || 'Admin') as string;
	const role = (user?.role || 'Admin').toString();
	const navigate = useNavigate();
	const dashPath = role.toLowerCase() === 'provider' ? '/provider' : role.toLowerCase() === 'doctor' ? '/doctor' : role.toLowerCase() === 'admin' ? '/admin' : '/dashboard';
	return (
		<div className="min-h-screen bg-gray-900 flex flex-col">
			{/* Admin Header */}
			<header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-30 px-4 py-3">
				<div className="max-w-[1600px] mx-auto flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="bg-blue-600 p-2 rounded-lg">
							<LayoutDashboard className="h-5 w-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-white hidden sm:block">Admin Dashboard</h1>
							<div className="flex items-center gap-2">
								<span className="text-xs text-blue-400 font-medium px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
									{username}
								</span>
								<span className="text-[10px] text-gray-500 uppercase tracking-wider">{role}</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="hidden md:flex items-center gap-2 mr-4 pr-4 border-r border-gray-800">
							<Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
								<Home className="h-4 w-4 mr-2" />
								Home
							</Button>
							<Button variant="ghost" size="sm" onClick={() => navigate(dashPath)} className="text-gray-400 hover:text-white">
								<LayoutDashboard className="h-4 w-4 mr-2" />
								Portal
							</Button>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="rounded-full bg-gray-800 border border-gray-700">
									<UserIcon className="h-5 w-5 text-gray-400" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56 bg-gray-800 border-gray-700 text-white">
								<DropdownMenuLabel>Account Settings Settings</DropdownMenuLabel>
								<DropdownMenuSeparator className="bg-gray-700" />
								<DropdownMenuItem onClick={() => navigate('/')} className="hover:bg-gray-700 cursor-pointer">
									<Home className="h-4 w-4 mr-2" /> Home
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => navigate(dashPath)} className="hover:bg-gray-700 cursor-pointer">
									<LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-gray-700" />
								<div className="px-2 py-1.5 flex items-center">
									<LogoutConfirm />
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</header>

			<main className="flex-1 p-2 sm:p-4 md:p-6 max-w-[1600px] mx-auto w-full">
				<div className="mb-6">
					<p className="text-gray-400 text-sm">Welcome back, {username}. Managed clinical data and platform settings.</p>
				</div>

				<div className="mt-6">
					<Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
						<div className="relative border-b border-gray-800">
							<ScrollArea className="w-full">
								<TabsList className="bg-transparent border-none h-auto p-0 flex justify-start gap-1 pb-2">
									<TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Overview</TabsTrigger>
									<TabsTrigger value="orders" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Orders</TabsTrigger>
									<TabsTrigger value="patients" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Patients</TabsTrigger>
									<TabsTrigger value="providers" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Doctors</TabsTrigger>
									<TabsTrigger value="pharmacies" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Pharmacies</TabsTrigger>
									<TabsTrigger value="inventory" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Inventory</TabsTrigger>
									<TabsTrigger value="reports" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Reports</TabsTrigger>
									<TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Notifications</TabsTrigger>
									<TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Settings</TabsTrigger>
									<TabsTrigger value="chat" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-4 py-2 rounded-md transition-all whitespace-nowrap">Chat</TabsTrigger>
								</TabsList>
								<ScrollBar orientation="horizontal" className="invisible" />
							</ScrollArea>
						</div>

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
		</div>
	);
}
