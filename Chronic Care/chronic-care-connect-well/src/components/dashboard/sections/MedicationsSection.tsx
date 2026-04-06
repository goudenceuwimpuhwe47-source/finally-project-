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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Medications</h1>
        <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto text-sm" onClick={() => onRequestMedication && onRequestMedication()}>
          <Plus className="h-4 w-4 mr-2" />
          Request Medication
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Clock className="h-5 w-5 mr-2 text-amber-600" />
              Next To Take
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!nextAlert && (
              <div className="text-muted-foreground text-sm py-4 italic">
                {(() => {
                   const hasSched = (scheduleData || []).length > 0;
                   if (!hasSched && prescriptions.length > 0) return "Awaiting Pharmacist to finalize your intake schedule.";
                   if (prescriptions.length > 0) return "No more upcoming alerts for today. Your medicine is active.";
                   return "No alerts scheduled. Please check your active prescriptions.";
                })()}
              </div>
            )}
            {nextAlert && (
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border transition-all hover:shadow-md">
                <div>
                  <p className="font-bold text-foreground text-lg">{nextAlert.medicine_name}</p>
                  <p className="text-xs text-muted-foreground font-medium">{nextAlert.dosage || '-'} • {nextAlert.frequency_per_day ? `${nextAlert.frequency_per_day}x/day` : ''}</p>
                  <p className="text-xs text-primary font-semibold">{nextAlert.when_at ? format(new Date(nextAlert.when_at), 'PP p') : ''}</p>
                </div>
                <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold" onClick={() => markTaken.mutate(nextAlert.id)} disabled={markTaken.isPending}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Taken
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Current Prescriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prescriptions.length === 0 && (
              <div className="text-muted-foreground text-sm italic">No prescriptions yet.</div>
            )}
            {prescriptions.map((p: any) => (
              <div key={p.id} className="p-3 border border-border rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-foreground">{p.medicine_name || '-'}</p>
                    <p className="text-sm text-muted-foreground font-medium">{p.dosage || p.quantity || '-'}</p>
                    {p.provider_name && <p className="text-xs text-muted-foreground/80">Provider: {p.provider_name}</p>}
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${String(p.status).toLowerCase()==='active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200':'bg-secondary text-muted-foreground border border-border'}`}>{p.status || 'active'}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Active Treatment Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!overview || overview.length === 0) && (
            <div className="text-muted-foreground text-sm italic">No active treatments at the moment.</div>
          )}
          {overview && overview.map((it:any) => {
            const p = it.prescription || {};
            const medicine = p.medicine_name || it.medicine_name || 'Medicine';
            return (
              <div key={it.order_id} className="p-4 border border-border rounded-lg bg-secondary/30 space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="text-foreground font-bold text-xl">{medicine}</div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 capitalize font-bold shadow-sm">{p.status || 'Active'}</span>
                </div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-black text-muted-foreground/70">Fulfillment Details</p>
                    <div className="text-sm text-foreground">
                      <span className="text-muted-foreground font-semibold mr-2">Quantity:</span> {p.quantity || it.prescription_quantity || '-'}
                    </div>
                    {(p.dosage || it.dosage) && (
                      <div className="text-sm text-foreground">
                        <span className="text-muted-foreground font-semibold mr-2">Dosage:</span> {p.dosage || it.dosage}
                      </div>
                    )}
                    {(p.frequency_per_day || it.frequency_per_day) && (
                      <div className="text-sm text-foreground">
                        <span className="text-muted-foreground font-semibold mr-2">Frequency:</span> {p.frequency_per_day || it.frequency_per_day}x daily
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-black text-muted-foreground/70">Instructions & Advice</p>
                    <div className="text-sm text-foreground italic bg-background/50 p-2 rounded border border-border/50">
                      {p.instructions || it.doctor_instructions || 'Take as prescribed.'}
                    </div>
                    {it.doctor_advice && (
                      <div className="text-xs text-primary bg-primary/5 p-2 rounded border border-primary/10">
                        <span className="font-bold mr-1">Advice:</span> {it.doctor_advice}
                      </div>
                    )}
                  </div>
                </div>

                {it.adherence_plan && (
                  <div className="text-xs text-amber-700 mt-2 border-t border-border pt-2">
                    <span className="font-black text-muted-foreground uppercase text-[9px] block mb-1">Adherence Guidance</span>
                    {it.adherence_plan}
                  </div>
                )}
                
                {p.created_at && (
                  <div className="text-[10px] text-muted-foreground/60 mt-2 text-right italic font-medium">
                    Last updated: {new Date(p.created_at).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!todayEvents || todayEvents.length === 0) && (
            <div className="text-muted-foreground text-sm py-8 text-center border border-dashed border-border rounded-lg bg-secondary/30">
               {(() => {
                  const activePrescs = prescriptions.length;
                  const schedules = (scheduleData || []).length;
                  if (activePrescs > 0 && schedules === 0) return (
                    <div className="space-y-1">
                      <p className="font-bold text-amber-700">Pending Pharmacist Approval</p>
                      <p className="text-xs font-medium">Your doctor approved the medicine; the pharmacist is finalizing the schedule.</p>
                    </div>
                  );
                  if (schedules > 0) {
                    const next = scheduleData.find((s:any)=> new Date(s.start_date) > new Date());
                    if (next) return <p className="italic font-medium">Your treatment schedule begins on {format(new Date(next.start_date), 'PPP')}.</p>;
                  }
                  return <p className="italic font-medium">No events scheduled for today.</p>;
               })()}
            </div>
          )}
          {todayEvents && todayEvents.length > 0 && (
            <>
              <div className="text-[10px] font-black uppercase text-muted-foreground/70 mb-2">
                {(() => {
                  const total = todayEvents.length;
                  const taken = todayEvents.filter((e:any)=> String(e.status).toLowerCase()==='taken').length;
                  const pending = todayEvents.filter((e:any)=> ['pending','sent'].includes(String(e.status).toLowerCase())).length;
                  return `Overview: ${total} Items • ${taken} Completed • ${pending} Remaining`;
                })()}
              </div>
              <div className="space-y-2">
                {todayEvents.slice(0, 8).map((e:any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary transition-colors">
                    <div>
                      <div className="text-foreground text-sm font-bold">{e.medicine_name || 'Medication'}</div>
                      <div className="text-xs text-muted-foreground font-medium">{e.when_at ? format(new Date(e.when_at), 'p') : ''} • {e.dosage || '-'} {e.frequency_per_day ? `• ${e.frequency_per_day}x/day` : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border shadow-sm ${String(e.status).toLowerCase()==='taken' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : String(e.status).toLowerCase()==='sent' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-secondary text-muted-foreground border-border'}`}>{e.status}</span>
                      {String(e.status).toLowerCase()!=='taken' && (
                        <Button size="sm" variant="outline" className="h-8 border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold" onClick={()=> markTaken.mutate(e.id)} disabled={markTaken.isPending}>
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

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Medication History (recent)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(!historyData || historyData.length === 0) && (
              <div className="text-muted-foreground text-sm italic py-2">No recent activity recorded.</div>
            )}
            {historyData && historyData.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between p-3 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full shadow-sm ${String(e.status).toLowerCase()==='taken' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {String(e.status).toLowerCase()==='taken' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{e.medicine_name}</p>
                    <p className="text-[10px] text-muted-foreground font-medium italic">{e.when_at ? format(new Date(e.when_at), 'PP p') : ''}</p>
                  </div>
                </div>
                <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full shadow-sm ${String(e.status).toLowerCase()==='taken' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
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
