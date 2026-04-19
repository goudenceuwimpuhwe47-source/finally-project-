import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Calendar, Activity, CheckCircle2, AlertCircle, FilePlus2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

import { API_URL } from "@/lib/utils";
import { getMedType } from "@/lib/med-utils";

export const ProviderAssigned = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [confirmOrder, setConfirmOrder] = useState<any | null>(null);
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
  const [selectedQty, setSelectedQty] = useState<number>(0);
  const [unavailOrder, setUnavailOrder] = useState<any | null>(null);
  const [unavailReason, setUnavailReason] = useState<string>("");
  const [prescOrder, setPrescOrder] = useState<any | null>(null);
  const [prescForm, setPrescForm] = useState<{ patient_id: number | ""; medicine_name: string; quantity: string; instructions: string; dosage?: string; frequency_per_day?: number | "" }>({ patient_id: "", medicine_name: "", quantity: "", instructions: "" });

  // Reminder State
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);
  const [reminderStartDate, setReminderStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reminderDuration, setReminderDuration] = useState<number>(7);

  // Auto-calc duration from quantity/freq
  useEffect(() => {
    const qty = Number(prescForm.quantity) || 0;
    const dose = 1; // Base dose for simple calc
    const times = Number(prescForm.frequency_per_day) || 1;
    const dailyTotal = dose * times;
    if (qty > 0 && dailyTotal > 0) {
      setReminderDuration(Math.max(1, Math.ceil(qty / dailyTotal)));
    }
  }, [prescForm.quantity, prescForm.frequency_per_day]);

  // Keep reminder times in sync with frequency
  useEffect(() => {
    if (!prescOrder) return;
    const n = Number(prescForm.frequency_per_day) || 1;
    setReminderTimes(prev => {
      const base = prev.slice(0, n);
      const defaults = ["08:00", "14:00", "20:00", "04:00"];
      while (base.length < n) base.push(defaults[base.length] || "08:00");
      return base;
    });
  }, [prescForm.frequency_per_day, !!prescOrder]);

  // Handle dosage unit auto-detection
  useEffect(() => {
    if (!prescOrder || !prescForm.medicine_name) return;
    const info = getMedType(prescForm.medicine_name);
    if (!prescForm.dosage || prescForm.dosage === 'piece(s)') {
       setPrescForm(f=>({...f, dosage: info.unit}));
    }
  }, [prescForm.medicine_name, !!prescOrder]);

  // Load provider stock when confirm dialog is open
  const { data: stockData } = useQuery({
    queryKey: ["providerStockForConfirm"],
    enabled: !!confirmOrder,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/stock`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to load stock');
      return Array.isArray(body.items) ? body.items : [];
    }
  });

  function pickDefaultQtyFromPrescription(v: any): number {
    if (!v) return 1;
    const m = String(v).match(/\d+/);
    const n = m ? parseInt(m[0]) : 1;
    return isNaN(n) || n <= 0 ? 1 : n;
  }

  // Confirm availability: calls POST /orders/:id/provider-availability with stock_id & qty
  const confirmAvail = useMutation({
    mutationFn: async (payload: { id: number; stock_id: number; qty: number; note?: string }) => {
      const res = await fetch(`${API_URL}/orders/${payload.id}/provider-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ available: true, stock_id: payload.stock_id, quantity: payload.qty, note: payload.note || '' })
      });
      const body = await res.json();
      if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to confirm');
      return body;
    },
    onSuccess: () => { toast({ title: 'Confirmed', description: 'Availability sent to admin. Await payment.' }); qc.invalidateQueries({ queryKey: ["providerAssigned"] }); },
    onError: (err: any) => toast({ title: 'Confirm failed', description: err?.message || 'Try again', variant: 'destructive' })
  });

  // Notify unavailability: mark unavailable, releases for reassignment
  const notifyUnavailable = useMutation({
    mutationFn: async (payload: { id: number; note?: string }) => {
      const res = await fetch(`${API_URL}/orders/${payload.id}/provider-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ available: false, note: payload.note || 'Not available' })
      });
      const body = await res.json();
      if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to notify');
      return body;
    },
    onSuccess: () => { toast({ title: 'Notified', description: 'Admin will reassign this order.' }); qc.invalidateQueries({ queryKey: ["providerAssigned"] }); },
    onError: (err: any) => toast({ title: 'Notify failed', description: err?.message || 'Try again', variant: 'destructive' })
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["providerAssigned"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json();
      if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to load assigned orders');
      return Array.isArray(body.orders) ? body.orders : [];
    }
  });

  // Realtime: refresh list on payment and admin approval
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    const onPaid = (p: any) => { toast({ title: 'Payment received', description: `Order #${p?.orderId} has been paid.` }); qc.invalidateQueries({ queryKey: ["providerAssigned"] }); };
    const onApproved = (p: any) => { toast({ title: 'Order Approved', description: `Admin approved Order #${p?.orderId}. Prepare prescription.` }); qc.invalidateQueries({ queryKey: ["providerAssigned"] }); };
    socket.on('order:payment_received', onPaid);
    socket.on('order:admin_approved', onApproved);
    return () => { socket.disconnect(); };
  }, [token]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="h-10 bg-slate-100 rounded-2xl w-64 animate-pulse"></div>
        <div className="grid grid-cols-1 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-24 bg-white border border-slate-100 rounded-3xl animate-pulse shadow-sm"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-rose-100 rounded-3xl shadow-xl overflow-hidden">
        <CardContent className="p-10 text-center">
          <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
             <Activity className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="text-slate-800 font-black uppercase tracking-tight text-lg">Registry Connection Failure</h3>
          <p className="text-slate-400 font-bold mb-6 italic">Unable to synchronize with the distribution ledger.</p>
          <Button variant="outline" className="rounded-xl font-bold border-slate-200" onClick={() => refetch()}>Retransfer Manifest</Button>
        </CardContent>
      </Card>
    );
  }

  const orders = data || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Assigned Manifests</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5 italic">Clinical Fulfillment Registry</p>
          </div>
        </div>
        <div className="bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100">
           <span className="text-xs font-black text-slate-800">{orders.length}</span>
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-2">Total Manifests</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-white border-slate-100 shadow-xl rounded-[40px] overflow-hidden border-t-8 border-t-emerald-500">
          <CardContent className="p-20 text-center">
            <div className="h-24 w-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
               <Package className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-slate-800 font-black uppercase tracking-tight text-xl">Registry Clear</h3>
            <p className="text-slate-400 font-bold italic mt-2">All clinical distribution cycles currently synchronized.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white border border-slate-100 rounded-[40px] shadow-2xl overflow-hidden border-t-8 border-t-emerald-500">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/80 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Manifest ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Patient Telemetry</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Dist. Medication</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Qty / Unit</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Clinical Logic</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Distribution Node</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16 text-center">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors group">
                    <TableCell className="px-6 py-6">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-black text-sm tracking-tight">#{o.id}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{new Date(o.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                          {o.full_name?.[0] || 'P'}
                        </div>
                        <span className="text-slate-800 font-bold text-sm tracking-tight">{o.full_name || 'Manifest Patient'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                       <span className="text-slate-800 font-black text-xs uppercase tracking-tight block max-w-[200px] leading-tight line-clamp-2">{o.medicine_name || '-'}</span>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                       <div className="flex items-baseline gap-1">
                          <span className="text-slate-800 font-black text-sm">{o.prescription_quantity || '-'}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Units</span>
                       </div>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                      <div className="max-w-[250px]">
                        <p className="text-[11px] font-bold text-slate-500 italic drop-shadow-sm leading-relaxed line-clamp-2" title={o.doctor_instructions || ''}>
                          “{o.doctor_instructions || 'No clinical strategy provided'}”
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                      <div className="flex items-center gap-2 text-slate-500 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 group-hover:bg-white transition-all">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-[10px] font-bold truncate max-w-[150px] uppercase tracking-tighter">{o.district}, {o.sector}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-6 text-center">
                      <Badge variant="outline" className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-2 shadow-sm ${o.provider_status === 'paid' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {o.provider_status || 'authorized'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                      {o.provider_confirmed ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          {String(o.payment_status).toLowerCase() !== 'confirmed' && (
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm animate-pulse">
                              <Activity className="h-3 w-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Settlement</span>
                            </div>
                          )}
                          {String(o.payment_status).toLowerCase() === 'confirmed' && String(o.admin_status).toLowerCase() !== 'approved' && (
                            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm animate-pulse">
                              <Activity className="h-3 w-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Verification</span>
                            </div>
                          )}
                          {String(o.admin_status).toLowerCase() === 'approved' && (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                                <Activity className="h-3 w-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Protocol Approved</span>
                              </div>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 w-full"
                                onClick={() => {
                                  setPrescOrder(o);
                                  setPrescForm({
                                    patient_id: Number(o.user_id || 0) || "",
                                    medicine_name: o.medicine_name || "",
                                    quantity: o.prescription_quantity || "",
                                    instructions: o.doctor_instructions || "",
                                  });
                                }}
                              >
                                Finalize Label
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 min-w-[320px]">
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                            onClick={() => {
                              setConfirmOrder(o);
                              setSelectedStockId(null);
                              setSelectedQty(pickDefaultQtyFromPrescription(o.prescription_quantity));
                            }}
                          >
                            Confirm Distribution
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                            onClick={() => { setUnavailOrder(o); setUnavailReason(""); }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Confirm Availability Dialog */}
      <Dialog open={!!confirmOrder} onOpenChange={(v)=>{ if(!v){ setConfirmOrder(null); setSelectedStockId(null); } }}>
        <DialogContent className="bg-white border-slate-100 text-slate-800 max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-hidden ring-1 ring-black/[0.05]">
          <DialogHeader>
            <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
               <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-800">Distribution Sync</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold italic">Verify registry availability for Clinical Manifest #{confirmOrder?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Protocol Requested</span>
              <span className="text-sm font-black text-slate-800">{confirmOrder?.medicine_name || '-'}</span>
            </div>
            <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-3xl bg-slate-50/30 custom-scrollbar p-1 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-12 w-16 text-center">Entry</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-12">Registry Item</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-12">Stock Qty</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 h-12">Unit Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stockData || []).map((it:any)=> (
                    <TableRow key={it.id} className={`hover:bg-white transition-all cursor-pointer group ${selectedStockId===it.id ? 'bg-white shadow-md ring-2 ring-emerald-500/20' : ''}`} onClick={()=>setSelectedStockId(it.id)}>
                      <TableCell className="py-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${selectedStockId===it.id ? 'border-emerald-600 bg-emerald-600 scale-110 shadow-lg shadow-emerald-500/30' : 'border-slate-200 bg-white group-hover:border-emerald-200'}`}>
                           {selectedStockId===it.id && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in duration-300" />}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 font-black text-slate-800 text-xs">{it.name}</TableCell>
                      <TableCell className="py-4 font-bold text-slate-400 text-[10px] uppercase">{it.quantity} units</TableCell>
                      <TableCell className="py-4 font-black text-emerald-600 text-[10px]">{Number(it.unit_price||0).toLocaleString()} Frw</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100">
              <div>
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1 px-1">Allocation Volume</label>
                <Input type="number" value={selectedQty} onChange={(e)=>setSelectedQty(Number(e.target.value))} className="bg-white border-emerald-100 text-slate-800 h-14 rounded-2xl shadow-sm text-xl font-black ring-0 focus-visible:ring-emerald-500/20" />
              </div>
              <div className="text-right">
                {(()=>{
                  const item = (stockData||[]).find((x:any)=>x.id===selectedStockId);
                  const total = item ? Number(item.unit_price||0) * (Number(selectedQty)||0) : 0;
                  return item ? (
                    <div className="space-y-1 animate-in slide-in-from-right-4">
                      <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Aggregate Cost Estimate</div>
                      <div className="text-3xl font-black text-slate-800 tracking-tighter">{total.toLocaleString()} <span className="text-xs uppercase ml-1 text-emerald-600">Frw</span></div>
                    </div>
                  ) : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Syncing registry...</span>;
                })()}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button
              onClick={()=>{
                if (!confirmOrder) return;
                if (!selectedStockId || !selectedQty || selectedQty<=0) { toast({ title:'Protocol Error', description:'Ensure stock entry and volume are finalized', variant:'destructive' }); return; }
                confirmAvail.mutate({ id: confirmOrder.id, stock_id: selectedStockId, qty: selectedQty });
                setConfirmOrder(null);
                setSelectedStockId(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-[20px] h-16 px-12 font-black uppercase text-xs tracking-[0.15em] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all w-full"
            >Authorize Clinical Distribution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Available Dialog */}
      <Dialog open={!!unavailOrder} onOpenChange={(v)=>{ if(!v){ setUnavailOrder(null); setUnavailReason(""); } }}>
        <DialogContent className="bg-white border-slate-100 text-slate-800 max-w-md rounded-[40px] shadow-2xl p-10 ring-1 ring-black/[0.05]">
          <DialogHeader>
            <div className="h-14 w-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 border border-rose-100">
               <AlertCircle className="h-7 w-7 text-rose-500" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-rose-500">Distribution Reject</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold italic">Notify registry of fulfillment failure for Order #{unavailOrder?.id}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reason for Rejection</label>
            <Textarea value={unavailReason} onChange={(e)=>setUnavailReason(e.target.value)} className="bg-slate-50 border-slate-100 text-slate-800 rounded-2xl p-4 font-bold italic shadow-inner h-32 focus:ring-rose-500/20" placeholder="e.g. Stock levels critical / Node offline..." />
          </div>
          <DialogFooter className="mt-8 gap-3">
            <Button variant="ghost" onClick={()=>{ setUnavailOrder(null); setUnavailReason(""); }} className="rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 flex-1">Cancel</Button>
            <Button
              onClick={()=>{
                if (!unavailOrder) return;
                notifyUnavailable.mutate({ id: unavailOrder.id, note: unavailReason || undefined });
                setUnavailOrder(null);
                setUnavailReason("");
              }}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-500/20 flex-1"
            >Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Prescription Dialog (Finalize Label) */}
      <Dialog open={!!prescOrder} onOpenChange={(v)=> { if (!v) { setPrescOrder(null); setPrescForm({ patient_id: "", medicine_name: "", quantity: "", instructions: "", dosage: "", frequency_per_day: "" as any }); } }}>
        <DialogContent className="bg-white border-slate-100 text-slate-800 max-w-xl rounded-[40px] shadow-2xl p-10 ring-1 ring-black/[0.05] overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
               <FilePlus2 className="h-7 w-7 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-800">Fulfillment Label</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold italic">Generate final clinical documentation for Order #{prescOrder?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Patient Digital ID</label>
              <Input type="number" className="bg-slate-50 border-slate-100 text-slate-800 h-14 rounded-2xl font-black text-lg" value={prescForm.patient_id as any} onChange={(e)=> setPrescForm(f => ({ ...f, patient_id: Number(e.target.value) || "" }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Medication Matrix</label>
              <Input className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-bold" value={prescForm.medicine_name} onChange={(e)=> setPrescForm(f => ({ ...f, medicine_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Volume</label>
              <Input className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-bold" value={prescForm.quantity} onChange={(e)=> setPrescForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dosage Unit</label>
              <Input className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-bold" value={(prescForm as any).dosage || ''} onChange={(e)=> setPrescForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Daily Flux (Units/Day)</label>
              <Input type="number" min={0} className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-bold" value={(prescForm as any).frequency_per_day || ''} onChange={(e)=> setPrescForm(f => ({ ...f, frequency_per_day: Number(e.target.value) || '' }))} />
              {(Number((prescForm as any).frequency_per_day)||0) > 0 && Number(prescForm.quantity) > 0 && (
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-2 ml-1">Est. Duration: {Math.ceil(Number(prescForm.quantity) / Number((prescForm as any).frequency_per_day))} Distribution Cycles</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Clinical Instructions</label>
              <Textarea className="bg-slate-50 border-slate-100 text-slate-800 rounded-2xl p-4 font-bold italic shadow-inner h-24" value={prescForm.instructions} onChange={(e)=> setPrescForm(f => ({ ...f, instructions: e.target.value }))} />
            </div>
            <div className="md:col-span-2 pt-4 border-t border-slate-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Schedule Medication Reminders</label>
                  <p className="text-[9px] text-slate-400 font-bold italic mt-0.5">Patient will be notified via mobile satellite nexus.</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase text-slate-400">{remindersEnabled ? 'ACTIVE' : 'DISABLED'}</span>
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-emerald-600 rounded-lg cursor-pointer" 
                    checked={remindersEnabled} 
                    onChange={e => setRemindersEnabled(e.target.checked)} 
                  />
                </div>
              </div>
              
              {remindersEnabled && (
                <div className="space-y-4 p-5 bg-emerald-50/30 rounded-[32px] border border-emerald-100/50 animate-in fade-in zoom-in-95 duration-300">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Reminder Time Protocols</label>
                    <div className="grid grid-cols-3 gap-2">
                      {reminderTimes.map((t, idx) => (
                        <Input 
                          key={idx} 
                          type="time" 
                          className="bg-white border-slate-100 text-slate-800 h-10 rounded-xl text-xs font-bold shadow-sm" 
                          value={t} 
                          onChange={e => setReminderTimes(ts => ts.map((x, i) => i === idx ? e.target.value : x))} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Start Phase</label>
                      <Input 
                        type="date" 
                        className="bg-white border-slate-100 text-slate-800 h-10 rounded-xl text-xs font-bold shadow-sm" 
                        value={reminderStartDate} 
                        onChange={e => setReminderStartDate(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Cycle Length (Days)</label>
                      <Input 
                        type="number" 
                        min={1} 
                        className="bg-white border-slate-100 text-slate-800 h-10 rounded-xl text-xs font-bold shadow-sm" 
                        value={reminderDuration} 
                        onChange={e => setReminderDuration(Number(e.target.value) || 1)} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-10 border-t border-slate-50 pt-8 gap-4">
            <Button variant="ghost" onClick={() => { setPrescOrder(null); }} className="rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-16 flex-1 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
              onClick={async () => {
                if (!prescOrder) return;
                try {
                  const pid = Number(prescForm.patient_id);
                  if (!pid || !prescForm.medicine_name.trim() || !prescForm.quantity.trim()) {
                    toast({ title: 'Validation Error', description: 'Patient ID, medication name and volume are mandatory', variant: 'destructive' });
                    return;
                  }
                  
                  // 1. Create Prescription Label
                  const res = await fetch(`${API_URL}/orders/${prescOrder.id}/prescriptions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      patient_id: pid,
                      medicine_name: prescForm.medicine_name.trim(),
                      quantity: prescForm.quantity.trim(),
                      dosage: (prescForm as any).dosage || undefined,
                      frequency_per_day: Number((prescForm as any).frequency_per_day) || undefined,
                      instructions: prescForm.instructions.trim()
                    })
                  });
                  const body = await res.json();
                  if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to generate record');
                  
                  // 2. Automated Reminders Sync
                  if (remindersEnabled) {
                    try {
                      const endDate = addDaysStr(reminderStartDate, Math.max(0, (Number(reminderDuration) || 1) - 1));
                      await fetch(`${API_URL}/alerts/reminders`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          patient_id: pid,
                          order_id: prescOrder.id,
                          prescription_id: body.prescription.id,
                          frequency_per_day: Number((prescForm as any).frequency_per_day) || 1,
                          dosage: (prescForm as any).dosage || '1 unit',
                          times: reminderTimes,
                          start_date: reminderStartDate,
                          end_date: endDate,
                        })
                      });
                    } catch (remErr) {
                      console.warn('Reminder sync failed, but prescription committed', remErr);
                    }
                  }

                  toast({ title: 'Record Synchronized', description: remindersEnabled ? 'Clinical label generated and medication alerts synced.' : `Prescription label generated for order #${prescOrder.id}` });
                  setPrescOrder(null);
                  setPrescForm({ patient_id: "", medicine_name: "", quantity: "", instructions: "", dosage: "", frequency_per_day: "" as any });
                  qc.invalidateQueries({ queryKey: ["providerAssigned"] });
                } catch (e: any) {
                  toast({ title: 'Sync Error', description: e?.message || 'Could not commit distribution record', variant: 'destructive' });
                }
              }}
            >
              Commit Distribution Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

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

export default ProviderAssigned;
