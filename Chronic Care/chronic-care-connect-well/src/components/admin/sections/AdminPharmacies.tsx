
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, MapPin, Phone, Mail, MessageSquare, Activity, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PharmacyRegistrationForm } from "./pharmacy/PharmacyRegistrationForm";
import { PharmacyCommunication } from "./pharmacy/PharmacyCommunication";
import { API_URL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export const AdminPharmacies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [showCommunication, setShowCommunication] = useState(false);
  const { toast } = useToast();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fetch pharmacies
  const { data: pharmacies, isLoading, refetch } = useQuery({
    queryKey: ["pharmacies"],
    // Try backend: GET /admin/pharmacies, fallback to empty list
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/admin/pharmacies`, { headers: { Authorization: `Bearer ${token || ''}` } });
        if (!res.ok) throw new Error(`Failed to load pharmacies (${res.status})`);
        const body = await res.json();
        // Support either { pharmacies: [...] } or direct array
        return (body?.pharmacies ?? body ?? []) as any[];
      } catch (e: any) {
        // Soft-fail: show toast once and return []
        console.warn('AdminPharmacies load failed', e?.message || e);
        toast({ title: 'Pharmacies unavailable', description: 'Could not load pharmacies from server yet.', variant: 'destructive' });
        return [] as any[];
      }
    },
  });

  const filteredPharmacies = pharmacies?.filter((pharmacy:any) => {
    const name = String(pharmacy?.name || '').toLowerCase();
    const address = String(pharmacy?.address || '').toLowerCase();
    const license = String(pharmacy?.license_number || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || address.includes(q) || license.includes(q);
  });

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active':
          return 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full';
        case 'inactive':
          return 'bg-slate-100 text-slate-500 border-slate-200 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full';
        case 'suspended':
          return 'bg-rose-50 text-rose-600 border-rose-100 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full';
        default:
          return 'bg-slate-100 text-slate-400 border-slate-200 font-black uppercase text-[10px] tracking-widest px-3 py-1 rounded-full';
      }
    };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse h-full">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-slate-200 rounded-2xl w-64"></div>
          <div className="h-12 bg-slate-200 rounded-xl w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-[32px]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (showAddForm) {
    return (
      <PharmacyRegistrationForm 
        onCancel={() => setShowAddForm(false)}
        onSuccess={() => {
          setShowAddForm(false);
          refetch();
        }}
      />
    );
  }

  if (showCommunication && selectedPharmacy) {
    return (
      <PharmacyCommunication
        pharmacy={selectedPharmacy}
        onBack={() => {
          setShowCommunication(false);
          setSelectedPharmacy(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Pharmacy Network</h1>
            <p className="text-slate-400 font-bold text-sm">Coordinate and verify clinical distribution partners.</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5 mr-2" />
          Register New Node
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-300 h-5 w-5" />
          <Input
            placeholder="Search clinical registries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-16 bg-white border-border text-slate-700 font-bold rounded-2xl shadow-sm focus:ring-primary/40 focus:border-primary text-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Partners', val: pharmacies?.length, icon: Building2, color: 'slate' },
          { label: 'Operational', val: pharmacies?.filter(p => p.status === 'active').length, icon: Activity, color: 'emerald', active: true },
          { label: 'Standby', val: pharmacies?.filter(p => p.status === 'inactive').length, icon: Clock, color: 'slate' },
          { label: 'Restricted', val: pharmacies?.filter(p => p.status === 'suspended').length, icon: AlertCircle, color: 'rose' },
        ].map((s, i) => (
          <Card key={i} className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow group border-t-2" style={{ borderTopColor: s.color === 'slate' ? '#e2e8f0' : s.color === 'emerald' ? '#10b981' : '#f43f5e' }}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-2">
                <div className={`text-3xl font-black tracking-tight ${s.color === 'emerald' ? 'text-emerald-600' : s.color === 'rose' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {s.val || 0}
                </div>
                <div className={`p-2 rounded-xl transition-colors ${s.color === 'emerald' ? 'bg-emerald-50' : s.color === 'rose' ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  {s.active ? (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                  ) : (
                    <s.icon className={`h-5 w-5 ${s.color === 'emerald' ? 'text-emerald-500' : s.color === 'rose' ? 'text-rose-500' : 'text-slate-400'}`} />
                  )}
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPharmacies && filteredPharmacies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPharmacies.map((pharmacy:any, idx:number) => (
            <Card key={pharmacy.id ?? idx} className="bg-white border-slate-200 shadow-md rounded-[32px] overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all relative border-t-4 border-t-slate-100 hover:border-t-primary">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-primary transition-colors">{pharmacy.name}</CardTitle>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized Distribution Node</p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(pharmacy.status)}>
                    {pharmacy.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 text-slate-600 font-bold text-sm">
                    <div className="p-2.5 bg-slate-50 rounded-xl mt-0.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <span className="leading-relaxed">{pharmacy.address}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-slate-600 font-bold text-sm">
                    <div className="p-2.5 bg-slate-50 rounded-xl">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <span>{pharmacy.phone}</span>
                  </div>
                  
                  {pharmacy.email && (
                    <div className="flex items-center gap-4 text-slate-600 font-bold text-sm">
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="truncate">{pharmacy.email}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol ID</span>
                    <span className="text-xs font-black text-slate-800 mt-0.5">{pharmacy.license_number}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Radius</span>
                    <span className="text-xs font-black text-primary mt-0.5">{pharmacy.delivery_radius} KM</span>
                  </div>
                </div>
                
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => {
                    setSelectedPharmacy(pharmacy);
                    setShowCommunication(true);
                  }}
                  className="w-full bg-slate-50 hover:bg-primary hover:text-white text-slate-600 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl transition-all shadow-sm border border-slate-200/50 mt-2"
                >
                  <MessageSquare className="h-4 w-4 mr-3" />
                  Establish Comms Link
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px] overflow-hidden">
          <CardContent className="text-center py-32">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
              <Building2 className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-slate-400 font-black uppercase text-xs tracking-widest">Network Void</h3>
            <p className="text-slate-400 font-bold text-[10px] mt-2">No clinical distribution nodes detected in the current sector.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
