
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Lock, Mail, Phone, Activity } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL } from '@/lib/utils';

async function apiFetch(path: string, token: string, init?: RequestInit) {
  try {
    const res = await fetch(`${API_URL}${path}`, { ...(init||{}), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers||{}) } });
    if (res.ok) return await res.json();
    const errorText = await res.text();
    throw new Error(errorText || `Request failed with status ${res.status}`);
  } catch (e: any) {
    throw new Error(e?.message || 'Request failed');
  }
}

export function ProfileSection() {
  const token = useMemo(()=> (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '', []);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['meProfile'],
    enabled: !!token,
    queryFn: () => apiFetch('/users/me', token),
    staleTime: 60_000,
  });

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
    diagnosis: '', primaryDoctorName: '', allergies: '', medicalHistory: '',
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const user = data?.user;

  // Sync form when data loads
  const init = useMemo(() => {
    if (!user) return form;
    return {
      ...form,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      dateOfBirth: user.date_of_birth ? String(user.date_of_birth).slice(0,10) : '',
      diagnosis: user.diagnosis || '',
      primaryDoctorName: user.primary_doctor_name || '',
      allergies: user.allergies || '',
      medicalHistory: user.medical_history || '',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, !!user]);

  const [localForm, setLocalForm] = useState(init);
  if (user && localForm.firstName === '' && (user.first_name || user.last_name)) {
    setLocalForm(init);
  }

  const saveProfile = useMutation({
    mutationFn: async () => {
      const b1 = await apiFetch('/users/me', token, { method: 'PATCH', body: JSON.stringify({
        firstName: localForm.firstName,
        lastName: localForm.lastName,
        email: localForm.email,
        phone: localForm.phone,
        dateOfBirth: localForm.dateOfBirth || null,
      })});
      const b2 = await apiFetch('/users/me/medical', token, { method: 'PATCH', body: JSON.stringify({
        diagnosis: localForm.diagnosis,
        primaryDoctorName: localForm.primaryDoctorName,
        allergies: localForm.allergies,
        medicalHistory: localForm.medicalHistory,
      })});
      return { b1, b2 };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meProfile'] })
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      return await apiFetch('/users/me/password', token, { method: 'PATCH', body: JSON.stringify({
        currentPassword: localForm.currentPassword,
        newPassword: localForm.newPassword,
        confirmPassword: localForm.confirmPassword,
      })});
    }
  });

  const onInput = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    setLocalForm((s)=> ({ ...s, [k]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
          {saveProfile.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center text-foreground font-black text-lg">
              <div className="p-2 bg-primary/10 rounded-lg mr-3">
                <User className="h-5 w-5 text-primary" />
              </div>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-black uppercase tracking-widest text-muted-foreground">First Name</Label>
                <Input id="firstName" value={localForm.firstName} onChange={onInput('firstName')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Last Name</Label>
                <Input id="lastName" value={localForm.lastName} onChange={onInput('lastName')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60" />
                <Input id="email" type="email" value={localForm.email} onChange={onInput('email')} className="pl-10 bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/60" />
                <Input id="phone" type="tel" value={localForm.phone} onChange={onInput('phone')} className="pl-10 bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={localForm.dateOfBirth} onChange={onInput('dateOfBirth')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center text-foreground font-black text-lg">
              <div className="p-2 bg-amber-50 rounded-lg mr-3">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Password</Label>
              <Input id="currentPassword" type="password" value={localForm.currentPassword} onChange={onInput('currentPassword')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-black uppercase tracking-widest text-muted-foreground">New Password</Label>
              <Input id="newPassword" type="password" value={localForm.newPassword} onChange={onInput('newPassword')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={localForm.confirmPassword} onChange={onInput('confirmPassword')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
            </div>
            
            <Button variant="outline" className="w-full border-border text-foreground hover:bg-accent font-black text-xs uppercase tracking-widest h-11 mt-4 transition-all" onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Updating Password…' : 'Change Security Credentials'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-foreground font-black text-lg flex items-center">
            <div className="p-2 bg-emerald-50 rounded-lg mr-3">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
            Medical Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Primary Diagnosis</Label>
              <Input id="diagnosis" value={localForm.diagnosis} onChange={onInput('diagnosis')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doctorName" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Primary Care Physician</Label>
              <Input id="doctorName" value={localForm.primaryDoctorName} onChange={onInput('primaryDoctorName')} className="bg-background border-border text-sm font-bold h-11 focus:ring-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="allergies" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Known Allergies</Label>
            <Textarea 
              id="allergies" 
              placeholder="List any known allergies to medications or substances..."
              value={localForm.allergies}
              onChange={onInput('allergies') as any}
              className="bg-background border-border text-sm font-bold min-h-[100px] focus:ring-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="medicalHistory" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Comprehensive Medical History</Label>
            <Textarea 
              id="medicalHistory" 
              placeholder="Brief medical history and current conditions..."
              value={localForm.medicalHistory}
              onChange={onInput('medicalHistory') as any}
              className="bg-background border-border text-sm font-bold min-h-[120px] focus:ring-primary"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
