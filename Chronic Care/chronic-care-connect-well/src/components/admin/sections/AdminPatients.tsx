
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Mail, Phone, Calendar, MapPin } from "lucide-react";
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60">
          <div className="w-full md:max-w-xl bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Patient Details</h3>
              <button className="text-gray-400 hover:text-white" onClick={() => setSelectedId(null)}>Close</button>
            </div>
            <div className="p-4 space-y-3">
              {loadingDetails && <div className="text-gray-400">Loading…</div>}
              {!loadingDetails && details && !details.error && (
                <div className="space-y-2">
                  <div className="text-white text-xl font-semibold">{details.full_name || details.username || details.email}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-300">
                    <div><span className="text-gray-400">Email:</span> {details.email || '—'}</div>
                    <div><span className="text-gray-400">Phone:</span> {details.phone || '—'}</div>
                    <div><span className="text-gray-400">DOB:</span> {details.date_of_birth ? new Date(details.date_of_birth).toLocaleDateString() : '—'}</div>
                    <div><span className="text-gray-400">Gender:</span> {details.gender || '—'}</div>
                    <div className="sm:col-span-2"><span className="text-gray-400">Address:</span> {details.address || '—'}</div>
                  </div>
                  {details.stats && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-2xl font-bold text-white">{details.stats.ordersCount}</div>
                        <div className="text-xs text-gray-400">Orders</div>
                      </div>
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-2xl font-bold text-white">{details.stats.prescriptionsCount}</div>
                        <div className="text-xs text-gray-400">Prescriptions</div>
                      </div>
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-2xl font-bold text-white">{details.stats.remindersCount}</div>
                        <div className="text-xs text-gray-400">Reminders</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!loadingDetails && details?.error && (
                <div className="text-red-400">{details.error}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
