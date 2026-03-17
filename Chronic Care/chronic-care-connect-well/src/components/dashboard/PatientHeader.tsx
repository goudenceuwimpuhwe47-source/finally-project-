import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PatientHeader() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const role = (user?.role || '').toString().toLowerCase();
	const dashPath = role === 'provider' ? '/provider' : role === 'doctor' ? '/doctor' : role === 'admin' ? '/admin' : '/dashboard';
	return (
		<header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="bg-green-600 p-2 rounded-md">
					<svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>
				</div>
				<h2 className="text-white font-bold">Patient Dashboard</h2>
			</div>
			<div className="flex items-center gap-3">
				<Button variant="outline" size="sm" onClick={() => navigate('/')}>Home</Button>
				<Button variant="outline" size="sm" onClick={() => navigate(dashPath)}>Dashboard</Button>
				<div className="text-gray-300">{user ? `${user.username} • ${user.role}` : 'Loading...'}</div>
			</div>
		</header>
	);
}
