import { MessageSquare } from "lucide-react";

export const EmptyChat = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
      <div className="w-20 h-20 bg-slate-50 rounded-[28px] border border-slate-100 flex items-center justify-center mb-8 shadow-sm transition-transform hover:scale-110">
        <MessageSquare className="h-10 w-10 text-slate-200" />
      </div>
      <h3 className="text-slate-800 text-lg font-black tracking-tight mb-2 capitalize">Encryption Established</h3>
      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-loose max-w-xs mx-auto text-center">Select a clinical node from the registry to initiate secure telemetry uplink.</p>
    </div>
  );
};
