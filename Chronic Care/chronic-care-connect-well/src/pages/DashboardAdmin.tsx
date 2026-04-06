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
		<div className="min-h-screen bg-slate-50 flex flex-col font-sans">
			{/* Admin Header */}
			<header className="border-b border-border bg-white/80 backdrop-blur-xl sticky top-0 z-30 px-4 py-4 shadow-sm">
				<div className="max-w-[1600px] mx-auto flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
							<LayoutDashboard className="h-5 w-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-black text-foreground hidden sm:block tracking-tight uppercase text-xs opacity-40">Command Center</h1>
							<div className="flex items-center gap-3">
								<span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full uppercase tracking-widest">
									{username}
								</span>
								<span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{role}</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="hidden md:flex items-center gap-2 mr-4 pr-4 border-r border-border">
							<Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
								<Home className="h-4 w-4 mr-2" />
								Home
							</Button>
							<Button variant="ghost" size="sm" onClick={() => navigate(dashPath)} className="text-muted-foreground hover:text-foreground">
								<LayoutDashboard className="h-4 w-4 mr-2" />
								Portal
							</Button>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="rounded-2xl bg-slate-100 border border-border shadow-sm hover:bg-slate-200 transition-all">
									<UserIcon className="h-5 w-5 text-slate-600" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-64 bg-white border-border text-foreground shadow-2xl rounded-2xl p-2 ring-1 ring-black/[0.05]">
								<DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-muted-foreground px-3 py-2">Administrator Session</DropdownMenuLabel>
								<DropdownMenuSeparator className="bg-slate-100 my-2" />
								<DropdownMenuItem onClick={() => navigate('/')} className="rounded-xl font-bold text-sm h-11 px-3 hover:bg-slate-50 cursor-pointer transition-colors">
									<Home className="h-4 w-4 mr-3 text-slate-400" /> Landing Page
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => navigate(dashPath)} className="rounded-xl font-bold text-sm h-11 px-3 hover:bg-slate-50 cursor-pointer transition-colors">
									<LayoutDashboard className="h-4 w-4 mr-3 text-slate-400" /> Control Panel
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-slate-100 my-2" />
								<div className="px-2 py-1.5 flex items-center">
									<LogoutConfirm />
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</header>

			<main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1600px] mx-auto w-full">
				<div className="mb-8 p-6 bg-white border border-border shadow-sm rounded-3xl flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-black text-slate-800 tracking-tight">System Overview</h2>
						<p className="text-muted-foreground text-sm font-medium mt-1">Operational status: <span className="text-emerald-600 font-bold">OPTIMAL</span> • Welcome back, {username}.</p>
					</div>
					<div className="hidden lg:flex items-center gap-3">
						<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
						<span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mainframe Synchronized</span>
					</div>
				</div>

				<div className="mt-8">
					<Tabs value={tab} onValueChange={setTab} className="w-full space-y-8">
						<div className="relative">
							<ScrollArea className="w-full">
								<TabsList className="bg-slate-100/50 border border-border/50 h-auto p-1.5 flex justify-start gap-1 rounded-2xl">
									<TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Overview</TabsTrigger>
									<TabsTrigger value="orders" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Orders</TabsTrigger>
									<TabsTrigger value="patients" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Patients</TabsTrigger>
									<TabsTrigger value="providers" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Doctors</TabsTrigger>
									<TabsTrigger value="pharmacies" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Pharmacies</TabsTrigger>
									<TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Inventory</TabsTrigger>
									<TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Reports</TabsTrigger>
									<TabsTrigger value="notifications" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Alerts</TabsTrigger>
									<TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Config</TabsTrigger>
									<TabsTrigger value="chat" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg shadow-black/[0.05] text-[11px] font-black uppercase tracking-widest text-muted-foreground px-5 py-3 rounded-xl transition-all whitespace-nowrap">Chat</TabsTrigger>
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
