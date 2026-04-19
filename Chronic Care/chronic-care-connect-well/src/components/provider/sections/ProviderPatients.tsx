
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Search, AlarmClock, Users, RefreshCw, Calendar } from "lucide-react";
import React, { useState } from "react";

import { API_URL } from "@/lib/utils";
import { getMedType } from "@/lib/med-utils";

export const ProviderPatients = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [remPatient, setRemPatient] = useState<any | null>(null);
  const { data: patients, isLoading } = useQuery({
    queryKey: ["providerPatients"],
    queryFn: async () => {
      if (!token) return [] as any[];
      const res = await fetch(`${API_URL}/orders/provider/patients`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      return Array.isArray(body?.patients) ? body.patients : [];
    },
    enabled: !!token,
  });

  // Load assigned orders to chart where orders are in the provider↔patient journey
  const { data: assignedOrders, isLoading: loadingAssigned } = useQuery({
    queryKey: ["providerAssignedForPatients"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/assigned`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      return Array.isArray(body?.orders) ? body.orders : [];
    }
  });

  const filtered = (patients || []).filter((p:any)=>{
    const q = search.trim().toLowerCase();
    const matches = !q || (p.full_name||'').toLowerCase().includes(q) || (p.email||'').toLowerCase().includes(q) || (p.phone||'').toLowerCase().includes(q);
    // statusFilter is a placeholder for future use; keep "all" behavior
    return matches && (statusFilter === 'all');
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="h-10 bg-slate-100 rounded-2xl w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-white border border-slate-100 rounded-[32px] animate-pulse shadow-sm"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Clinical Registry</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5 italic">Patient Population Nexus</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search subjects..." className="pl-11 bg-slate-50 border-slate-100 text-slate-800 placeholder:text-slate-400 w-72 rounded-2xl h-12 focus:ring-emerald-500/10 shadow-inner font-bold" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-50 border-slate-100 text-slate-800 w-44 rounded-2xl h-12 font-bold focus:ring-emerald-500/10 transition-all">
              <SelectValue placeholder="Protocol Filter" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-2xl shadow-2xl">
              <SelectItem value="all" className="font-bold text-slate-800">All Subjects</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-white border border-slate-100 rounded-[40px] shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-8">
          <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Distribution Telemetry</CardTitle>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active patient journey monitoring</p>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          {loadingAssigned ? (
            <div className="h-64 bg-slate-50 rounded-[32px] animate-pulse flex items-center justify-center">
               <RefreshCw className="h-8 w-8 text-slate-100 animate-spin" />
            </div>
          ) : (
            (() => {
              const ords = assignedOrders || [];
              const norm = (s: any) => String(s || '').toLowerCase();
              const counts = { awaiting_provider: 0, awaiting_payment: 0, awaiting_admin: 0, in_progress: 0, delivered: 0 };
              for (const o of ords) {
                const providerConfirmed = !!(o.provider_confirmed || o.provider_available);
                const paymentConfirmed = norm(o.payment_status) === 'confirmed';
                const adminApproved = norm(o.admin_status) === 'approved';
                const isDelivered = norm(o.pharmacy_status) === 'delivered';
                if (isDelivered) counts.delivered++;
                else if (!providerConfirmed) counts.awaiting_provider++;
                else if (!paymentConfirmed) counts.awaiting_payment++;
                else if (!adminApproved) counts.awaiting_admin++;
                else counts.in_progress++;
              }

              const data = [{
                name: 'Distribution Flow',
                awaiting_provider: counts.awaiting_provider,
                awaiting_payment: counts.awaiting_payment,
                awaiting_admin: counts.awaiting_admin,
                in_progress: counts.in_progress,
                delivered: counts.delivered,
              }];

              const config = {
                awaiting_provider: { label: 'Auth Pending', color: '#60a5fa' },
                awaiting_payment: { label: 'Pmt Pending', color: '#f59e0b' },
                awaiting_admin: { label: 'Admin Review', color: '#f97316' },
                in_progress: { label: 'Distribution', color: '#10b981' },
                delivered: { label: 'Fulfilled', color: '#8b5cf6' },
              } as const;

              return (
                <ChartContainer config={config as any} className="h-64 mt-4">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#64748b" fontSize={10} fontStyle="bold" />
                    <YAxis allowDecimals={false} stroke="#64748b" fontSize={10} />
                    <ChartTooltip cursor={{ fill: '#f8fafc' }} content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="awaiting_provider" stackId="a" fill="#60a5fa" radius={[12,12,0,0]} />
                    <Bar dataKey="awaiting_payment" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="awaiting_admin" stackId="a" fill="#f97316" />
                    <Bar dataKey="in_progress" stackId="a" fill="#10b981" />
                    <Bar dataKey="delivered" stackId="a" fill="#8b5cf6" />
                  </BarChart>
                </ChartContainer>
              );
            })()
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-white border border-slate-100 rounded-[40px] shadow-2xl overflow-hidden border-t-8 border-t-emerald-500">
        <CardHeader className="border-b border-slate-50 p-8">
          <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Active Population Profiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/80 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Subject Telemetry</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Birth Data</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Clinical Conditions</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Engagement Nexus</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest italic leading-loose">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      Registry Synchronization Pending...
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((patient:any) => (
                  <TableRow key={patient.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors group">
                    <TableCell className="px-6 py-6 border-transparent">
                       <div className="flex items-center gap-4">
                          <div className="h-11 w-11 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm uppercase">
                            {patient.full_name?.[0] || 'P'}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-slate-800 font-black text-sm tracking-tight">{patient.full_name || 'Anonymous Subject'}</span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{patient.email || 'No email linked'}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell className="px-6 py-6 border-transparent">
                       <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-tighter">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                          {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM dd, yyyy') : 'Registry Missing'}
                       </div>
                    </TableCell>
                    <TableCell className="px-6 py-6 border-transparent">
                       <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                          {patient.medical_conditions?.length > 0 ? patient.medical_conditions.map((c: string) => (
                             <Badge key={c} variant="outline" className="bg-slate-50 text-slate-600 border-slate-100 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest group-hover:bg-white transition-colors">
                                {c.replace(/_/g, ' ')}
                             </Badge>
                          )) : <span className="text-[10px] font-bold text-slate-300 italic uppercase">Observation Pending</span>}
                       </div>
                    </TableCell>
                    <TableCell className="px-6 py-6 border-transparent">
                      <div className="flex gap-2 min-w-[340px]">
                        <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50 rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest transition-all" onClick={()=>setOpenId(patient.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Metrics
                        </Button>
                        <Button size="sm" variant="ghost" className="text-indigo-600 hover:bg-indigo-50 rounded-2xl h-12 px-2 transition-all" onClick={()=>{ setRemPatient(patient); }}>
                          <AlarmClock className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer for patient details */}
      <Drawer open={openId!=null} onOpenChange={(v)=>{ if (!v) setOpenId(null); }}>
        <DrawerContent className="bg-gray-900 border-gray-700 text-white">
          <DrawerHeader>
            <DrawerTitle>Patient Details</DrawerTitle>
          </DrawerHeader>
          <PatientSummary patientId={openId} token={token || ''} />
          <DrawerFooter>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">Showing latest 10 items</div>
              <Button 
                variant="outline" 
                className="border-gray-600 text-white hover:bg-gray-700"
                onClick={() => setOpenId(null)}
              >
                Back
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Set Reminder Dialog */}
      <ReminderDialog
        open={!!remPatient}
        onOpenChange={(v)=>{ if (!v) setRemPatient(null); }}
        patient={remPatient}
        token={token || ''}
      />
    </div>
  );
};

function PatientSummary({ patientId, token }: { patientId: number | null; token: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["patientSummary", patientId],
    enabled: !!token && !!patientId,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/patients/${patientId}/summary`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await res.json();
      return { orders: b.orders || [], prescriptions: b.prescriptions || [] };
    }
  });
  if (!patientId) return null as any;
  if (isLoading) return <div className="p-4 text-gray-300">Loading…</div>;
  const orders = data?.orders || [];
  const presc = data?.prescriptions || [];
  return (
    <div className="p-4 grid md:grid-cols-2 gap-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader><CardTitle className="text-white text-base">Recent Orders</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Order</TableHead>
                <TableHead className="text-gray-300">Statuses</TableHead>
                <TableHead className="text-gray-300">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length===0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-gray-400">No orders</TableCell></TableRow>
              )}
              {orders.map((o:any)=> (
                <TableRow key={o.id} className="border-gray-700">
                  <TableCell className="text-white">#{o.id}</TableCell>
                  <TableCell className="text-gray-300">A:{o.admin_status} · D:{o.doctor_status} · Pmt:{o.payment_status} · Pharm:{o.pharmacy_status}</TableCell>
                  <TableCell className="text-gray-300">{o.created_at ? format(new Date(o.created_at), 'MMM dd, yyyy') : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader><CardTitle className="text-white text-base">Recent Prescriptions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Order</TableHead>
                <TableHead className="text-gray-300">Medicine</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presc.length===0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-400">No prescriptions</TableCell></TableRow>
              )}
              {presc.map((p:any)=> (
                <TableRow key={p.id} className="border-gray-700">
                  <TableCell className="text-white">#{p.order_id}</TableCell>
                  <TableCell className="text-gray-300">{p.medicine_name} {p.dosage ? `(${p.dosage})` : ''}</TableCell>
                  <TableCell className="text-gray-300">{p.status || 'active'}</TableCell>
                  <TableCell className="text-gray-300">{p.created_at ? format(new Date(p.created_at), 'MMM dd, yyyy') : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}



function ReminderDialog({ open, onOpenChange, patient, token }: {
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  patient: any;
  token: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["patientSummaryForReminder", patient?.id],
    enabled: open && !!patient && !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/patients/${patient.id}/summary`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await res.json();
      return { orders: b.orders || [], prescriptions: b.prescriptions || [] } as { orders: any[]; prescriptions: any[] };
    }
  });
  const orders = data?.orders || [];
  const prescriptions = data?.prescriptions || [];
  const deliveredOrders = orders.filter((o:any)=> String(o.pharmacy_status||'').toLowerCase()==='delivered');
  const [selectedOrderId, setSelectedOrderId] = React.useState<number | null>(null);
  const prescForOrder = prescriptions.filter((p:any)=> p.order_id === selectedOrderId);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = React.useState<number | null>(null);
  const [frequency, setFrequency] = React.useState<1|2|3>(1);
  const [times, setTimes] = React.useState<string[]>(["08:00"]);
  const todayStr = React.useMemo(()=> formatDateInput(new Date()), []);
  const [startDate, setStartDate] = React.useState<string>(todayStr);
  const [durationDays, setDurationDays] = React.useState<number>(7);

  // When order changes, default to first prescription
  React.useEffect(()=>{
    if (prescForOrder.length>0 && !selectedPrescriptionId) {
      setSelectedPrescriptionId(prescForOrder[0].id);
    }
  }, [selectedOrderId, data]);

  // Auto-calc duration from prescription if available
  React.useEffect(()=>{
    const pres = prescriptions.find((p:any)=> p.id===selectedPrescriptionId);
    if (!pres) return;
    const qty = Number(pres.quantity)||0;
    const freq = Number(pres.frequency_per_day)||Number(frequency)||1;
    if (qty>0 && freq>0) setDurationDays(Math.max(1, Math.ceil(qty / freq)));
  }, [selectedPrescriptionId, frequency]);

  // Keep times array length in sync with frequency
  React.useEffect(()=>{
    const n = Number(frequency)||1;
    setTimes((prev)=>{
      const base = prev.slice(0, n);
      const defaults = ["08:00","14:00","20:00"];
      while (base.length < n) base.push(defaults[base.length] || "08:00");
      return base;
    });
  }, [frequency]);

  const endDate = React.useMemo(()=> addDaysStr(startDate, Math.max(0, (durationDays||1)-1)), [startDate, durationDays]);

  // Load existing reminders created by this provider for this patient
  const { data: myReminders, refetch: refetchReminders, isFetching: fetchingRem } = useQuery({
    queryKey: ["providerReminders", patient?.id],
    enabled: open && !!patient && !!token,
    queryFn: async () => {
      const url = `${API_URL}/alerts/provider/reminders?patient_id=${patient.id}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const b = await res.json();
      return Array.isArray(b?.reminders) ? b.reminders : [];
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Medication Reminder {patient ? `for ${patient.full_name || 'Patient'}` : ''}</DialogTitle>
          <DialogDescription className="sr-only">Configure specific time alerts for the patient to ensure they take their medication as prescribed.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="p-2 text-gray-300">Loading…</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">Choose a delivered order and its prescription:</div>
            <Select value={selectedOrderId ? String(selectedOrderId) : ""} onValueChange={(v)=> setSelectedOrderId(Number(v))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={deliveredOrders.length?"Choose delivered order":"No delivered orders"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {deliveredOrders.map((o:any)=> (
                  <SelectItem key={o.id} value={String(o.id)}>Order #{o.id} • delivered {o.updated_at ? format(new Date(o.updated_at), 'MMM dd, yyyy') : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPrescriptionId ? String(selectedPrescriptionId) : ""} onValueChange={(v)=> setSelectedPrescriptionId(Number(v))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={prescForOrder.length?"Choose prescription":"No prescriptions for this order"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {prescForOrder.map((p:any)=> (
                  <SelectItem key={p.id} value={String(p.id)}>{p.medicine_name} {p.dosage?`(${p.dosage})`:''} • qty {p.quantity}{p.frequency_per_day?` • ${p.frequency_per_day}x/day`:''}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Frequency per day</label>
              <Select value={String(frequency)} onValueChange={(v)=> setFrequency(Number(v) as 1|2|3)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="1">1 time/day</SelectItem>
                  <SelectItem value="2">2 times/day</SelectItem>
                  <SelectItem value="3">3 times/day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Reminder time(s)</label>
              <div className="grid grid-cols-3 gap-2">
                {times.map((t, idx)=> (
                  <Input key={idx} type="time" className="bg-gray-800 border-gray-700 text-white" value={t} onChange={(e)=> setTimes(ts=> ts.map((x,i)=> i===idx? e.target.value : x))} />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Start date</label>
                <Input type="date" className="bg-gray-800 border-gray-700 text-white" value={startDate} onChange={(e)=> setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Duration (days)</label>
                <Input type="number" min={1} className="bg-gray-800 border-gray-700 text-white" value={durationDays} onChange={(e)=> setDurationDays(Math.max(1, Number(e.target.value)||1))} />
                <p className="text-xs text-gray-400 mt-1">Ends on {endDate}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700 mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-white">Existing Reminders</div>
                <Button variant="outline" size="sm" onClick={()=> refetchReminders()} disabled={fetchingRem}>Refresh</Button>
              </div>
              {fetchingRem ? (
                <div className="text-gray-400 text-sm">Loading reminders…</div>
              ) : (myReminders && myReminders.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-auto pr-1">
                  {myReminders.map((r:any)=> (
                    <div key={r.id} className="p-2 rounded bg-gray-800 border border-gray-700 flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <div className="text-white">{r.medicine_name || 'Medicine'} • {r.frequency_per_day}x/day</div>
                        <div className="text-gray-400 text-xs">{r.start_date} → {r.end_date} • Status: {r.status}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={async ()=>{
                          try {
                            const resp = await fetch(`${API_URL}/alerts/${r.id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
                            const b = await resp.json().catch(()=>({}));
                            if (!resp.ok || b?.error) throw new Error(b?.error || 'Cancel failed');
                            toast('Reminder canceled');
                            await refetchReminders();
                          } catch (e:any) {
                            toast(e?.message || 'Could not cancel');
                          }
                        }}>Cancel</Button>
                        <Button variant="destructive" size="sm" onClick={async ()=>{
                          if (!confirm('Delete this reminder permanently?')) return;
                          try {
                            const resp = await fetch(`${API_URL}/alerts/${r.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                            const b = await resp.json().catch(()=>({}));
                            if (!resp.ok || b?.error) throw new Error(b?.error || 'Delete failed');
                            toast('Reminder deleted');
                            await refetchReminders();
                          } catch (e:any) {
                            toast(e?.message || 'Could not delete');
                          }
                        }}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-sm">No reminders yet for this patient.</div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            disabled={!selectedOrderId || !selectedPrescriptionId || times.some(t=>!t)}
            onClick={async ()=>{
              if (!selectedOrderId || !selectedPrescriptionId) return;
              try {
                const res = await fetch(`${API_URL}/alerts/reminders`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    patient_id: patient.id,
                    order_id: selectedOrderId,
                    prescription_id: selectedPrescriptionId,
                    frequency_per_day: Number(frequency),
                    times,
                    start_date: startDate,
                    end_date: endDate,
                  })
                });
                const body = await res.json();
                if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to schedule reminder');
                toast('Reminder scheduled', { description: `Patient will be alerted at set times.` });
                onOpenChange(false);
                try { await refetchReminders(); } catch {}
              } catch (e:any) {
                toast(e?.message || 'Could not schedule reminder');
              }
            }}
          >Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function addDaysStr(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
}
