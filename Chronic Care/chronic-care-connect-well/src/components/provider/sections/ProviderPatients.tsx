
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
import { Eye, FileText, Search, AlarmClock } from "lucide-react";
import React, { useState } from "react";

import { API_URL } from "@/lib/utils";
import { getMedType } from "@/lib/med-utils";

export const ProviderPatients = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [prescPatient, setPrescPatient] = useState<any | null>(null);
  const [prescForm, setPrescForm] = useState<{ medicine_name: string; quantity: string; dose_amount: string; dose_unit: string; times_per_day: number; instructions: string }>({ 
    medicine_name: "", quantity: "", dose_amount: "1", dose_unit: "piece(s)", times_per_day: 1, instructions: "" 
  });
  const [prescOrderId, setPrescOrderId] = useState<number | null>(null);
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
    return <div className="text-white">Loading patients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Patient Management</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name, email, phone" className="pl-9 bg-gray-800 border-gray-700 text-white" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-36">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Journey Chart */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Orders between Provider and Patient</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAssigned ? (
            <div className="h-52 bg-gray-700/50 rounded animate-pulse" />
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
                name: 'Orders',
                awaiting_provider: counts.awaiting_provider,
                awaiting_payment: counts.awaiting_payment,
                awaiting_admin: counts.awaiting_admin,
                in_progress: counts.in_progress,
                delivered: counts.delivered,
              }];

              const config = {
                awaiting_provider: { label: 'Awaiting Provider', color: '#60a5fa' },
                awaiting_payment: { label: 'Awaiting Payment', color: '#f59e0b' },
                awaiting_admin: { label: 'Awaiting Admin', color: '#f97316' },
                in_progress: { label: 'Prescribing / In Progress', color: '#10b981' },
                delivered: { label: 'Delivered', color: '#8b5cf6' },
              } as const;

              return (
                <ChartContainer config={config as any} className="h-64">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#9ca3af" />
                    <YAxis allowDecimals={false} stroke="#9ca3af" />
                    <ChartTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltipContent />} />
                    {/* Legend */}
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="awaiting_provider" stackId="a" fill="var(--color-awaiting_provider)" radius={[4,4,0,0]} />
                    <Bar dataKey="awaiting_payment" stackId="a" fill="var(--color-awaiting_payment)" />
                    <Bar dataKey="awaiting_admin" stackId="a" fill="var(--color-awaiting_admin)" />
                    <Bar dataKey="in_progress" stackId="a" fill="var(--color-in_progress)" />
                    <Bar dataKey="delivered" stackId="a" fill="var(--color-delivered)" />
                  </BarChart>
                </ChartContainer>
              );
            })()
          )}
        </CardContent>
      </Card>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Patient Health Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Phone</TableHead>
                <TableHead className="text-gray-300">Date of Birth</TableHead>
                <TableHead className="text-gray-300">Medical Conditions</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400">No patients yet.</TableCell>
                </TableRow>
              )}
              {filtered.map((patient:any) => (
                <TableRow key={patient.id} className="border-gray-700">
                  <TableCell className="text-white">{patient.full_name || 'N/A'}</TableCell>
                  <TableCell className="text-gray-300">{patient.email || 'N/A'}</TableCell>
                  <TableCell className="text-gray-300">{patient.phone || 'N/A'}</TableCell>
                  <TableCell className="text-gray-300">
                    {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-gray-300 capitalize">
                    {patient.medical_conditions?.map((c: string) => c.replace(/_/g, ' ')).join(', ') || 'None listed'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="border-blue-600 text-blue-400" onClick={()=>setOpenId(patient.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="border-green-600 text-green-400" onClick={()=>{ setPrescPatient(patient); setPrescForm({ medicine_name: "", quantity: "", dose_amount: "1", dose_unit: "piece(s)", times_per_day: 1, instructions: "" }); setPrescOrderId(null); }}>
                        <FileText className="h-4 w-4 mr-1" />
                        Prescribe
                      </Button>
                      <Button size="sm" variant="outline" className="border-purple-600 text-purple-400" onClick={()=>{ setRemPatient(patient); }}>
                        <AlarmClock className="h-4 w-4 mr-1" />
                        Set Reminder
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      {/* Prescribe Dialog */}
      <PrescribeDialog
        open={!!prescPatient}
        onOpenChange={(v)=>{ if (!v) { setPrescPatient(null); setPrescOrderId(null); } }}
        patient={prescPatient}
        token={token || ''}
        form={prescForm}
        setForm={setPrescForm}
        selectedOrderId={prescOrderId}
        setSelectedOrderId={setPrescOrderId}
      />

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


function PrescribeDialog({ open, onOpenChange, patient, token, form, setForm, selectedOrderId, setSelectedOrderId }: {
  open: boolean;
  onOpenChange: (v:boolean)=>void;
  patient: any;
  token: string;
  form: { medicine_name: string; quantity: string; dose_amount: string; dose_unit: string; times_per_day: number; instructions: string };
  setForm: React.Dispatch<React.SetStateAction<{ medicine_name: string; quantity: string; dose_amount: string; dose_unit: string; times_per_day: number; instructions: string }>>;
  selectedOrderId: number | null;
  setSelectedOrderId: (v:number|null)=>void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["patientSummaryForPresc", patient?.id],
    enabled: open && !!patient && !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/patients/${patient.id}/summary`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await res.json();
      return { orders: b.orders || [] } as { orders: any[] };
    }
  });
  const orders = data?.orders || [];
  const eligible = orders.filter((o:any)=> String(o.admin_status||'').toLowerCase()==='approved' && String(o.pharmacy_status||'').toLowerCase()!=='delivered');

  const [remindersEnabled, setRemindersEnabled] = React.useState(true);
  const [reminderTimes, setReminderTimes] = React.useState<string[]>(["08:00"]);
  const [reminderStartDate, setReminderStartDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [reminderDuration, setReminderDuration] = React.useState<number>(7);

  // Keep reminder times in sync with frequency
  React.useEffect(() => {
    const n = Number(form.times_per_day) || 1;
    setReminderTimes(prev => {
      const base = prev.slice(0, n);
      const defaults = ["08:00", "14:00", "20:00", "04:00"];
      while (base.length < n) base.push(defaults[base.length] || "08:00");
      return base;
    });
  }, [form.times_per_day]);

  // Clinical Unified Hook logic relocated to top level (Fix React Hook Rule Violation)
  React.useEffect(() => {
    if (!open || !form.medicine_name) return;
    const info = getMedType(form.medicine_name);
    if (!form.dose_unit || form.dose_unit === 'piece(s)') {
       setForm(f=>({...f, dose_unit: info.unit}));
    }
  }, [form.medicine_name, open]);

  // Auto-calc duration from quantity/freq (Total Clinical Accuracy)
  React.useEffect(() => {
    const qty = Number(form.quantity) || 0;
    const dose = Number(form.dose_amount) || 1;
    const times = Number(form.times_per_day) || 1;
    const dailyTotal = dose * times;
    if (qty > 0 && dailyTotal > 0) {
      setReminderDuration(Math.max(1, Math.ceil(qty / dailyTotal)));
    }
  }, [form.quantity, form.dose_amount, form.times_per_day]);

  // Preselect latest eligible order when dialog opens and pre-fill form
  React.useEffect(()=>{
    if (!open) return;
    if (eligible.length>0 && !selectedOrderId) {
      const latest = eligible.slice().sort((a:any,b:any)=> new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime())[0];
      setSelectedOrderId(latest?.id || null);
      
      // Auto-prefill if doctor provided details
      const doctorDosage = latest.dosage || '';
      const m = doctorDosage.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z/]+)$/);
      const dAmount = m ? m[1] : (doctorDosage.match(/^\d+$/) ? doctorDosage : '1');
      const dUnit = m ? m[2] : 'piece(s)';

      setForm({
        medicine_name: latest.medicine_name || '',
        quantity: String(latest.prescription_quantity || ''),
        dose_amount: dAmount,
        dose_unit: dUnit,
        times_per_day: 1,
        instructions: latest.doctor_instructions || ''
      });
    }
  }, [open, data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>New Prescription {patient ? `for ${patient.full_name || 'Patient'}` : ''}</DialogTitle>
          <DialogDescription className="sr-only">Enter the medication name, quantity, and specific instructions for the patient to follow.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="p-2 text-gray-300">Loading orders…</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">Select an eligible order (Admin Approved):</div>
            <Select value={selectedOrderId ? String(selectedOrderId) : ""} onValueChange={(v)=> setSelectedOrderId(Number(v))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={eligible.length?"Choose order":"No eligible orders"} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {eligible.map((o:any)=> (
                  <SelectItem key={o.id} value={String(o.id)}>Order #{o.id} • created {o.created_at ? format(new Date(o.created_at), 'MMM dd, yyyy') : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(() => {
              const info = getMedType(form.medicine_name);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-300 mb-1">Medicine Name</label>
                    <Input className="bg-gray-800 border-gray-700 text-white" value={form.medicine_name} onChange={(e)=> setForm(f => ({ ...f, medicine_name: e.target.value }))} placeholder="e.g. Metformin 500mg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">{info.totalLabel}</label>
                    <Input className="bg-gray-800 border-gray-700 text-white" value={form.quantity} onChange={(e)=> setForm(f => ({ ...f, quantity: e.target.value }))} placeholder={info.placeholder} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Dose Amount</label>
                      <Input type="number" className="bg-gray-800 border-gray-700 text-white" value={form.dose_amount} onChange={(e)=> setForm(f => ({ ...f, dose_amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Unit</label>
                      <Input className="bg-gray-800 border-gray-700 text-white" value={form.dose_unit} onChange={(e)=> setForm(f => ({ ...f, dose_unit: e.target.value }))} placeholder="ml, tabs, etc." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Times per Day</label>
                    <Input type="number" min={1} max={6} className="bg-gray-800 border-gray-700 text-white" value={form.times_per_day} onChange={(e)=> setForm(f => ({ ...f, times_per_day: Number(e.target.value) || 1 }))} />
                    {Number(form.times_per_day) > 0 && Number(form.quantity) > 0 && (
                      <p className="text-[10px] text-emerald-400 mt-1 font-medium">
                        Total Daily: {Number(form.dose_amount) * Number(form.times_per_day)} {form.dose_unit} • Duration: {Math.ceil(Number(form.quantity) / (Number(form.dose_amount) * Number(form.times_per_day)))} day(s)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Instructions</label>
                    <Textarea className="bg-gray-800 border-gray-700 text-white" rows={2} value={form.instructions} onChange={(e)=> setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="e.g. Take after meals" />
                  </div>
                </div>
              );
            })()}

            <div className="pt-3 border-t border-gray-700 mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-400">Schedule Medication Reminders</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">{remindersEnabled ? 'Enabled' : 'Disabled'}</span>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" 
                    checked={remindersEnabled} 
                    onChange={e => setRemindersEnabled(e.target.checked)} 
                  />
                </div>
              </div>
              
              {remindersEnabled && (
                <div className="space-y-3 p-3 bg-emerald-950/20 rounded border border-emerald-900/30">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Reminder time(s)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {reminderTimes.map((t, idx) => (
                        <Input 
                          key={idx} 
                          type="time" 
                          className="bg-gray-800 border-gray-700 text-white h-8 text-xs" 
                          value={t} 
                          onChange={e => setReminderTimes(ts => ts.map((x, i) => i === idx ? e.target.value : x))} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Start date</label>
                      <Input 
                        type="date" 
                        className="bg-gray-800 border-gray-700 text-white h-8 text-xs" 
                        value={reminderStartDate} 
                        onChange={e => setReminderStartDate(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">Duration (days)</label>
                      <Input 
                        type="number" 
                        min={1} 
                        className="bg-gray-800 border-gray-700 text-white h-8 text-xs" 
                        value={reminderDuration} 
                        onChange={e => setReminderDuration(Number(e.target.value) || 1)} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!selectedOrderId || !patient || !form.medicine_name.trim() || !form.quantity.trim()}
            onClick={async ()=>{
              if (!selectedOrderId || !patient) return;
              try {
                // 1. Create Prescription
                const res = await fetch(`${API_URL}/orders/${selectedOrderId}/prescriptions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    patient_id: patient.id,
                    medicine_name: form.medicine_name.trim(),
                    quantity: form.quantity.trim(),
                    dosage: `${form.dose_amount}${form.dose_unit}`,
                    frequency_per_day: Number(form.times_per_day),
                    instructions: form.instructions.trim()
                  })
                });
                const body = await res.json();
                if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to create prescription');
                
                // 2. Optional: Create Reminders
                if (remindersEnabled) {
                  try {
                    const endDate = addDaysStr(reminderStartDate, Math.max(0, (Number(reminderDuration) || 1) - 1));
                    await fetch(`${API_URL}/alerts/reminders`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        patient_id: patient.id,
                        order_id: selectedOrderId,
                        prescription_id: body.prescription.id,
                        frequency_per_day: Number(form.times_per_day),
                        dosage: `${form.dose_amount}${form.dose_unit}`,
                        times: reminderTimes,
                        start_date: reminderStartDate,
                        end_date: endDate,
                      })
                    });
                  } catch (remErr) {
                    console.warn('Reminder creation failed, but prescription was created', remErr);
                  }
                }

                toast('Prescription created', { description: remindersEnabled ? 'Medication and reminders scheduled successfully.' : `Admin & patient notified for Order #${selectedOrderId}` });
                onOpenChange(false);
                setSelectedOrderId(null);
                setForm({ medicine_name: '', quantity: '', dose_amount: '1', dose_unit: 'piece(s)', times_per_day: 1, instructions: '' });
              } catch (e:any) {
                toast(e?.message || 'Could not create prescription');
              }
            }}
          >Create Prescription</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
