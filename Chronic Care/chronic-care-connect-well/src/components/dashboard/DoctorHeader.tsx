import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function DoctorHeader() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const role = (user?.role || '').toString().toLowerCase();
	const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';
	return (
		<header className="bg-white/90 backdrop-blur-md border-b border-slate-100 p-4 sticky top-0 z-50 flex items-center justify-between shadow-sm">
			<div className="flex items-center gap-4">
				<div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
					<svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor"/></svg>
				</div>
				<h2 className="text-slate-800 font-black tracking-tight text-xl uppercase">Doctor</h2>
			</div>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-slate-500 font-bold hover:bg-slate-50 rounded-xl px-4">Home</Button>
									<Button variant="secondary" size="sm" onClick={() => navigate(dashPath)} className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-widest px-6 h-10 rounded-xl border border-slate-200/50 shadow-sm transition-all hover:bg-slate-200">Dashboard</Button>
								</div>
								<div className="h-8 w-[1px] bg-slate-100 mx-2" />
								<div className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
									{user ? `${user.username} • Clinical Lead` : 'Initializing Telemetry...'}
								</div>
							</div>
		</header>
	);
}
