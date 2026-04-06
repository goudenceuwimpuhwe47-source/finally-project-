import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, CheckCircle } from "lucide-react";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";

interface MedicationsSectionProps {
  onRequestMedication?: () => void;
}

import { API_URL } from '@/lib/utils';

async function apiGetJson(path: string, token: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export function MedicationsSection({ onRequestMedication }: MedicationsSectionProps) {
  const token = useMemo(()=> (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '', []);
  const qc = useQueryClient();

  // Load current prescriptions for patient
  const { data: prescData } = useQuery({
    queryKey: ['patientPrescriptions'],
    enabled: !!token,
    queryFn: async () => {
      const b = await apiGetJson(`/orders/my/prescriptions`, token);
      if (!b) return [] as any[];
      return Array.isArray(b?.prescriptions) ? b.prescriptions : [];
    },
    staleTime: 30_000,
  });

  // Load recent doctor guidance
  const { data: guidance } = useQuery({
    queryKey: ['patientGuidance'],
    enabled: !!token,
    queryFn: async () => {
      const b = await apiGetJson(`/orders/my/guidance`, token);
      if (!b) return [] as any[];
      return Array.isArray(b?.guidance) ? b.guidance : [];
    },
    staleTime: 60_000,
  });

  // Load combined medication overview (guidance + latest prescription per order)
  const { data: overview } = useQuery({
    queryKey: ['patientMedicationOverview'],
    enabled: !!token,
    queryFn: async () => {
      const b = await apiGetJson(`/orders/my/medication-overview`, token);
      if (!b) return [] as any[];
      return Array.isArray(b?.items) ? b.items : [];
    },
    staleTime: 60_000,
  });

  // Load master schedules (to see if pharmacist has acted)
  const { data: scheduleData } = useQuery({
    queryKey: ['patientSchedules'],
    enabled: !!token,
    queryFn: async () => {
      const b = await apiGetJson(`/alerts/my/schedules`, token);
      if (!b) return [] as any[];
      return Array.isArray(b?.schedules) ? b.schedules : [];
    },
    staleTime: 60_000,
  });

  // Load today's alerts (or next one)
  const { data: nextAlert } = useQuery({
    queryKey: ['patientNextAlert'],
    enabled: !!token,
    queryFn: async () => {
      const b = await apiGetJson(`/alerts/my/next`, token);
      if (!b) return null;
      return b?.alert || null;
    },
    refetchInterval: 60_000,
  });

  // Load today's events (max 50 from server, filtered client-side to today)
  const { data: todayEvents } = useQuery({
    queryKey: ['patientTodayEvents'],
    enabled: !!token,
    queryFn: async () => {
      const b = await apiGetJson(`/alerts/my?page=1&pageSize=50`, token);
      if (!b) return [] as any[];
      const all = Array.isArray(b?.alerts) ? b.alerts : [];
      const now = new Date();
      return all.filter((e: any) => e.when_at && isSameDay(new Date(e.when_at), now))
                .sort((a: any, b: any) => new Date(a.when_at).getTime() - new Date(b.when_at).getTime());
    },
    staleTime: 30_000,
  });

  // Load medication history (last 5 taken/missed/skipped)
  const { data: historyData } = useQuery({
    queryKey: ['patientMedHistory'],
    enabled: !!token,
    queryFn: async () => {
      const b = await apiGetJson(`/alerts/my/history`, token);
      if (!b) return [] as any[];
      return Array.isArray(b?.history) ? b.history : [];
    },
    staleTime: 60_000,
  });

  // Mark alert as taken
  const markTaken = useMutation({
    mutationFn: async (id: number) => {
      try {
        const res = await fetch(`${API_URL}/alerts/${id}/mark-taken`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        const b = await res.json();
        if (!res.ok || b?.error) throw new Error(b?.error || 'Failed');
        return b;
      } catch (e: any) {
        throw new Error(e?.message || 'Failed');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patientNextAlert'] });
      qc.invalidateQueries({ queryKey: ['patientTodayEvents'] });
      qc.invalidateQueries({ queryKey: ['patientMedHistory'] });
    }
  });

  const prescriptions = (prescData || []).filter((p:any)=> String(p.status || '').toLowerCase() === 'active');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Medications</h1>
        <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm" onClick={() => onRequestMedication && onRequestMedication()}>
          <Plus className="h-4 w-4 mr-2" />
          Request Medication
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Clock className="h-5 w-5 mr-2 text-amber-400" />
              Next To Take
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!nextAlert && (
              <div className="text-gray-400 text-sm py-4 italic">
                {(() => {
                   const hasSched = (scheduleData || []).length > 0;
                   if (!hasSched && prescriptions.length > 0) return "Awaiting Pharmacist to finalize your intake schedule.";
                   if (prescriptions.length > 0) return "No more upcoming alerts for today. Your medicine is active.";
                   return "No alerts scheduled. Please check your active prescriptions.";
                })()}
              </div>
            )}
            {nextAlert && (
              <div className="flex items-center justify-between p-3 bg-gray-700/60 rounded-lg border border-gray-600">
                <div>
                  <p className="font-medium text-white">{nextAlert.medicine_name}</p>
                  <p className="text-xs text-gray-300">{nextAlert.dosage || '-'} • {nextAlert.frequency_per_day ? `${nextAlert.frequency_per_day}x/day` : ''}</p>
                  <p className="text-xs text-gray-400">{nextAlert.when_at ? format(new Date(nextAlert.when_at), 'PP p') : ''}</p>
                </div>
                <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-300 hover:bg-emerald-600/20" onClick={() => markTaken.mutate(nextAlert.id)} disabled={markTaken.isPending}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Taken
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Current Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prescriptions.length === 0 && (
              <div className="text-gray-400 text-sm">No prescriptions yet.</div>
            )}
            {prescriptions.map((p: any) => (
              <div key={p.id} className="p-3 border border-gray-700 rounded-lg bg-gray-700/40">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-white">{p.medicine_name || '-'}</p>
                    <p className="text-sm text-gray-300">{p.dosage || p.quantity || '-'}</p>
                    {p.provider_name && <p className="text-xs text-gray-400">Provider: {p.provider_name}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${String(p.status).toLowerCase()==='active' ? 'bg-green-900/30 text-green-300 border border-green-700/40':'bg-gray-700 text-gray-300 border border-gray-600'}`}>{p.status || 'active'}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Active Treatment Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!overview || overview.length === 0) && (
            <div className="text-gray-400 text-sm">No active treatments at the moment.</div>
          )}
          {overview && overview.map((it:any) => {
            const p = it.prescription || {};
            const medicine = p.medicine_name || it.medicine_name || 'Medicine';
            return (
              <div key={it.order_id} className="p-4 border border-gray-700 rounded-lg bg-gray-700/40 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-white font-bold text-lg">{medicine}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-700/40 capitalize">{p.status || 'Active'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Fulfillment Details</p>
                    <div className="text-sm text-gray-100">
                      <span className="text-gray-400 mr-2">Quantity:</span> {p.quantity || it.prescription_quantity || '-'}
                    </div>
                    {(p.dosage || it.dosage) && (
                      <div className="text-sm text-gray-100">
                        <span className="text-gray-400 mr-2">Dosage:</span> {p.dosage || it.dosage}
                      </div>
                    )}
                    {(p.frequency_per_day || it.frequency_per_day) && (
                      <div className="text-sm text-gray-100">
                        <span className="text-gray-400 mr-2">Frequency:</span> {p.frequency_per_day || it.frequency_per_day}x daily
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Instructions & Advice</p>
                    <div className="text-sm text-gray-100 italic">
                      {p.instructions || it.doctor_instructions || 'Take as prescribed.'}
                    </div>
                    {it.doctor_advice && (
                      <div className="text-xs text-blue-300 bg-blue-900/20 p-2 rounded border border-blue-800/30">
                        <span className="font-bold mr-1">Advice:</span> {it.doctor_advice}
                      </div>
                    )}
                  </div>
                </div>

                {it.adherence_plan && (
                  <div className="text-xs text-amber-300/80 mt-2 border-t border-gray-700 pt-2">
                    <span className="font-bold text-gray-500 uppercase text-[9px] block mb-1">Adherence Guidance</span>
                    {it.adherence_plan}
                  </div>
                )}
                
                {p.created_at && (
                  <div className="text-[9px] text-gray-600 mt-2 text-right">
                    Last updated: {new Date(p.created_at).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!todayEvents || todayEvents.length === 0) && (
            <div className="text-gray-400 text-sm py-8 text-center border border-dashed border-gray-700/50 rounded-lg bg-gray-900/10">
               {(() => {
                  const activePrescs = prescriptions.length;
                  const schedules = (scheduleData || []).length;
                  if (activePrescs > 0 && schedules === 0) return (
                    <div className="space-y-1">
                      <p className="font-medium text-amber-400/80">Pending Pharmacist Approval</p>
                      <p className="text-xs">Your doctor approved the medicine; the pharmacist is finalizing the schedule.</p>
                    </div>
                  );
                  if (schedules > 0) {
                    const next = scheduleData.find((s:any)=> new Date(s.start_date) > new Date());
                    if (next) return `Your treatment schedule begins on ${format(new Date(next.start_date), 'PPP')}.`;
                  }
                  return "No events scheduled for today.";
               })()}
            </div>
          )}
          {todayEvents && todayEvents.length > 0 && (
            <>
              <div className="text-xs text-gray-400">
                {(() => {
                  const total = todayEvents.length;
                  const taken = todayEvents.filter((e:any)=> String(e.status).toLowerCase()==='taken').length;
                  const pending = todayEvents.filter((e:any)=> ['pending','sent'].includes(String(e.status).toLowerCase())).length;
                  return `Total: ${total} • Taken: ${taken} • Remaining: ${pending}`;
                })()}
              </div>
              <div className="space-y-2">
                {todayEvents.slice(0, 8).map((e:any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/40 border border-gray-600">
                    <div>
                      <div className="text-white text-sm font-medium">{e.medicine_name || 'Medication'}</div>
                      <div className="text-xs text-gray-300">{e.when_at ? format(new Date(e.when_at), 'p') : ''} • {e.dosage || '-'} {e.frequency_per_day ? `• ${e.frequency_per_day}x/day` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${String(e.status).toLowerCase()==='taken' ? 'bg-emerald-900/20 text-emerald-300 border-emerald-700/40' : String(e.status).toLowerCase()==='sent' ? 'bg-amber-900/20 text-amber-300 border-amber-700/40' : 'bg-gray-900/30 text-gray-300 border-gray-600'}`}>{e.status}</span>
                      {String(e.status).toLowerCase()!=='taken' && (
                        <Button size="sm" variant="outline" className="h-8 border-emerald-600 text-emerald-300 hover:bg-emerald-600/20" onClick={()=> markTaken.mutate(e.id)} disabled={markTaken.isPending}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Take
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Medication History (recent)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(!historyData || historyData.length === 0) && (
              <div className="text-gray-400 text-sm italic">No recent activity recorded.</div>
            )}
            {historyData && historyData.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-2 border-b border-gray-700/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${String(e.status).toLowerCase()==='taken' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {String(e.status).toLowerCase()==='taken' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{e.medicine_name}</p>
                    <p className="text-[10px] text-gray-400">{e.when_at ? format(new Date(e.when_at), 'PP p') : ''}</p>
                  </div>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${String(e.status).toLowerCase()==='taken' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
