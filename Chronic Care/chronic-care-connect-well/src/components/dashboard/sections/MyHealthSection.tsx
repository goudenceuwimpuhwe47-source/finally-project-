
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Activity, TrendingUp, Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";

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

export function MyHealthSection() {
  const token = useMemo(()=> (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '', []);
  const qc = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['healthSummary'],
    enabled: !!token,
    queryFn: () => apiFetch('/health/my/summary', token),
    staleTime: 30_000,
  });

  const { data: today } = useQuery({
    queryKey: ['healthToday'],
    enabled: !!token,
    queryFn: () => apiFetch('/health/my/today', token),
    staleTime: 15_000,
  });

  // Next alert and today's alerts to populate cards when health logs are missing
  const { data: nextAlert } = useQuery({
    queryKey: ['mh_nextAlert'],
    enabled: !!token,
    queryFn: async () => {
      try { return await apiFetch('/alerts/my/next', token); } catch { return null; }
    },
    refetchInterval: 60_000,
  });

  const { data: todayAlerts } = useQuery({
    queryKey: ['mh_todayAlerts'],
    enabled: !!token,
    queryFn: async () => {
      try {
        const b = await apiFetch('/alerts/my?page=1&pageSize=50', token);
        const all = Array.isArray(b?.alerts) ? b.alerts : [];
        const now = new Date();
        return all.filter((e: any) => e.when_at && isSameDay(new Date(e.when_at), now));
      } catch { return []; }
    },
    staleTime: 30_000,
  });

  const createLog = useMutation({
    mutationFn: async () => {
      setIsLogging(true);
      try {
        await apiFetch('/health/logs', token, { method: 'POST', body: JSON.stringify({ painLevel: 4, fatigueLevel: 5, notes: 'Logged from dashboard quick action' }) });
      } finally {
        setIsLogging(false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['healthSummary'] });
      qc.invalidateQueries({ queryKey: ['healthToday'] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Health Dashboard</h1>
        <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={() => createLog.mutate()} disabled={isLogging}>
          <Plus className="h-4 w-4 mr-2" />
          {isLogging ? 'Logging…' : 'Log Symptoms'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pain Level Today</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{(() => {
              if (typeof summary?.latest?.pain_level === 'number') return `${summary.latest.pain_level}/10`;
              const total = todayAlerts?.length || 0;
              if (total > 0) {
                const taken = todayAlerts.filter((e:any)=> String(e.status).toLowerCase()==='taken').length;
                const derived = Math.max(1, Math.min(10, 10 - Math.round((taken/total) * 8)));
                return `${derived}/10`;
              }
              return '5/10';
            })()}</div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-1">
              {summary?.latest ? `Updated: ${format(new Date(summary.latest.created_at), 'p')}` : (todayAlerts?.length ? 'Estimated from activity' : 'Baseline level')}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Medications Taken</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{(() => {
              const total = todayAlerts?.length || 0;
              const taken = todayAlerts ? todayAlerts.filter((e:any)=> String(e.status).toLowerCase()==='taken').length : 0;
              return `${taken}/${total || '0'}`;
            })()}</div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-1">Completion for today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Next Event</CardTitle>
            <Calendar className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-foreground">{nextAlert?.alert?.when_at ? format(new Date(nextAlert.alert.when_at), 'p') : '—'}</div>
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-1 truncate">
              {nextAlert?.alert ? (nextAlert.alert.medicine_name || 'Scheduled dose') : 'No upcoming events'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Health Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(today?.logs?.length ? today.logs : (todayAlerts || [])).slice(0, 4).map((l:any, idx:number) => (
              <div key={idx} className="flex flex-col xs:flex-row items-start xs:items-center justify-between p-4 bg-secondary/50 border border-border/50 rounded-xl gap-2 hover:bg-secondary transition-colors shadow-sm">
                <div className="w-full xs:w-auto">
                  {today?.logs?.length ? (
                    <>
                      <p className="font-bold text-foreground text-sm md:text-base">Pain: {l.pain_level ?? '—'}/10 {Number.isFinite(l.fatigue_level) ? `• Fatigue: ${l.fatigue_level}/10` : ''}</p>
                      {l.notes && <p className="text-xs md:text-sm text-muted-foreground font-medium italic mt-0.5">“{l.notes}”</p>}
                      <p className="text-[10px] md:text-xs text-muted-foreground/60 mt-1 font-bold">{format(new Date(l.created_at), 'p')}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-foreground text-sm md:text-base flex items-center capitalize">
                        <Activity className="h-3 w-3 mr-2 text-primary" />
                        {l.medicine_name || 'Medication'}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground font-medium">{l.dosage || ''} {l.frequency_per_day ? `• ${l.frequency_per_day}x/day` : ''}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground/60 mt-1 font-bold">{l.when_at ? format(new Date(l.when_at), 'p') : ''}</p>
                    </>
                  )}
                </div>
                <div className="text-left xs:text-right w-full xs:w-auto">
                  <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-sm ${today?.logs?.length ? 'bg-orange-100 text-orange-700' : (String(l.status || '').toLowerCase()==='taken' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}`}>
                    {today?.logs?.length ? 'Logged' : (String(l.status || '').toLowerCase()==='taken' ? 'Taken' : 'Pending')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
