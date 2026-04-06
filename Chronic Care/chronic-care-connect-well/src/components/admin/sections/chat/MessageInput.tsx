
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export const MessageInput = ({ value, onChange, onSend }: MessageInputProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSend();
    }
  };

  return (
    <div className="flex space-x-3 items-center">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Manifest secure response..."
        className="flex-1 h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl shadow-inner focus:ring-primary/40 focus:border-primary placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
        onKeyPress={handleKeyPress}
      />
      <Button
        onClick={onSend}
        className="h-14 w-14 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 group shrink-0"
      >
        <Send className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
      </Button>
    </div>
  );
};
