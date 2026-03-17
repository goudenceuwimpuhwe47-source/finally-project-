
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Activity, TrendingUp, Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Health Dashboard</h1>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => createLog.mutate()} disabled={isLogging}>
          <Plus className="h-4 w-4 mr-2" />
          {isLogging ? 'Logging…' : 'Log Symptoms'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pain Level Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(() => {
              if (typeof summary?.latest?.pain_level === 'number') return `${summary.latest.pain_level}/10`;
              const total = todayAlerts?.length || 0;
              if (total > 0) {
                const taken = todayAlerts.filter((e:any)=> String(e.status).toLowerCase()==='taken').length;
                const derived = Math.max(1, Math.min(10, 10 - Math.round((taken/total) * 8)));
                return `${derived}/10`;
              }
              return '5/10';
            })()}</div>
            <p className="text-xs text-muted-foreground">{summary?.latest ? `Last update: ${format(new Date(summary.latest.created_at), 'PP p')}` : (todayAlerts?.length ? 'Derived from medication activity' : 'Default baseline')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medications Taken</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(() => {
              const total = todayAlerts?.length || 0;
              const taken = todayAlerts ? todayAlerts.filter((e:any)=> String(e.status).toLowerCase()==='taken').length : 0;
              return `${taken}/${total || '0'}`;
            })()}</div>
            <p className="text-xs text-muted-foreground">From today's medication alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextAlert?.alert?.when_at ? format(new Date(nextAlert.alert.when_at), 'PP p') : '—'}</div>
            <p className="text-xs text-muted-foreground">{nextAlert?.alert ? (nextAlert.alert.medicine_name || 'Medication scheduled') : 'No upcoming event'}</p>
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
              <div key={l.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  {today?.logs?.length ? (
                    <>
                      <p className="font-medium">Pain: {l.pain_level ?? '—'}/10 {Number.isFinite(l.fatigue_level) ? `• Fatigue: ${l.fatigue_level}/10` : ''}</p>
                      {l.notes && <p className="text-sm text-gray-600">{l.notes}</p>}
                      <p className="text-xs text-gray-500">{format(new Date(l.created_at), 'p')}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{l.medicine_name || 'Medication'}</p>
                      <p className="text-sm text-gray-600">{l.dosage || ''} {l.frequency_per_day ? `• ${l.frequency_per_day}x/day` : ''}</p>
                      <p className="text-xs text-gray-500">{l.when_at ? format(new Date(l.when_at), 'p') : ''}</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${today?.logs?.length ? 'text-orange-600' : (String(l.status || '').toLowerCase()==='taken' ? 'text-green-600' : 'text-amber-600')}`}>
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
