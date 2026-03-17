
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
    <div className="flex space-x-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a reply..."
        className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
        onKeyPress={handleKeyPress}
      />
      <Button
        onClick={onSend}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};
