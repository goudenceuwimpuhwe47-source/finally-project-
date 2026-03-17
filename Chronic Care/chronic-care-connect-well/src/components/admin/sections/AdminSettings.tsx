
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="h-5 w-5 mr-2" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <Input
                value={user?.email || ""}
                disabled
                className="bg-gray-700 border-gray-600 text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role
              </label>
              <Input
                value="Administrator"
                disabled
                className="bg-gray-700 border-gray-600 text-gray-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Key className="h-5 w-5 mr-2" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updating ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSettings ? (
              <div className="text-gray-400">Loading settings...</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Email Notifications</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettings(s => ({ ...s, email_notifications_enabled: !s.email_notifications_enabled }))}
                  >
                    {settings.email_notifications_enabled ? 'On' : 'Off'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Require 2FA</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSettings(s => ({ ...s, require_2fa: !s.require_2fa }))}
                  >
                    {settings.require_2fa ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Backup Schedule (CRON)</label>
                  <Input
                    value={settings.backup_schedule_cron || ''}
                    onChange={(e) => setSettings(s => ({ ...s, backup_schedule_cron: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g. 0 2 * * *"
                  />
                </div>
                <div className="pt-2">
                  <Button onClick={saveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700">{saving ? 'Saving…' : 'Save Settings'}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
