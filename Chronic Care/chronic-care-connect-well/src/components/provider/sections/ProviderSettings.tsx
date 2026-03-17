
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Key, User, Shield } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { API_URL } from "@/lib/utils";

export function ProviderSettings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const token = useMemo(()=> (typeof window !== 'undefined' ? localStorage.getItem('token') : null) as string | null, []);

  // Preferences (server-backed)
  const [emailNotifs, setEmailNotifs] = useState<boolean>(true);
  const [patientAlerts, setPatientAlerts] = useState<string>('all');
  const [commSounds, setCommSounds] = useState<boolean>(true);
  const [autoMarkRead, setAutoMarkRead] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const { data: serverSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["providerSettings:preferences"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/provider/settings`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await res.json();
      return b?.settings || {};
    }
  });
  useEffect(() => {
    if (!serverSettings) return;
    if (typeof serverSettings.email_notifications === 'boolean') setEmailNotifs(!!serverSettings.email_notifications);
    if (typeof serverSettings.patient_alerts === 'string') setPatientAlerts(serverSettings.patient_alerts);
    if (typeof serverSettings.comm_sounds === 'boolean') setCommSounds(!!serverSettings.comm_sounds);
    if (typeof serverSettings.auto_mark_read === 'boolean') setAutoMarkRead(!!serverSettings.auto_mark_read);
  }, [serverSettings]);
  const updatePrefMutation = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const res = await fetch(`${API_URL}/provider/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch)
      });
      const b = await res.json().catch(()=>({}));
      if (!res.ok || b?.error) throw new Error(b?.error || 'Failed to update settings');
      return b?.settings || patch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerSettings:preferences"] });
    }
  });
  const applyPref = (key: string, value: any) => {
    // optimistic update local state
    const rollback = {
      emailNotifs,
      patientAlerts,
      commSounds,
      autoMarkRead,
    };
    if (key === 'email_notifications') setEmailNotifs(!!value);
    if (key === 'patient_alerts') setPatientAlerts(String(value));
    if (key === 'comm_sounds') setCommSounds(!!value);
    if (key === 'auto_mark_read') setAutoMarkRead(!!value);
    updatePrefMutation.mutate({ [key]: value }, {
      onError: (err:any) => {
        // rollback on error
        setEmailNotifs(rollback.emailNotifs);
        setPatientAlerts(rollback.patientAlerts);
        setCommSounds(rollback.commSounds);
        setAutoMarkRead(rollback.autoMarkRead);
        toast.error(err?.message || 'Could not save preference');
      }
    });
  };

  const { data: providerData } = useQuery({
    queryKey: ["providerProfile"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await res.json();
      const u = b?.user || {};
      // Normalize expected fields
      return {
        email: u.email,
        license_number: u.license_number || u.license || '',
        specialty: u.specialty || u.department || '',
        hospital_affiliation: u.hospital_affiliation || u.hospital || 'Independent',
        verification_status: u.verification_status || u.provider_verification || 'pending',
      } as any;
    }
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toast.error('Not authenticated'); return; }
    if (!currentPassword.trim()) { toast.error('Enter your current password'); return; }
    
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
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const b = await res.json().catch(()=>({}));
      if (!res.ok || b?.error) {
        // Graceful fallback if endpoint not implemented
        toast.error(b?.error || 'Password change not supported by server.');
      } else {
        toast.success('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      toast.error('Failed to update password');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Provider Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <User className="h-5 w-5 mr-2" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <Input
                value={providerData?.email || user?.email || ""}
                disabled
                className="bg-gray-700 border-gray-600 text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                License Number
              </label>
              <Input
                value={providerData?.license_number || ""}
                disabled
                className="bg-gray-700 border-gray-600 text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Specialty
              </label>
              <Input
                value={providerData?.specialty || ""}
                disabled
                className="bg-gray-700 border-gray-600 text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hospital Affiliation
              </label>
              <Input
                value={providerData?.hospital_affiliation || "Independent"}
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
                className="bg-green-600 hover:bg-green-700"
              >
                {updating ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">License Verification</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                providerData?.verification_status === 'verified' 
                  ? 'bg-green-600 text-green-100' 
                  : providerData?.verification_status === 'rejected'
                  ? 'bg-red-600 text-red-100'
                  : 'bg-yellow-600 text-yellow-100'
              }`}>
                {providerData?.verification_status || 'pending'}
              </span>
            </div>
            {providerData?.verification_status === 'pending' && (
              <p className="text-sm text-gray-400">
                Your license verification is being reviewed by our admin team. 
                You'll be notified once the process is complete.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Email Notifications</span>
              <div className="flex items-center gap-2">
                <Switch checked={emailNotifs} onCheckedChange={(v)=> applyPref('email_notifications', v)} disabled={updatePrefMutation.isPending || loadingSettings} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Patient Alerts</span>
              <Select value={patientAlerts} onValueChange={(v)=> applyPref('patient_alerts', v)}>
                <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="assigned">Assigned Only</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Communication Settings</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300">Sounds</span>
                  <Switch checked={commSounds} onCheckedChange={(v)=> applyPref('comm_sounds', v)} disabled={updatePrefMutation.isPending || loadingSettings} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-300">Auto mark read</span>
                  <Switch checked={autoMarkRead} onCheckedChange={(v)=> applyPref('auto_mark_read', v)} disabled={updatePrefMutation.isPending || loadingSettings} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
