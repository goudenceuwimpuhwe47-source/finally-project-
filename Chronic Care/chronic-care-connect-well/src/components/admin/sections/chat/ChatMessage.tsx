import { useState } from "react";
import { ChatMessage as ChatMessageType } from "../AdminChat";
import { MoreVertical, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const [isHidden, setIsHidden] = useState(false);
  if (isHidden) return null;

  return (
    <div className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'} mb-6 group animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`relative max-w-[85%] lg:max-w-md px-6 py-4 rounded-[28px] border shadow-sm transition-all duration-200 hover:shadow-md ${
        message.sender === 'admin'
          ? 'bg-primary border-primary/10 text-white rounded-tr-none ml-12 shadow-lg shadow-primary/10'
          : 'bg-white border-slate-100 text-slate-800 rounded-tl-none mr-12'
      }`}>
        <p className="text-[14px] font-medium leading-relaxed tracking-tight select-text">{message.message}</p>
        <div className="flex items-center justify-between gap-6 mt-3 border-t border-black/5 pt-2 opacity-60">
          <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {message.timestamp}
          </p>
          {message.sender === 'admin' && (
            <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
              {message.status === 'read' ? 'Seen' : 'Sent'}
            </span>
          )}
        </div>

        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full border border-slate-100 shadow-xl bg-white/90 backdrop-blur-md text-slate-500 hover:text-primary">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-slate-100 rounded-xl shadow-xl">
              <DropdownMenuItem 
                className="text-red-600 focus:text-red-700 focus:bg-red-50 font-bold uppercase text-[9px] tracking-widest cursor-pointer"
                onClick={() => setIsHidden(true)}
              >
                Clear Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
