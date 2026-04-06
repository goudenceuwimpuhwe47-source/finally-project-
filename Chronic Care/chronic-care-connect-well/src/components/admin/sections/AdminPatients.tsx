
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, Calendar, MapPin, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/utils";

export const AdminPatients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { data: patients, isLoading } = useQuery({
    queryKey: ["adminPatients"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/admin/patients`, { headers: { Authorization: `Bearer ${token || ''}` } });
        if (!res.ok) throw new Error('Failed');
        const body = await res.json();
        return (body?.patients ?? body ?? []) as any[];
      } catch {
        return [] as any[];
      }
    },
    enabled: !!token,
  });

  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedId || !token) return;
      setLoadingDetails(true);
      setDetails(null);
      try {
        const res = await fetch(`${API_URL}/admin/patients/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load details');
        const body = await res.json();
        setDetails(body.patient || body);
      } catch (e) {
        setDetails({ error: 'Failed to load details' });
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedId, token]);

  const filteredPatients = patients?.filter(patient =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-200 rounded-2xl w-64"></div>
          <div className="h-14 bg-slate-200 rounded-2xl"></div>
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Users className="h-6 w-6 text-white" />
          </div>
          Patient Registry
        </h1>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px]">
          {filteredPatients.length} Registered Individuals
        </Badge>
      </div>

      {/* Search */}
      <div className="relative bg-white p-6 rounded-3xl border border-border shadow-sm">
        <Search className="absolute left-10 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
        <Input
          placeholder="Search clinical records by name or secure ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-14 bg-slate-50 border-border text-foreground h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold placeholder:text-muted-foreground/50 transition-all shadow-inner"
        />
      </div>

      <div className="grid gap-6">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="bg-white border-border shadow-sm rounded-3xl overflow-hidden hover:shadow-lg transition-all group">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:bg-primary/5 transition-colors">
                        <Users className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">
                          {patient.full_name || 'Anonymous Patient'}
                        </h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Record ID: #{patient.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                      {patient.email && (
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="p-2 bg-slate-100 rounded-xl">
                            <Mail className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Secure Mail</span>
                            <span className="text-sm font-bold">{patient.email}</span>
                          </div>
                        </div>
                      )}
                      
                      {patient.phone && (
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="p-2 bg-slate-100 rounded-xl">
                            <Phone className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Mobile ID</span>
                            <span className="text-sm font-bold">{patient.phone}</span>
                          </div>
                        </div>
                      )}
                      
                      {patient.date_of_birth && (
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="p-2 bg-slate-100 rounded-xl">
                            <Calendar className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Born Date</span>
                            <span className="text-sm font-bold">
                              {new Date(patient.date_of_birth).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {patient.address && (
                        <div className="flex items-center gap-3 text-slate-600 md:col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                          <MapPin className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Geolocation</span>
                            <span className="text-xs font-bold leading-relaxed">{patient.address}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {patient.medical_conditions && patient.medical_conditions.length > 0 && (
                      <div className="mt-4 flex flex-col gap-3">
                        <span className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest ml-1">Clinical Observations</span>
                        <div className="flex flex-wrap gap-2">
                          {patient.medical_conditions.map((condition, index) => (
                            <Badge key={index} variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col gap-4 items-center sm:items-end justify-center">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full">
                      Verified Active
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/20 text-primary hover:bg-primary font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl transition-all shadow-sm group-hover:bg-primary group-hover:text-white"
                      onClick={() => setSelectedId(Number(patient.id))}
                    >
                      Open Profile
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-100 shadow-inner">
            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
              <Users className="h-12 w-12 text-slate-200" />
            </div>
            <h3 className="text-slate-800 font-black tracking-tight uppercase text-sm mb-2">Registry Silent</h3>
            <p className="text-slate-400 font-bold text-xs max-w-[300px] mx-auto px-6">
              {searchTerm 
                ? "Your search query yielded no matching clinical identities." 
                : "The patient database is currently unoccupied."}
            </p>
          </div>
        )}
      </div>

      {/* Details Drawer/Modal */}
      {selectedId !== null && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/40 backdrop-blur-md transition-all animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedId(null)} />
          <div className="w-full md:max-w-2xl bg-white border-t md:border border-border rounded-t-[40px] md:rounded-[40px] overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-10 duration-500 ring-1 ring-black/[0.1]">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Clinical Profile</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manifest #{selectedId}</p>
                </div>
              </div>
              <button 
                className="p-3 text-slate-300 hover:text-slate-800 hover:bg-slate-50 rounded-2xl transition-all" 
                onClick={() => setSelectedId(null)}
              >
                <XCircle className="h-7 w-7" />
              </button>
            </div>
            
            <ScrollArea className="max-h-[80vh] md:max-h-[600px]">
              <div className="p-4 sm:p-8 space-y-6">
                {loadingDetails && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    <p className="text-gray-400 animate-pulse">Loading detailed patient records...</p>
                  </div>
                )}
                
                {!loadingDetails && details && !details.error && (
                  <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                      <div className="w-32 h-32 bg-gradient-to-br from-primary to-indigo-600 rounded-[36px] flex items-center justify-center shadow-2xl shadow-primary/30 relative group">
                        <span className="text-5xl font-black text-white group-hover:scale-110 transition-transform">
                          {(details.full_name || details.username || '?').charAt(0).toUpperCase()}
                        </span>
                        <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg">
                          <div className="w-4 h-4 bg-emerald-500 rounded-full ring-4 ring-emerald-50" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left space-y-3 pt-2">
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                          {details.full_name || details.username || details.email}
                        </h2>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                          <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full">Authenticated Account</Badge>
                          <Badge variant="outline" className="text-slate-400 border-slate-100 font-bold uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full">Institutional Patient</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[36px] border border-slate-100 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <Users className="h-48 w-48 text-primary" />
                      </div>
                      <div className="space-y-6 relative z-10">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Electronic Mail</p>
                            <p className="text-slate-800 font-bold text-sm break-all">{details.email || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                            <Phone className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Tele-Communication</p>
                            <p className="text-slate-800 font-bold text-sm font-mono tracking-tight">{details.phone || '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6 relative z-10">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Data of Birth</p>
                            <p className="text-slate-800 font-bold text-sm">{details.date_of_birth ? new Date(details.date_of_birth).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Home Residency</p>
                            <p className="text-slate-800 font-bold text-sm leading-relaxed">{details.address || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {details.stats && (
                      <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white border border-slate-100 rounded-[28px] p-6 text-center hover:shadow-xl hover:shadow-blue-500/5 transition-all group overflow-hidden relative">
                          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-20" />
                          <p className="text-3xl font-black text-slate-800 tracking-tighter">{details.stats.ordersCount}</p>
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mt-2">Active Orders</p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-[28px] p-6 text-center hover:shadow-xl hover:shadow-emerald-500/5 transition-all group overflow-hidden relative">
                          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-20" />
                          <p className="text-3xl font-black text-slate-800 tracking-tighter">{details.stats.prescriptionsCount}</p>
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mt-2">Clinical RX</p>
                        </div>
                        <div className="bg-white border border-slate-100 rounded-[28px] p-6 text-center hover:shadow-xl hover:shadow-amber-500/5 transition-all group overflow-hidden relative">
                          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-20" />
                          <p className="text-3xl font-black text-slate-800 tracking-tighter">{details.stats.remindersCount}</p>
                          <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mt-2">System Alerts</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-6 flex flex-col sm:flex-row gap-4">
                      <Button className="flex-1 bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-xl shadow-primary/25 transition-all ring-offset-2 hover:scale-[1.02]">Dispath Message</Button>
                      <Button variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl transition-all">Extract Health Data</Button>
                    </div>
                  </div>
                )}
                
                {!loadingDetails && details?.error && (
                  <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
                    <div className="bg-rose-50 p-6 rounded-[28px] mb-6 shadow-sm border border-rose-100/50">
                      <XCircle className="h-12 w-12 text-rose-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Sync Protocol Failed</h3>
                    <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto leading-relaxed">{details.error}</p>
                    <Button 
                      className="mt-10 bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95" 
                      onClick={() => setSelectedId(null)}
                    >
                      Return to Registry
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};
