
import { ChatMessage as ChatMessageType } from "../AdminChat";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`max-w-[85%] lg:max-w-md px-6 py-4 rounded-[28px] border shadow-sm transition-all duration-200 hover:shadow-md ${
        message.sender === 'admin'
          ? 'bg-primary border-primary/10 text-white rounded-tr-none ml-12'
          : 'bg-white border-slate-100 text-slate-800 rounded-tl-none mr-12'
      }`}>
        <p className="text-sm font-bold leading-relaxed">{message.message}</p>
        <div className="flex items-center justify-between gap-6 mt-3 border-t border-black/5 pt-2 opacity-60">
          <p className="text-[9px] font-black uppercase tracking-widest">
            {message.timestamp}
          </p>
          {message.sender === 'admin' && (
            <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
              {message.status === 'read' ? 'Manifest Seen' : 'Transmitted'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
