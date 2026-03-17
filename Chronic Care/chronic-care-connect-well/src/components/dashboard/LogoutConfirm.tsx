import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

type BtnVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type BtnSize = 'default' | 'sm' | 'lg' | 'icon';

export default function LogoutConfirm({ 
	triggerClassName = '',
	label = 'Logout',
	icon,
	variant = 'ghost',
	size = 'sm',
	fullWidth = false,
}: { 
	triggerClassName?: string;
	label?: string;
	icon?: React.ReactNode;
	variant?: BtnVariant;
	size?: BtnSize;
	fullWidth?: boolean;
}) {
	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);

	const onConfirm = async () => {
		await signOut();
		setOpen(false);
		navigate('/auth');
	};

	const role = user?.role ?? 'User';
	const username = user?.username ?? '';

		return (
		<>
				<Button 
					variant={variant} 
					size={size} 
					className={`${triggerClassName} ${fullWidth ? 'w-full' : ''}`} 
					onClick={() => setOpen(true)}
				>
					{icon ? <span className="mr-2 inline-flex items-center">{icon}</span> : null}
					{label}
				</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm logout</DialogTitle>
						<DialogDescription>
							Are you sure you want to log out, <strong>{username}</strong> (<strong>{role}</strong>)?
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 mt-4">
						<Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
						<Button variant="destructive" onClick={onConfirm}>Log out</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
