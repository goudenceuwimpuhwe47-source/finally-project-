
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Patient } from "../AdminChat";

interface ChatHeaderProps {
  patient: Patient;
  onBack: () => void;
  typing?: boolean;
  online?: boolean;
}

export const ChatHeader = ({ patient, onBack, typing, online }: ChatHeaderProps) => {
  const isOnline = online !== undefined ? online : patient.status === 'online';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="lg:hidden text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl h-10 w-10 p-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-12 w-12 shadow-sm border-2 border-white ring-1 ring-slate-100">
            <AvatarFallback className="bg-primary text-white font-black">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
        </div>
        <div>
          <h3 className="font-black text-slate-800 tracking-tight leading-none">{patient.name}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5 flex items-center gap-2">
            {typing ? (
              <>
                <div className="flex gap-0.5 items-center">
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-75" />
                  <div className="w-1 h-1 bg-primary rounded-full animate-bounce delay-150" />
                </div>
                Typing Signal
              </>
            ) : (
              isOnline ? 'Active Connection' : 'Station Offline'
            )}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl h-10 w-10 p-0 transform transition-transform active:rotate-90">
        <MoreVertical className="h-5 w-5" />
      </Button>
    </div>
  );
};
