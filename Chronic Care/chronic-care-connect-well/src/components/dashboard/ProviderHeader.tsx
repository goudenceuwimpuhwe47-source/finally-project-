import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ProviderHeader() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const role = (user?.role || '').toString().toLowerCase();
	const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';
	return (
		<header className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
			<div className="flex items-center gap-4">
				<div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
					<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7l3-7z" fill="currentColor"/></svg>
				</div>
				<div>
					<h2 className="text-slate-800 font-black uppercase tracking-tight text-lg">Pharmacy Command Center</h2>
					<p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">ChronicCare Network</p>
				</div>
			</div>
			<div className="flex items-center gap-4">
				<div className="hidden md:flex flex-col items-end mr-2">
					<span className="text-xs font-black text-slate-800">{user?.username}</span>
					<span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Authorized Provider</span>
				</div>
				<Button variant="ghost" size="sm" className="rounded-xl font-bold text-slate-500 hover:text-primary transition-all" onClick={() => navigate('/')}>Home</Button>
				<Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-6 rounded-xl shadow-lg shadow-slate-900/20" onClick={() => navigate(dashPath)}>Portal</Button>
			</div>
		</header>
	);
}
