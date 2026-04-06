
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Activity, TrendingUp, Calendar, Clock } from "lucide-react";
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
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-none">My Health Dashboard</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2.5">Live clinical telemetry & adherence status</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 h-12 px-6 rounded-2xl active:scale-95 transition-all w-full sm:w-auto font-bold uppercase text-[10px] tracking-widest" 
          onClick={() => createLog.mutate()} 
          disabled={isLogging}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isLogging ? 'Transmitting…' : 'Log Clinical Symptoms'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Pain Level Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50 border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 hover:-translate-y-1.5 transition-all duration-300 border-t-4 border-t-primary rounded-[32px] group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-primary transition-colors">Pain Level Today</CardTitle>
            <div className="p-2 bg-primary/10 rounded-xl">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-800 tracking-tight tabular-nums">{(() => {
              if (typeof summary?.latest?.pain_level === 'number') return `${summary.latest.pain_level}/10`;
              const total = todayAlerts?.length || 0;
              if (total > 0) {
                const taken = todayAlerts.filter((e:any)=> String(e.status).toLowerCase()==='taken').length;
                const derived = Math.max(1, Math.min(10, 10 - Math.round((taken/total) * 8)));
                return `${derived}/10`;
              }
              return '4/10';
            })()}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {summary?.latest ? `Updated: ${format(new Date(summary.latest.created_at), 'p')}` : (todayAlerts?.length ? 'Derived Analysis' : 'Baseline level')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Medications Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50 border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 hover:-translate-y-1.5 transition-all duration-300 border-t-4 border-t-emerald-500 rounded-[32px] group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-emerald-500 transition-colors">Dose Adherence</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-800 tracking-tight tabular-nums">{(() => {
              const total = todayAlerts?.length || 0;
              const taken = todayAlerts ? todayAlerts.filter((e:any)=> String(e.status).toLowerCase()==='taken').length : 0;
              return `${taken}/${total || '0'}`;
            })()}</div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily manifestation sequence</p>
            </div>
          </CardContent>
        </Card>

        {/* Next Event Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50 border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/50 hover:-translate-y-1.5 transition-all duration-300 border-t-4 border-t-amber-500 rounded-[32px] group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-amber-500 transition-colors">Upcoming Event</CardTitle>
            <div className="p-2 bg-amber-50 rounded-xl">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-800 tracking-tight tabular-nums truncate">{nextAlert?.alert?.when_at ? format(new Date(nextAlert.alert.when_at), 'p') : '—'}</div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {nextAlert?.alert ? (nextAlert.alert.medicine_name || 'Scheduled dose') : 'No upcoming packets'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-100 shadow-2xl shadow-slate-200/30 rounded-[40px] overflow-hidden">
        <CardHeader className="border-b border-slate-50 py-6 px-8 bg-slate-50/30">
          <CardTitle className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Historic Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-8">
          <div className="grid grid-cols-1 gap-4">
            {(today?.logs?.length ? today.logs : (todayAlerts || [])).slice(0, 4).map((l:any, idx:number) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white border border-slate-100 rounded-[24px] gap-4 hover:border-primary/20 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md group">
                <div className="flex-1 min-w-0">
                  {today?.logs?.length ? (
                    <>
                      <p className="font-black text-slate-800 text-base md:text-lg tracking-tight">Pain Registry: {l.pain_level ?? '—'}/10 {Number.isFinite(l.fatigue_level) ? `• Fatigue: ${l.fatigue_level}/10` : ''}</p>
                      {l.notes && <p className="text-xs md:text-sm text-slate-500 font-bold italic mt-1.5 opacity-80 select-text">“{l.notes}”</p>}
                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 group-hover:bg-white group-hover:text-primary transition-colors">
                          {format(new Date(l.created_at), 'p')}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-black text-slate-800 text-base md:text-lg tracking-tight flex items-center capitalize">
                        <div className="p-2 bg-primary/5 rounded-xl mr-3">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        {l.medicine_name || 'Medication Package'}
                      </p>
                      <p className="text-xs text-slate-500 font-bold mt-1.5 px-1">{l.dosage || ''} {l.frequency_per_day ? `• ${l.frequency_per_day}x/day` : ''}</p>
                      <div className="flex items-center gap-3 mt-2.5 px-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 opacity-70">
                          <Clock className="h-3.5 w-3.5" />
                          {l.when_at ? format(new Date(l.when_at), 'p') : ''}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="shrink-0 w-full sm:w-auto">
                  <span className={`inline-flex items-center justify-center w-full sm:w-auto text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg shadow-black/5 ${today?.logs?.length ? 'bg-amber-50 text-amber-600 border border-amber-100' : (String(l.status || '').toLowerCase()==='taken' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200')}`}>
                    {today?.logs?.length ? 'Logged' : (String(l.status || '').toLowerCase()==='taken' ? 'Status: Taken' : 'Status: Pending')}
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
