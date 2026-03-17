
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Lock, Mail, Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_FALLBACKS = [
  typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_URL ? String((import.meta as any).env.VITE_API_URL).replace(/\/$/, '') : null,
  'http://localhost:5000',
  'http://localhost:5001',
].filter(Boolean) as string[];

async function apiFetch(path: string, token: string, init?: RequestInit) {
  let lastErr: any = null;
  for (const base of API_FALLBACKS) {
    try {
      const res = await fetch(`${base}${path}`, { ...(init||{}), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers||{}) } });
      if (res.ok) return await res.json();
      lastErr = await res.text();
    } catch (e: any) { lastErr = e?.message || 'Failed'; }
  }
  throw new Error(lastErr || 'Request failed');
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
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
          {saveProfile.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={localForm.firstName} onChange={onInput('firstName')} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={localForm.lastName} onChange={onInput('lastName')} />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="flex">
                <Mail className="h-4 w-4 text-gray-400 mt-3 mr-2" />
                <Input id="email" type="email" value={localForm.email} onChange={onInput('email')} className="flex-1" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex">
                <Phone className="h-4 w-4 text-gray-400 mt-3 mr-2" />
                <Input id="phone" type="tel" value={localForm.phone} onChange={onInput('phone')} className="flex-1" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" value={localForm.dateOfBirth} onChange={onInput('dateOfBirth')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={localForm.currentPassword} onChange={onInput('currentPassword')} />
            </div>
            
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={localForm.newPassword} onChange={onInput('newPassword')} />
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={localForm.confirmPassword} onChange={onInput('confirmPassword')} />
            </div>
            
            <Button variant="outline" className="w-full" onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Changing…' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Medical Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="diagnosis">Primary Diagnosis</Label>
              <Input id="diagnosis" value={localForm.diagnosis} onChange={onInput('diagnosis')} />
            </div>
            
            <div>
              <Label htmlFor="doctorName">Primary Doctor</Label>
              <Input id="doctorName" value={localForm.primaryDoctorName} onChange={onInput('primaryDoctorName')} />
            </div>
          </div>
          
          <div>
            <Label htmlFor="allergies">Known Allergies</Label>
            <Textarea 
              id="allergies" 
              placeholder="List any known allergies to medications or substances..."
              value={localForm.allergies}
              onChange={onInput('allergies') as any}
            />
          </div>
          
          <div>
            <Label htmlFor="medicalHistory">Medical History</Label>
            <Textarea 
              id="medicalHistory" 
              placeholder="Brief medical history and current conditions..."
              value={localForm.medicalHistory}
              onChange={onInput('medicalHistory') as any}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
