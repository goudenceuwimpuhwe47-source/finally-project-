
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
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="lg:hidden text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {patient.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
              isOnline ? 'bg-green-500' : 'bg-gray-500'
            }`}
          />
        </div>
        <div>
          <h3 className="font-medium text-white">{patient.name}</h3>
          <p className="text-sm text-gray-400">
            {typing ? 'Typing…' : (isOnline ? 'Online' : 'Offline')}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
};
