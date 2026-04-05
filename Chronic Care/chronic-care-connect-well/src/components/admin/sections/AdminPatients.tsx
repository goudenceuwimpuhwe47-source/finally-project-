
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
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-48"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Users className="h-8 w-8" />
          Patient Management
        </h1>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          {filteredPatients.length} Patients
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search patients by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white"
        />
      </div>

      {/* Patients List */}
      <div className="grid gap-4">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {patient.full_name || 'No Name Provided'}
                        </h3>
                        <p className="text-sm text-gray-400">Patient ID: {String(patient.id)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {patient.email && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{patient.email}</span>
                        </div>
                      )}
                      
                      {patient.phone && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{patient.phone}</span>
                        </div>
                      )}
                      
                      {patient.date_of_birth && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {new Date(patient.date_of_birth).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {patient.address && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{patient.address}</span>
                        </div>
                      )}
                    </div>

                    {patient.medical_conditions && patient.medical_conditions.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-400 mb-2">Medical Conditions:</p>
                        <div className="flex flex-wrap gap-2">
                          {patient.medical_conditions.map((condition, index) => (
                            <Badge key={index} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 items-center sm:items-end">
                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 w-fit">
                      Active
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white text-xs sm:text-sm"
                      onClick={() => setSelectedId(Number(patient.id))}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">No Patients Found</h3>
              <p className="text-gray-400">
                {searchTerm ? "No patients match your search criteria." : "No patients have registered yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Drawer/Modal */}
      {selectedId !== null && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedId(null)} />
          <div className="w-full md:max-w-2xl bg-gray-900 border-t md:border border-gray-700/50 rounded-t-3xl md:rounded-2xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-4 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Patient Profile</h3>
              </div>
              <button 
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors" 
                onClick={() => setSelectedId(null)}
              >
                <XCircle className="h-6 w-6" />
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
                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20">
                        <span className="text-4xl font-bold text-white">
                          {(details.full_name || details.username || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-center sm:text-left space-y-1">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">
                          {details.full_name || details.username || details.email}
                        </h2>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                          <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Verified Account</Badge>
                          <Badge variant="outline" className="text-gray-400">Regular Patient</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-800/30 p-4 sm:p-6 rounded-2xl border border-gray-700/30">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-tighter font-semibold">Email Address</p>
                            <p className="text-white break-all">{details.email || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-tighter font-semibold">Phone Number</p>
                            <p className="text-white">{details.phone || '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-tighter font-semibold">Date of Birth</p>
                            <p className="text-white">{details.date_of_birth ? new Date(details.date_of_birth).toLocaleDateString() : '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-tighter font-semibold">Home Address</p>
                            <p className="text-white text-sm">{details.address || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {details.stats && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center hover:bg-gray-800 transition-colors">
                          <p className="text-2xl font-black text-white">{details.stats.ordersCount}</p>
                          <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mt-1">Orders</p>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center hover:bg-gray-800 transition-colors">
                          <p className="text-2xl font-black text-white">{details.stats.prescriptionsCount}</p>
                          <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mt-1">Scripts</p>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 text-center hover:bg-gray-800 transition-colors">
                          <p className="text-2xl font-black text-white">{details.stats.remindersCount}</p>
                          <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mt-1">Alarms</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold">Message Patient</Button>
                      <Button variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">Export Health Record</Button>
                    </div>
                  </div>
                )}
                
                {!loadingDetails && details?.error && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-red-500/10 p-4 rounded-full mb-4">
                      <XCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Failed to Load Profile</h3>
                    <p className="text-gray-400 max-w-xs mx-auto">{details.error}</p>
                    <Button 
                      className="mt-6 bg-gray-800 hover:bg-gray-700" 
                      onClick={() => setSelectedId(null)}
                    >
                      Back to List
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
