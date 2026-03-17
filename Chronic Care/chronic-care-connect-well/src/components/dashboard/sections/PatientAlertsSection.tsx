import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { io } from "socket.io-client";

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

  // Realtime: auto-refresh when new alerts arrive
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    const refetch = () => qc.invalidateQueries({ queryKey: ["patientAlerts"] });
    socket.on('alert:scheduled', refetch);
    socket.on('alert:due', refetch);
    socket.on('alert:email_sent', refetch);
    socket.on('alert:upcoming', (payload: any) => {
      // Try to capture the specific event id to show the tag; fallback to refetch
      const id = payload?.id ?? payload?.eventId ?? payload?.event_id;
      if (typeof id === 'number') {
        setUpcomingIds((prev) => new Set(prev).add(id));
      }
      refetch();
    });
    return () => {
      socket.disconnect();
    };
  }, [token, qc]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Medication Alerts</h1>
      </div>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-white">Your Alerts</CardTitle>
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
              <div className="flex items-center gap-2">
                <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className="bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1 h-9" />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className="bg-gray-900 text-gray-200 border border-gray-700 rounded px-2 py-1 h-9" />
                {(fromDate || toDate || statusFilter!=='all') && (
                  <Button size="sm" variant="ghost" onClick={()=>{ setFromDate(''); setToDate(''); setStatusFilter('all'); }}>Clear</Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-40 bg-gray-700/50 rounded animate-pulse" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">When</TableHead>
                    <TableHead className="text-gray-300">Medicine</TableHead>
                    <TableHead className="text-gray-300">Dose</TableHead>
                    <TableHead className="text-gray-300">Frequency</TableHead>
                    <TableHead className="text-gray-300">Order</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedAlerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400">No alerts</TableCell>
                    </TableRow>
                  )}
                  {displayedAlerts.map((a: any) => (
                    <TableRow key={a.id} className="border-gray-700">
                      <TableCell className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{a.when_at ? format(new Date(a.when_at), 'PP p') : ''}</span>
                          {upcomingIds.has(a.id) && String(a.status).toLowerCase() === 'pending' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-600/40">Upcoming in 2 min</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{a.medicine_name}</TableCell>
                      <TableCell className="text-gray-300">{a.dosage || '-'}</TableCell>
                      <TableCell className="text-gray-300">{a.frequency_per_day ? `${a.frequency_per_day}x/day` : '-'}</TableCell>
                      <TableCell className="text-gray-300">#{a.order_id}</TableCell>
                      <TableCell className="text-gray-300">{a.status || 'pending'}</TableCell>
                      <TableCell>
                        {String(a.status).toLowerCase() !== 'taken' ? (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markTaken.mutate(a.id)} disabled={markTaken.isPending}>Mark as taken</Button>
                        ) : (
                          <span className="text-xs text-gray-400">Completed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <span className="text-gray-400 text-sm">Page {page} / {totalPages}</span>
                <div className="space-x-2">
                  <Button variant="outline" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</Button>
                  <Button variant="outline" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next</Button>
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
