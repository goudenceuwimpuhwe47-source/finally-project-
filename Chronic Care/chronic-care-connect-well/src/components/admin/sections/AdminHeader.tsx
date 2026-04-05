
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Crown } from 'lucide-react';

export default function AdminHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-gray-800 border-b border-gray-700 p-3 md:p-4 flex items-center justify-between sticky top-0 z-10 w-full">
      <div className="flex items-center gap-2 md:gap-3">
        <SidebarTrigger className="md:hidden text-white hover:bg-gray-700" />
        <div className="bg-purple-600 p-1.5 md:p-2 rounded-md hidden xs:block">
          <Crown className="h-5 w-5 md:h-6 md:w-6 text-white" />
        </div>
        <h2 className="text-white font-bold text-sm md:text-base">Admin Dashboard</h2>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="hidden sm:inline-flex text-xs md:text-sm">Home</Button>
        <div className="text-gray-300 text-xs md:text-sm truncate max-w-[100px] md:max-w-none">
          {user ? `${user.username}` : 'Admin'}
        </div>
        <div className="bg-gray-700 px-2 py-0.5 rounded text-[10px] md:text-xs text-purple-300 border border-purple-500/30 hidden xs:block">
          PRO
        </div>
      </div>
    </header>
  );
}
