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
		<div className="min-h-screen bg-slate-100/40 flex flex-col font-sans selection:bg-primary/10">
			{/* Admin Header */}
			<header className="border-b border-slate-200/60 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-4 py-4 shadow-sm">
				<div className="max-w-[1600px] mx-auto flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
							<LayoutDashboard className="h-5 w-5 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-black text-slate-400 hidden sm:block tracking-tight uppercase text-[10px] opacity-60">Operations Center</h1>
							<div className="flex items-center gap-3">
								<span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full uppercase tracking-widest border border-primary/5">
									{username}
								</span>
								<span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{role} Status</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="hidden md:flex items-center gap-2 mr-4 pr-4 border-r border-slate-200">
							<Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-500 hover:text-primary hover:bg-primary/5 font-bold rounded-xl transition-all">
								<Home className="h-4 w-4 mr-2" />
								Home
							</Button>
							<Button variant="ghost" size="sm" onClick={() => navigate(dashPath)} className="text-slate-500 hover:text-primary hover:bg-primary/5 font-bold rounded-xl transition-all">
								<LayoutDashboard className="h-4 w-4 mr-2" />
								Portal
							</Button>
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95">
									<UserIcon className="h-5 w-5 text-slate-600" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-64 bg-white border-slate-200 text-slate-800 shadow-2xl rounded-2xl p-2 ring-1 ring-black/[0.05]">
								<DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-slate-400 px-3 py-2">Session Parameters</DropdownMenuLabel>
								<DropdownMenuSeparator className="bg-slate-100 my-2" />
								<DropdownMenuItem onClick={() => navigate('/')} className="rounded-xl font-bold text-sm h-11 px-3 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors">
									<Home className="h-4 w-4 mr-3 opacity-60" /> Gateway Node
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => navigate(dashPath)} className="rounded-xl font-bold text-sm h-11 px-3 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors">
									<LayoutDashboard className="h-4 w-4 mr-3 opacity-60" /> Command Panel
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
				<div className="mb-8 p-8 bg-white border border-slate-200/60 shadow-md shadow-slate-200/40 rounded-[32px] flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
					<div>
						<h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none">System Oversight</h2>
						<p className="text-slate-500 text-[11px] font-bold mt-3 uppercase tracking-wider flex items-center gap-2">
              Status: <span className="text-emerald-600 font-extrabold px-2 py-0.5 bg-emerald-50 rounded-lg">Operational</span> 
              <span className="text-slate-300">•</span>
              Identity: <span className="text-primary font-extrabold">{username}</span>
            </p>
					</div>
					<div className="hidden lg:flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
						<div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
						<span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Synchronized</span>
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
