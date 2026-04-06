
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Key, User } from "lucide-react";
import { API_URL } from "@/lib/utils";

export const AdminSettings = () => {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [settings, setSettings] = useState<{ email_notifications_enabled?: boolean; backup_schedule_cron?: string; require_2fa?: boolean }>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const token = user?.token || localStorage.getItem('token') || '';
        const res = await fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
        const data = await res.json();
        setSettings(data.settings || {});
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load settings');
      } finally {
        setLoadingSettings(false);
      }
    };
    load();
  }, [user]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setUpdating(true);
    
    try {
      const token = user?.token || localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/users/me/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed (${res.status})`);
      }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Failed to update password: " + (error?.message || 'Unknown error'));
    } finally {
      setUpdating(false);
    }
  };

  const saveSettings = async () => {
    try {
      // Minimal client-side validation for cron text
      const cron = settings.backup_schedule_cron || '';
      if (cron && cron.trim() !== '') {
        const parts = cron.trim().split(/\s+/);
        if (parts.length !== 5 && parts.length !== 6) {
          toast.error('Invalid CRON format');
          return;
        }
      }
      setSaving(true);
      const token = user?.token || localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const body = await res.json().catch(() => ({}));
      if (body?.settings) setSettings(body.settings);
      toast.success('Settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Settings className="h-6 w-6 text-white" />
          </div>
          Executive Control
        </h1>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px]">
          Global Configuration
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center">
              <User className="h-5 w-5 mr-3 text-primary" />
              Identity Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Authorized Email
              </label>
              <Input
                value={user?.email || ""}
                disabled
                className="bg-slate-50 border-border text-slate-500 h-12 rounded-xl font-bold shadow-inner opacity-70"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Clinical Rank
              </label>
              <Input
                value="System Administrator"
                disabled
                className="bg-slate-50 border-border text-slate-500 h-12 rounded-xl font-bold shadow-inner opacity-70"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center">
              <Key className="h-5 w-5 mr-3 text-primary" />
              Secure Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Current Shield
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-slate-50 border-border text-foreground h-12 rounded-xl font-bold shadow-inner focus:ring-primary/40 focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  New Credential
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-50 border-border text-foreground h-12 rounded-xl font-bold shadow-inner focus:ring-primary/40 focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Re-Verify New Credential
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-50 border-border text-foreground h-12 rounded-xl font-bold shadow-inner focus:ring-primary/40 focus:border-primary"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={updating}
                className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/25 transition-all active:scale-95"
              >
                {updating ? "Re-Encrypting..." : "Commit Credential Change"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden lg:col-span-2">
          <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center">
              <Settings className="h-5 w-5 mr-3 text-primary" />
              Machine Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {loadingSettings ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-300 animate-pulse">
                <Settings className="h-12 w-12 mb-4" />
                <p className="font-black uppercase text-[10px] tracking-widest">Querying System States...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-slate-800 font-bold text-sm">SMTP Dispatch</span>
                      <span className="text-[10px] text-slate-400 font-bold">Email notification triggers</span>
                    </div>
                    <Button
                      variant={settings.email_notifications_enabled ? "default" : "outline"}
                      size="sm"
                      className={`font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl transition-all ${settings.email_notifications_enabled ? 'bg-primary shadow-lg shadow-primary/20' : 'border-slate-200 text-slate-400'}`}
                      onClick={() => setSettings(s => ({ ...s, email_notifications_enabled: !s.email_notifications_enabled }))}
                    >
                      {settings.email_notifications_enabled ? 'Active' : 'Muted'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-slate-800 font-bold text-sm">Biometric 2FA</span>
                      <span className="text-[10px] text-slate-400 font-bold">Enhanced security manifest</span>
                    </div>
                    <Button
                      variant={settings.require_2fa ? "default" : "outline"}
                      size="sm"
                      className={`font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl transition-all ${settings.require_2fa ? 'bg-emerald-600 shadow-lg shadow-emerald-200' : 'border-slate-200 text-slate-400'}`}
                      onClick={() => setSettings(s => ({ ...s, require_2fa: !s.require_2fa }))}
                    >
                      {settings.require_2fa ? 'Locked' : 'Standard'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Data Backup Cycle (CRON)</label>
                    <Input
                      value={settings.backup_schedule_cron || ''}
                      onChange={(e) => setSettings(s => ({ ...s, backup_schedule_cron: e.target.value }))}
                      className="bg-slate-50 border-border text-foreground h-12 rounded-xl font-bold shadow-inner focus:ring-primary/40 focus:border-primary"
                      placeholder="e.g. 0 2 * * *"
                    />
                    <p className="text-[9px] text-slate-400 font-bold px-1 italic">Reference standards: Precision scheduling for cloud persistence.</p>
                  </div>
                  <div className="pt-2">
                    <Button 
                      onClick={saveSettings} 
                      disabled={saving} 
                      className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/25 transition-all hover:scale-[1.02]"
                    >
                      {saving ? 'Synchronizing...' : 'Saves Consensus Settings'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
