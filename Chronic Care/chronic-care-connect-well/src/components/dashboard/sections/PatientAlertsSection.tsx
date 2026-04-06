import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/components/ui/sonner";
import { io } from "socket.io-client";
import { CheckCircle } from "lucide-react";

import { API_URL } from '@/lib/utils';

export function PatientAlertsSection() {
  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '', []);
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'taken'>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [upcomingIds, setUpcomingIds] = useState<Set<number>>(() => new Set());
  const [singleMode, setSingleMode] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["patientAlerts", page],
    enabled: !!token,
    queryFn: async () => {
      if (singleMode) {
        const res = await fetch(`${API_URL}/alerts/my/next`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        const next = body?.alert ? [body.alert] : [];
        return { alerts: next, total: next.length } as { alerts: any[]; total: number };
      } else {
        const res = await fetch(`${API_URL}/alerts/my?page=${page}&pageSize=${pageSize}`, { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        return {
          alerts: Array.isArray(body?.alerts) ? body.alerts : [],
          total: Number(body?.total || 0),
        } as { alerts: any[]; total: number };
      }
    }
  });

  const markTaken = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/alerts/${id}/mark-taken`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const b = await res.json();
      if (!res.ok || b?.error) throw new Error(b?.error || 'Failed to mark as taken');
      return b;
    },
    onSuccess: () => {
      toast.success('Marked as taken');
      qc.invalidateQueries({ queryKey: ["patientAlerts"] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to mark as taken'),
  });

  const alerts = data?.alerts || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Request sidebar to refresh the badge count from server (avoids pagination undercount)
  useEffect(() => {
    const evt = new Event('patient-alerts:refreshCount');
    window.dispatchEvent(evt);
  }, [alerts]);

  // Realtime: auto-refresh when new alerts arrive (requested by sidebar or other components)
  useEffect(() => {
    const handleRefresh = () => {
      qc.invalidateQueries({ queryKey: ["patientAlerts"] });
    };
    window.addEventListener('patient-alerts:refresh', handleRefresh);
    return () => {
      window.removeEventListener('patient-alerts:refresh', handleRefresh);
    };
  }, [qc]);


  // Keep upcomingIds only for visible pending alerts
  useEffect(() => {
    setUpcomingIds((prev) => {
      const next = new Set<number>();
      alerts.forEach((a: any) => {
        if (String(a?.status || '').toLowerCase() === 'pending' && prev.has(a?.id)) {
          next.add(a.id);
        }
      });
      return next;
    });
  }, [alerts]);

  const displayedAlerts = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    return (alerts || []).filter((a: any) => {
      const st = String(a?.status || '').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (a?.when_at && (from || to)) {
        const w = new Date(a.when_at);
        if (from && w < from) return false;
        if (to && w > to) return false;
      }
      return true;
    });
  }, [alerts, statusFilter, fromDate, toDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Medication Alerts</h1>
      </div>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-foreground">Your Alerts</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <div className="inline-flex rounded-md shadow-sm mr-2" role="group">
                <Button size="sm" variant={singleMode ? 'default':'outline'} onClick={()=>{ setSingleMode(true); setPage(1); qc.invalidateQueries({ queryKey: ["patientAlerts"] }); }}>Next only</Button>
                <Button size="sm" variant={!singleMode ? 'default':'outline'} onClick={()=>{ setSingleMode(false); qc.invalidateQueries({ queryKey: ["patientAlerts"] }); }}>All</Button>
              </div>
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <Button size="sm" variant={statusFilter==='all' ? 'default':'outline'} className="rounded-r-none" onClick={() => setStatusFilter('all')}>All</Button>
                <Button size="sm" variant={statusFilter==='pending' ? 'default':'outline'} className="rounded-none" onClick={() => setStatusFilter('pending')}>Pending</Button>
                <Button size="sm" variant={statusFilter==='taken' ? 'default':'outline'} className="rounded-l-none" onClick={() => setStatusFilter('taken')}>Taken</Button>
              </div>
              <div className="flex items-center gap-3 bg-secondary/30 p-1 rounded-lg border border-border/50">
                <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className="bg-background text-foreground border-none focus:ring-0 text-xs font-bold rounded px-2 py-1 h-8" />
                <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">to</span>
                <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className="bg-background text-foreground border-none focus:ring-0 text-xs font-bold rounded px-2 py-1 h-8" />
                {(fromDate || toDate || statusFilter!=='all') && (
                  <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase tracking-tight hover:bg-destructive/10 hover:text-destructive" onClick={()=>{ setFromDate(''); setToDate(''); setStatusFilter('all'); }}>Clear</Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-40 bg-secondary rounded animate-pulse" />
          ) : (
            <>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table className="min-w-[700px] sm:min-w-full">
                <TableHeader>
                  <TableRow className="border-border bg-secondary/20">
                    <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest py-4">When</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest py-4">Medicine</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest py-4">Dose</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest py-4">Frequency</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest py-4">Order</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest py-4">Status</TableHead>
                    <TableHead className="text-muted-foreground text-[10px] font-black uppercase tracking-widest py-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAlerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400">No alerts</TableCell>
                    </TableRow>
                  )}
                   {displayedAlerts.map((a: any) => (
                    <TableRow key={a.id} className="border-border">
                      <TableCell className="text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{a.when_at ? format(new Date(a.when_at), 'p') : ''}</span>
                          <span className="text-[10px] text-muted-foreground/60">{a.when_at ? format(new Date(a.when_at), 'PP') : ''}</span>
                          {upcomingIds.has(a.id) && String(a.status).toLowerCase() === 'pending' && (
                            <span className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 shadow-sm animate-pulse">Upcoming</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground font-black flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary/20" />
                        {a.medicine_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-bold">{a.dosage || '-'}</TableCell>
                      <TableCell className="text-muted-foreground font-bold">{a.frequency_per_day ? `${a.frequency_per_day}x/day` : '-'}</TableCell>
                      <TableCell className="text-muted-foreground font-medium">#{a.order_id}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm ${String(a.status || '').toLowerCase() === 'taken' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                          {a.status || 'pending'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {String(a.status).toLowerCase() !== 'taken' ? (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md h-8 text-[11px] transition-all hover:scale-105" onClick={() => markTaken.mutate(a.id)} disabled={markTaken.isPending}>Mark Taken</Button>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                             <CheckCircle className="h-3 w-3" />
                             Completed
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-muted-foreground text-sm">Page {page} / {totalPages}</span>
                <div className="space-x-2">
                  <Button variant="outline" className="border-border text-foreground hover:bg-accent" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
                  <Button variant="outline" className="border-border text-foreground hover:bg-accent" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PatientAlertsSection;
