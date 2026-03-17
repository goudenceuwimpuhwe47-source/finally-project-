import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API_URL = "http://localhost:5000";

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
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-48"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
          <div className="h-40 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6 text-red-400">Failed to load assigned orders.</CardContent>
      </Card>
    );
  }

  const orders = data || [];

  // hooks defined above to keep order stable across renders

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="h-6 w-6" />
          Assigned Orders
        </h1>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{orders.length} Orders</Badge>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center text-gray-300">No orders assigned yet.</CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-gray-300">Order</TableHead>
                <TableHead className="text-gray-300">Patient</TableHead>
                <TableHead className="text-gray-300">Medicine</TableHead>
                <TableHead className="text-gray-300">Quantity</TableHead>
                <TableHead className="text-gray-300">Instructions</TableHead>
                <TableHead className="text-gray-300">Location</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Created</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
          {orders.map((o: any) => (
                <TableRow key={o.id} className="hover:bg-gray-800/60">
                  <TableCell className="text-white font-medium">#{o.id}</TableCell>
                  <TableCell className="text-gray-200">{o.full_name || 'Patient'}</TableCell>
                  <TableCell className="text-gray-200">{o.medicine_name || '-'}</TableCell>
                  <TableCell className="text-gray-300">{o.prescription_quantity || '-'}</TableCell>
                  <TableCell className="text-gray-400 max-w-xs truncate" title={o.doctor_instructions || ''}>
                    {o.doctor_instructions || '-'}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{o.district}, {o.sector}, {o.cell}, {o.village}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {o.provider_status || 'assigned'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {/* If already confirmed, block further actions */}
                    {o.provider_confirmed ? (
                      <>
                        {String(o.payment_status).toLowerCase() !== 'confirmed' && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">Awaiting Admin Payment</Badge>
                        )}
                        {String(o.payment_status).toLowerCase() === 'confirmed' && String(o.admin_status).toLowerCase() !== 'approved' && (
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Awaiting Admin Approval</Badge>
                        )}
                        {String(o.admin_status).toLowerCase() === 'approved' && (
                          <div className="flex gap-2 items-center">
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved — Prepare Prescription</Badge>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
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
                              New Prescription
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                          onClick={() => {
                            setConfirmOrder(o);
                            setSelectedStockId(null);
                            setSelectedQty(pickDefaultQtyFromPrescription(o.prescription_quantity));
                          }}
                        >
                          Confirm Availability
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => { setUnavailOrder(o); setUnavailReason(""); }}
                        >
                          Not Available
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirm Availability Dialog */}
      <Dialog open={!!confirmOrder} onOpenChange={(v)=>{ if(!v){ setConfirmOrder(null); setSelectedStockId(null); } }}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Availability for Order #{confirmOrder?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-300">
              Doctor requested: <span className="font-medium text-white">{confirmOrder?.medicine_name || '-'}</span>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-700 rounded">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-gray-300">Select</TableHead>
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Qty</TableHead>
                    <TableHead className="text-gray-300">Unit Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stockData || [])
                    .filter((it:any)=>{
                      const q = (confirmOrder?.medicine_name || '').toString().toLowerCase().trim();
                      if (!q) return true; // no name -> show all
                      const match = (it.name || '').toString().toLowerCase().includes(q);
                      // if any matches exist in the dataset, we will filter to matches only; else show all (handled below)
                      return match;
                    })
                    .concat(
                      // Fallback: if no match rows computed, show all items
                      (()=>{
                        const q = (confirmOrder?.medicine_name || '').toString().toLowerCase().trim();
                        const matches = (stockData || []).some((it:any)=> (it.name||'').toString().toLowerCase().includes(q));
                        return matches ? [] : (stockData || []);
                      })()
                    )
                    .map((it:any)=> (
                      <TableRow key={it.id} className="hover:bg-gray-800/60">
                        <TableCell className="text-gray-200">
                          <input type="radio" name="stockPick" checked={selectedStockId===it.id} onChange={()=>setSelectedStockId(it.id)} />
                        </TableCell>
                        <TableCell className="text-white">{it.name}</TableCell>
                        <TableCell className="text-gray-300">{it.quantity}</TableCell>
                        <TableCell className="text-gray-300">{Number(it.unit_price||0).toFixed(2)}</TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                <Input type="number" value={selectedQty} onChange={(e)=>setSelectedQty(Number(e.target.value))} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="md:col-span-2 text-sm text-gray-300">
                {(()=>{
                  const item = (stockData||[]).find((x:any)=>x.id===selectedStockId);
                  const total = item ? Number(item.unit_price||0) * (Number(selectedQty)||0) : 0;
                  return item ? (
                    <div>
                      Unit: <span className="text-white font-medium">{Number(item.unit_price||0).toFixed(2)}</span>
                      {' '}• Total: <span className="text-white font-medium">{total.toFixed(2)}</span>
                    </div>
                  ) : <span>Select a stock item to compute price</span>;
                })()}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={()=>{
                if (!confirmOrder) return;
                if (!selectedStockId || !selectedQty || selectedQty<=0) { toast({ title:'Missing info', description:'Select an item and quantity', variant:'destructive' }); return; }
                confirmAvail.mutate({ id: confirmOrder.id, stock_id: selectedStockId, qty: selectedQty });
                setConfirmOrder(null);
                setSelectedStockId(null);
              }}
              className="bg-green-600 hover:bg-green-500"
            >Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Not Available Dialog */}
      <Dialog open={!!unavailOrder} onOpenChange={(v)=>{ if(!v){ setUnavailOrder(null); setUnavailReason(""); } }}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader><DialogTitle>Not Available for Order #{unavailOrder?.id}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="text-sm text-gray-300">Optional reason to help admin reassign faster:</div>
            <Textarea value={unavailReason} onChange={(e)=>setUnavailReason(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={()=>{ setUnavailOrder(null); setUnavailReason(""); }}
              className="border-gray-700 text-gray-200"
            >Cancel</Button>
            <Button
              onClick={()=>{
                if (!unavailOrder) return;
                notifyUnavailable.mutate({ id: unavailOrder.id, note: unavailReason || undefined });
                setUnavailOrder(null);
                setUnavailReason("");
              }}
              className="bg-red-600 hover:bg-red-500"
            >Notify Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Prescription Dialog */}
  <Dialog open={!!prescOrder} onOpenChange={(v)=> { if (!v) { setPrescOrder(null); setPrescForm({ patient_id: "", medicine_name: "", quantity: "", instructions: "", dosage: "", frequency_per_day: "" as any }); } }}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>New Prescription for Order #{prescOrder?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Patient</label>
              <Input
                placeholder="Patient ID"
                className="bg-gray-800 border-gray-700 text-white"
                type="number"
                value={prescForm.patient_id as any}
                onChange={(e)=> setPrescForm(f => ({ ...f, patient_id: Number(e.target.value) || "" }))}
              />
              <p className="text-xs text-gray-400 mt-1">Pre-filled from order. You may adjust.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Medicine</label>
              <Input className="bg-gray-800 border-gray-700 text-white" value={prescForm.medicine_name} onChange={(e)=> setPrescForm(f => ({ ...f, medicine_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Quantity</label>
              <Input className="bg-gray-800 border-gray-700 text-white" value={prescForm.quantity} onChange={(e)=> setPrescForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Dosage (e.g., 500mg)</label>
              <Input className="bg-gray-800 border-gray-700 text-white" value={(prescForm as any).dosage || ''} onChange={(e)=> setPrescForm(f => ({ ...f, dosage: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Frequency (pieces per day)</label>
              <Input type="number" min={0} className="bg-gray-800 border-gray-700 text-white" value={(prescForm as any).frequency_per_day || ''} onChange={(e)=> setPrescForm(f => ({ ...f, frequency_per_day: Number(e.target.value) || '' }))} />
              {(Number((prescForm as any).frequency_per_day)||0) > 0 && Number(prescForm.quantity) > 0 && (
                <p className="text-xs text-gray-400 mt-1">Duration: {Math.ceil(Number(prescForm.quantity) / Number((prescForm as any).frequency_per_day))} day(s)</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Instructions</label>
              <Textarea className="bg-gray-800 border-gray-700 text-white" rows={3} value={prescForm.instructions} onChange={(e)=> setPrescForm(f => ({ ...f, instructions: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPrescOrder(null); }}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!prescOrder) return;
                try {
                  const pid = Number(prescForm.patient_id);
                  if (!pid || !prescForm.medicine_name.trim() || !prescForm.quantity.trim()) {
                    toast({ title: 'Missing fields', description: 'Patient, medicine and quantity are required', variant: 'destructive' });
                    return;
                  }
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
                  if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to create prescription');
                  toast({ title: 'Prescription created', description: `Prescription sent to patient for order #${prescOrder.id}` });
                  setPrescOrder(null);
                  setPrescForm({ patient_id: "", medicine_name: "", quantity: "", instructions: "", dosage: "", frequency_per_day: "" as any });
                  qc.invalidateQueries({ queryKey: ["providerAssigned"] });
                } catch (e: any) {
                  toast({ title: 'Error', description: e?.message || 'Could not create prescription', variant: 'destructive' });
                }
              }}
            >
              Create Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProviderAssigned;
