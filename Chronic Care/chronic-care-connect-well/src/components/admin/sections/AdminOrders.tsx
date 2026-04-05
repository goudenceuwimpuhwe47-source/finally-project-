import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Package, User, Calendar, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/utils";

export const AdminOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<number | null>(null);
  const [doctors, setDoctors] = useState<{id:number; name:string; email:string; username?:string}[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerOrderId, setProviderOrderId] = useState<number | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [matchLevel, setMatchLevel] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  // Invoice dialog state
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<any | null>(null);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'online'|'home_delivery'|'pharmacy_pickup'>('online');
  const [doctorFee, setDoctorFee] = useState<string>('0');
  const [serviceFee, setServiceFee] = useState<string>('0');
  const [deliveryFee, setDeliveryFee] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  // Cancel invoice state
  const [cancelInvoiceOpen, setCancelInvoiceOpen] = useState(false);
  const [cancelInvoiceOrderId, setCancelInvoiceOrderId] = useState<number | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["adminOrders", statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("adminStatus", statusFilter);
      if (searchTerm) params.set("q", searchTerm);
      const res = await fetch(`${API_URL}/admin/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load orders");
      const body = await res.json();
      return body?.orders ?? [];
    }
  });

  // Real-time admin notifications when provider confirms/unavailable
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socket.on('order:provider_confirmed', (p: any) => {
      toast({ title: 'Provider confirmed availability', description: `Order #${p?.orderId}: ${p?.qty} units, total ${p?.total?.toFixed ? p.total.toFixed(2) : p?.total}` });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    });
    socket.on('order:provider_unavailable', (p: any) => {
      toast({ title: 'Provider unavailable', description: `Order #${p?.orderId}: ${p?.reason || 'No reason provided'}` });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    });
    socket.on('order:payment_received', (p: any) => {
      toast({ title: 'Payment received', description: `Order #${p?.orderId} has been paid.` });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    });
    socket.on('order:admin_approved', (p: any) => {
      // In practice this is emitted to patient/provider; admin can just refresh list occasionally
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    });
    // Show toast when a provider creates or updates a prescription
    const onPrescription = (p: any) => {
      const orderId = p?.orderId || p?.order_id || p?.order?.id || p?.id;
      const med = p?.medicine_name || p?.medicine || '';
      toast({ title: 'Prescription created', description: `Order #${orderId}${med ? ` • ${med}` : ''}` });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
    };
    socket.on('prescription:created', onPrescription);
    socket.on('order:prescription_created', onPrescription);
    return () => { socket.disconnect(); };
  }, [token]);

  // Load doctors list for assignment
  const loadDoctors = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/doctors`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const body = await res.json();
  const list = Array.isArray(body.users) ? body.users : [];
  setDoctors(list.map((u:any)=>({ id:u.id, name: u.name || u.username || u.email, email: u.email, username: u.username })));
      }
    } catch {}
  };

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, reason }: { orderId: number; status: "pending" | "under_review" | "approved" | "rejected"; reason?: string }) => {
      const res = await fetch(`${API_URL}/orders/${orderId}/admin-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason }),
      });
      const body = await res.json();
      if (!res.ok || body?.error) throw new Error(body?.error || "Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    }
  });

  const filteredOrders = orders || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'under_review':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'under_review':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Order Management
        </h1>
  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{filteredOrders.length} Orders</Badge>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
      placeholder="Search by disease, username, email..."
            value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        
    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
      <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <Card key={order.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{order.disease?.replace(/_/g, ' ') || 'Medication Request'}</h3>
                        <p className="text-sm text-gray-400">Order #{order.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="h-4 w-4" />
                        <span className="text-sm">{order.user_full_name || order.full_name || order.username || order.email || 'Unknown Patient'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-400">
                        <Package className="h-4 w-4" />
                        <span className="text-sm">Dosage: {order.dosage}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {order.district && (
                        <div className="flex items-center gap-2 text-gray-400 md:col-span-2">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">{order.district}, {order.sector}, {order.cell}, {order.village}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes/amount not available in current schema */}
                  </div>

                  <div className="flex flex-col gap-3 items-end">
                    <Badge variant="outline" className={getStatusColor(order.admin_status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(order.admin_status)}
                        {order.admin_status}
                      </span>
                    </Badge>

                    {order.admin_status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => { setAssignOrderId(order.id); setAssignOpen(true); loadDoctors(); }}
                          disabled={updateOrderMutation.isPending}
                        >
                          Move to Review
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => { setPendingRejectId(order.id); setRejectReason(""); setRejectOpen(true); }}
                          disabled={updateOrderMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {order.admin_status === 'under_review' && (
                      <div className="flex flex-col gap-2 items-end">
                        {/* Show find provider only if not assigned and not confirmed yet */}
                        {(!order.provider_id && !order.provider_confirmed) && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={order.doctor_status !== 'approved'}
                            title={order.doctor_status !== 'approved' ? 'Doctor must approve first' : ''}
                            onClick={async () => {
                              try {
                                const res = await fetch(`${API_URL}/orders/${order.id}/nearest-providers`, { headers: { Authorization: `Bearer ${token}` } });
                                const data = await res.json();
                                if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to search providers');
                                setProviders(Array.isArray(data.providers) ? data.providers : []);
                                setMatchLevel(data.matchLevel || null);
                                setSelectedProviderId(null);
                                setProviderOrderId(order.id);
                                setProviderOpen(true);
                              } catch (e:any) {
                                toast({ title: 'Search failed', description: e?.message || 'Could not find providers', variant: 'destructive' });
                              }
                            }}
                          >
                            Find nearest provider
                          </Button>
                        )}

                        {/* If provider confirmed, show quote summary and payment action */}
                        {order.provider_confirmed ? (
                          <div className="flex flex-col gap-2 items-end w-full">
                            <div className="text-right text-sm text-gray-300">
                              <div>Provider confirmed: <span className="text-white font-medium">{order.provider_confirmed_qty}</span> units</div>
                              <div>Total price: <span className="text-white font-medium">{Number(order.provider_confirmed_price || 0).toFixed(2)}</span></div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/10"
                                onClick={() => {
                                  setInvoiceOrder(order);
                                  // default method: online (no delivery fee)
                                  setFulfillmentMethod('online');
                                  // suggest fees (admin can edit)
                                  setDoctorFee('0');
                                  setServiceFee('0');
                                  setDeliveryFee('0');
                                  setNotes('');
                                  setInvoiceOpen(true);
                                }}
                                disabled={!!order.invoice_total && order.invoice_status === 'sent'}
                                title={order.invoice_status === 'sent' ? 'Invoice already sent' : ''}
                              >
                                {order.invoice_status === 'sent' ? 'Invoice Sent' : 'Create Invoice'}
                              </Button>
                              {order.invoice_status === 'sent' && order.payment_status !== 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => {
                                    setCancelInvoiceOrderId(order.id);
                                    setCancelInvoiceOpen(true);
                                  }}
                                  title="Cancel the sent invoice so you can create a new one"
                                >
                                  Cancel Invoice
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={order.payment_status === 'confirmed'}
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_URL}/orders/${order.id}/payment-status`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ status: 'confirmed' })
                                    });
                                    const body = await res.json();
                                    if (!res.ok || body?.error) throw new Error(body?.error || 'Payment update failed');
                                    queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                                    toast({ title: 'Payment confirmed', description: `Order #${order.id} marked as paid` });
                                  } catch (e:any) {
                                    toast({ title: 'Error', description: e?.message || 'Could not update payment', variant: 'destructive' });
                                  }
                                }}
                              >
                                {order.payment_status === 'confirmed' ? 'Payment Confirmed' : 'Confirm Payment'}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: 'approved' })}
                          disabled={updateOrderMutation.isPending || order.doctor_status !== 'approved' || String(order.payment_status).toLowerCase() !== 'confirmed'}
                          title={order.doctor_status !== 'approved' ? 'Doctor must approve first' : (String(order.payment_status).toLowerCase() !== 'confirmed' ? 'Payment must be confirmed first' : '')}
                        >
                          Approve
                        </Button>
                      </div>
                    )}

                    {order.admin_status === 'approved' && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: 'approved' })}
                        disabled={updateOrderMutation.isPending}
                      >
                        Approved
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">No Orders Found</h3>
              <p className="text-gray-400">
                {searchTerm || statusFilter !== "all" 
                  ? "No orders match your search criteria." 
                  : "No orders have been placed yet."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject dialog */}
      <AdminOrdersRejectDialog
        open={rejectOpen}
        onOpenChange={(v) => setRejectOpen(v)}
        reason={rejectReason}
        setReason={setRejectReason}
        loading={updateOrderMutation.isPending}
        onConfirm={() => {
          if (!pendingRejectId) return;
          updateOrderMutation.mutate({ orderId: pendingRejectId, status: 'rejected', reason: rejectReason.trim() });
          setRejectOpen(false);
          setPendingRejectId(null);
          setRejectReason('');
        }}
      />

      {/* Assign Doctor dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Assign a Doctor</DialogTitle>
            <DialogDescription className="sr-only">Choose a healthcare professional to review and handle this medication order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-gray-300">Select Doctor</Label>
            <Select onValueChange={(v)=> setSelectedDoctorId(Number(v))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-64">
                {doctors.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.username ? `@${d.username}` : d.name} — {d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=> setAssignOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!assignOrderId || !selectedDoctorId}
              onClick={async ()=>{
                if (!assignOrderId || !selectedDoctorId) return;
                try {
                  const res = await fetch(`${API_URL}/orders/${assignOrderId}/assign-doctor`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ doctorId: selectedDoctorId })
                  });
                  const data = await res.json();
                  if (!res.ok || data?.error) throw new Error(data?.error || 'Assign failed');
                  setAssignOpen(false);
                  setAssignOrderId(null);
                  setSelectedDoctorId(null);
                  queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                  toast({ title: 'Assigned', description: 'Order moved to review and assigned to the doctor.' });
                } catch (e:any) {
                  toast({ title: 'Error', description: e?.message || 'Failed to assign doctor', variant: 'destructive' });
                }
              }}
            >
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
  <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg h-[85vh] p-0 overflow-hidden flex flex-col">
          <div className="flex h-full flex-col">
      <DialogHeader className="px-6 pt-6">
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Review provider quote, choose fulfillment, add fees, and send the invoice to the patient.</DialogDescription>
            </DialogHeader>
            {invoiceOrder && (
              <>
                <div className="px-6 pb-4 flex-1 overflow-y-auto">
                  <div className="space-y-4 pr-2">
                    <div className="text-sm text-gray-300">
                      <div>Order #{invoiceOrder.id}</div>
                      <div>Medicine: <span className="text-white font-medium">{invoiceOrder.medicine_name || '—'}</span></div>
                      <div>Quantity confirmed: <span className="text-white font-medium">{invoiceOrder.provider_confirmed_qty}</span></div>
                      <div>Medicine total (from provider): <span className="text-white font-medium">{Number(invoiceOrder.provider_confirmed_price || 0).toFixed(2)}</span></div>
                    </div>
                    <Separator className="bg-gray-700" />
                    <div className="space-y-2">
                      <Label className="text-gray-300">Fulfillment Method</Label>
                      <Select value={fulfillmentMethod} onValueChange={(v)=> setFulfillmentMethod(v as any)}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="online">Online (no delivery fee)</SelectItem>
                          <SelectItem value="home_delivery">Home Delivery</SelectItem>
                          <SelectItem value="pharmacy_pickup">Pharmacy Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300">Doctor Fee</Label>
                        <Input type="number" min="0" step="0.01" className="bg-gray-800 border-gray-700 text-white" value={doctorFee} onChange={(e)=> setDoctorFee(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-gray-300">Service Fee</Label>
                        <Input type="number" min="0" step="0.01" className="bg-gray-800 border-gray-700 text-white" value={serviceFee} onChange={(e)=> setServiceFee(e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-gray-300">Delivery Fee {fulfillmentMethod === 'online' && <span className="text-xs text-gray-400">(ignored for online)</span>}</Label>
                        <Input type="number" min="0" step="0.01" className="bg-gray-800 border-gray-700 text-white" value={deliveryFee} onChange={(e)=> setDeliveryFee(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Notes (optional)</Label>
                      <Textarea className="bg-gray-800 border-gray-700 text-white" rows={3} value={notes} onChange={(e)=> setNotes(e.target.value)} />
                    </div>
                    {(() => {
                      const med = Number(invoiceOrder.provider_confirmed_price || 0) || 0;
                      const d = Number(doctorFee || 0) || 0;
                      const s = Number(serviceFee || 0) || 0;
                      const del = fulfillmentMethod === 'online' ? 0 : (Number(deliveryFee || 0) || 0);
                      const total = med + d + s + del;
                      return (
                        <div className="bg-gray-800 border border-gray-700 rounded p-3 text-sm">
                          <div className="flex justify-between"><span className="text-gray-300">Medicine</span><span className="text-white font-medium">{med.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-300">Doctor</span><span className="text-white font-medium">{d.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-300">Service</span><span className="text-white font-medium">{s.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-300">Delivery</span><span className="text-white font-medium">{del.toFixed(2)}</span></div>
                          <Separator className="my-2 bg-gray-700" />
                          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{total.toFixed(2)}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="px-6 pb-6 pt-3 flex justify-end gap-2 border-t border-gray-800 bg-gray-900 shrink-0 sticky bottom-0">
                  <Button variant="outline" onClick={()=> setInvoiceOpen(false)}>Cancel</Button>
                  <Button
                    className="bg-yellow-600 hover:bg-yellow-700"
                    disabled={submittingInvoice}
                    onClick={async ()=>{
                      if (!invoiceOrder) return;
                      try {
                        setSubmittingInvoice(true);
                        const med = Number(invoiceOrder.provider_confirmed_price || 0) || 0;
                        const d = Number(doctorFee || 0) || 0;
                        const s = Number(serviceFee || 0) || 0;
                        const del = fulfillmentMethod === 'online' ? 0 : (Number(deliveryFee || 0) || 0);
                        const total = med + d + s + del;
                        const res = await fetch(`${API_URL}/orders/${invoiceOrder.id}/invoice`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            method: fulfillmentMethod,
                            medicine_total: med,
                            doctor_fee: d,
                            service_fee: s,
                            delivery_fee: del,
                            total,
                            notes,
                          })
                        });
                        const body = await res.json();
                        if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to create invoice');
                        setInvoiceOpen(false);
                        setInvoiceOrder(null);
                        queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                        toast({ title: 'Invoice sent', description: `Invoice sent to patient for Order #${invoiceOrder.id}` });
                      } catch (e:any) {
                        toast({ title: 'Error', description: e?.message || 'Could not create invoice', variant: 'destructive' });
                      } finally {
                        setSubmittingInvoice(false);
                      }
                    }}
                  >
                    Send Invoice
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Provider dialog */}
      <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Assign a Provider/Pharmacy</DialogTitle>
            <DialogDescription className="sr-only">Select a local pharmacy or healthcare provider to fulfill this prescription.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-gray-300">
              {matchLevel === 'all' ? (
                <div className="bg-yellow-900/30 border border-yellow-600/50 rounded p-3 mb-2">
                  <span className="text-yellow-400 font-medium">⚠️ No nearest providers found.</span>
                  <p className="text-gray-300 mt-1">Showing all providers in the system. Please choose any provider you want.</p>
                </div>
              ) : matchLevel ? (
                <span>Matched by <span className="font-medium">{matchLevel}</span>. Choose a provider to assign.</span>
              ) : (
                <span>No providers found in the system.</span>
              )}
            </div>
            <Label className="text-gray-300">Select Provider</Label>
            <Select onValueChange={(v)=> setSelectedProviderId(Number(v))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={providers.length ? 'Choose a provider' : 'No providers found'} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-64">
                {providers.map((p:any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {(p.name || p.username || p.email)} — {p.district}, {p.sector}, {p.cell}, {p.village}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={()=> setProviderOpen(false)}>Close</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!providerOrderId || !selectedProviderId}
              onClick={async ()=>{
                if (!providerOrderId || !selectedProviderId) return;
                try {
                  const res = await fetch(`${API_URL}/orders/${providerOrderId}/assign-provider`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ providerId: selectedProviderId })
                  });
                  const data = await res.json();
                  if (!res.ok || data?.error) throw new Error(data?.error || 'Assignment failed');
                  setProviderOpen(false);
                  setProviderOrderId(null);
                  setSelectedProviderId(null);
                  queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                  toast({ title: 'Provider assigned', description: 'Order assigned to the selected provider/pharmacy.' });
                } catch (e:any) {
                  toast({ title: 'Error', description: e?.message || 'Failed to assign provider', variant: 'destructive' });
                }
              }}
            >
              Assign Provider
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Invoice confirm */}
      <AlertDialog open={cancelInvoiceOpen} onOpenChange={setCancelInvoiceOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will void the sent invoice as long as it is not yet paid. The order will return to invoice draft so you can create a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async ()=>{
                if (!cancelInvoiceOrderId) return;
                try {
                  const res = await fetch(`${API_URL}/orders/${cancelInvoiceOrderId}/invoice/cancel`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  });
                  const body = await res.json();
                  if (!res.ok || body?.error) throw new Error(body?.error || 'Failed to cancel invoice');
                  setCancelInvoiceOpen(false);
                  setCancelInvoiceOrderId(null);
                  queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                  toast({ title: 'Invoice canceled', description: `Invoice was canceled for order #${body?.orderId || cancelInvoiceOrderId}. You can create a new invoice.` });
                } catch (e:any) {
                  toast({ title: 'Error', description: e?.message || 'Could not cancel invoice', variant: 'destructive' });
                }
              }}
            >
              Cancel Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Reject confirmation dialog
export const AdminOrdersRejectDialog = ({ open, onOpenChange, reason, setReason, onConfirm, loading }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason: string;
  setReason: (v: string) => void;
  onConfirm: () => void;
  loading?: boolean;
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Reject this order?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300">
            Are you sure you want to reject this order? Please provide a reason. The patient will see this reason.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Reason</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this order is being rejected..."
            className="bg-gray-800 border-gray-700 text-white"
            rows={4}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            disabled={!reason.trim() || loading}
            onClick={onConfirm}
          >
            {loading ? 'Rejecting...' : 'Reject'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
