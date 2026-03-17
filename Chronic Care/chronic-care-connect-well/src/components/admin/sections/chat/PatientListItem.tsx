
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
      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-700 ${
        isSelected ? 'bg-blue-600' : 'bg-gray-700'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
            patient.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-white truncate">{patient.name}</p>
            {patient.unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {patient.unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 truncate">{patient.lastMessage}</p>
        </div>
      </div>
    </div>
  );
};
