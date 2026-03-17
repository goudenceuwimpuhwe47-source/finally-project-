
import { ChatMessage as ChatMessageType } from "../AdminChat";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
        message.sender === 'admin'
          ? 'bg-blue-600 text-white'
          : 'bg-orange-500 text-white'
      }`}>
        <p className="text-sm">{message.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className={`text-xs ${message.sender === 'admin' ? 'text-blue-200' : 'text-orange-200'}`}>
            {message.timestamp}
          </p>
          {message.sender === 'admin' && (
            <span className="text-[10px] opacity-80">
              {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
