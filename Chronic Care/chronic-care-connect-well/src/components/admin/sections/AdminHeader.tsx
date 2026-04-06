
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
    <header className="bg-white/80 backdrop-blur-xl border-b border-border p-4 md:p-6 flex items-center justify-between sticky top-0 z-10 w-full shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden text-slate-400 hover:bg-slate-50 rounded-xl p-2" />
        <div className="bg-primary/10 p-2.5 rounded-2xl hidden xs:block shadow-inner ring-1 ring-primary/5">
          <Crown className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        </div>
        <h2 className="text-slate-800 font-black text-sm md:text-xl tracking-tight">Executive Terminal</h2>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="hidden sm:inline-flex text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary hover:bg-primary/5 rounded-xl px-5 h-10">Return Home</Button>
        <div className="text-slate-600 font-bold text-xs md:text-sm truncate max-w-[100px] md:max-w-none px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
          {user ? `${user.username}` : 'Operator'}
        </div>
        <div className="bg-primary/5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-primary border border-primary/10 hidden xs:block uppercase">
          Cloud Core
        </div>
      </div>
    </header>
  );
}
