
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Patient } from "../AdminChat";

interface PatientListItemProps {
  patient: Patient;
  isSelected: boolean;
  onClick: () => void;
}

export const PatientListItem = ({ patient, isSelected, onClick }: PatientListItemProps) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
        isSelected 
          ? 'bg-primary/5 border-primary/20 shadow-sm ring-1 ring-primary/5' 
          : 'bg-white border-transparent hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Avatar className="h-12 w-12 shadow-sm border-2 border-white ring-1 ring-slate-100">
            <AvatarFallback className="bg-primary text-white font-black text-sm">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
            patient.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`font-black tracking-tight truncate ${isSelected ? 'text-primary' : 'text-slate-800'}`}>{patient.name}</p>
            {patient.unreadCount > 0 && (
              <span className="bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 shadow-lg shadow-primary/20">
                {patient.unreadCount} NEW
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-bold truncate leading-none">{patient.lastMessage}</p>
        </div>
      </div>
    </div>
  );
};
