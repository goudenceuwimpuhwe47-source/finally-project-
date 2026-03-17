
import { MessageSquare } from "lucide-react";

export const EmptyChat = () => {
  return (
    <div className="text-center text-gray-400">
      <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">Select a patient to start chatting</h3>
      <p className="text-sm">Choose a patient from the list to begin the conversation</p>
    </div>
  );
};
