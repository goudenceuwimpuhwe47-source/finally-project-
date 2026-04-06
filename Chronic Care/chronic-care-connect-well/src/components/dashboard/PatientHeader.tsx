import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';

export default function PatientHeader() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const role = (user?.role || '').toString().toLowerCase();
	const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';
	return (
		<header className="bg-card border-b border-border p-3 md:p-4 flex items-center justify-between sticky top-0 z-10">
			<div className="flex items-center gap-2 md:gap-3">
				<SidebarTrigger className="md:hidden text-foreground hover:bg-accent" />
				<div className="bg-green-600 p-1.5 md:p-2 rounded-md hidden xs:block">
					<svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>
				</div>
				<h2 className="text-foreground font-bold">Patient Dashboard</h2>
			</div>
			<div className="flex items-center gap-2 md:gap-3">
				<Button variant="outline" size="sm" onClick={() => navigate('/')} className="hidden sm:inline-flex">Home</Button>
				<Button variant="outline" size="sm" onClick={() => navigate(dashPath)} className="hidden sm:inline-flex">Dashboard</Button>
				<div className="text-muted-foreground text-xs md:text-sm truncate max-w-[120px] md:max-w-none">
					{user ? `${user.username}` : 'Loading...'}
				</div>
			</div>
		</header>
	);
}
