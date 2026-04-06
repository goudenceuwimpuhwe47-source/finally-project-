import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Package, User, Calendar, MapPin, CheckCircle, XCircle, Clock, TrendingUp, Pill } from "lucide-react";
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
  const [cancelInvoiceOpen, setCancelInvoiceOpen] = useState(false);
  const [cancelInvoiceOrderId, setCancelInvoiceOrderId] = useState<number | null>(null);

  // Certificate dialog state
  const [certViewerOpen, setCertViewerOpen] = useState(false);
  const [certUrl, setCertUrl] = useState<string | null>(null);
  const [certFileName, setCertFileName] = useState<string | null>(null);

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
        return 'bg-amber-50 text-amber-600 border-amber-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full';
      case 'under_review':
        return 'bg-blue-50 text-blue-600 border-blue-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full';
      case 'approved':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full';
      case 'rejected':
        return 'bg-rose-50 text-rose-600 border-rose-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full';
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
      <div className="space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-slate-200 rounded-2xl w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-14 bg-slate-200 rounded-2xl"></div>
            <div className="h-14 bg-slate-200 rounded-2xl"></div>
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <FileText className="h-6 w-6 text-white" />
          </div>
          Order Manifest
        </h1>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px]">
          {filteredOrders.length} Total Records
        </Badge>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-border shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input
            placeholder="Search manifests, patients, or data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-slate-50 border-border text-foreground h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold placeholder:text-muted-foreground/50 transition-all shadow-inner"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="bg-slate-50 border-border text-foreground h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Status: All Records" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white border-border rounded-2xl shadow-2xl p-2 ring-1 ring-black/[0.05]">
            <SelectItem value="all" className="rounded-xl font-bold py-3 hover:bg-slate-50">Global View</SelectItem>
            <SelectItem value="pending" className="rounded-xl font-bold py-3 hover:bg-amber-50 text-amber-600">Pending Review</SelectItem>
            <SelectItem value="under_review" className="rounded-xl font-bold py-3 hover:bg-blue-50 text-blue-600">Clinical Review</SelectItem>
            <SelectItem value="approved" className="rounded-xl font-bold py-3 hover:bg-emerald-50 text-emerald-600">Approved Orders</SelectItem>
            <SelectItem value="rejected" className="rounded-xl font-bold py-3 hover:bg-rose-50 text-rose-600">Rejected Requests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="grid gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <Card key={order.id} className="bg-white border-border shadow-sm rounded-3xl overflow-hidden hover:shadow-lg transition-all group">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row lg:items-stretch justify-between">
                  <div className="flex-1 p-6 sm:p-8 space-y-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover:bg-primary/5 transition-colors">
                        <Package className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-primary transition-colors">{order.disease?.replace(/_/g, ' ') || 'Consultation Request'}</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-60">Manifest ID: #{order.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="p-2 bg-slate-100 rounded-xl">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Patient Name</span>
                          <span className="text-sm font-bold">{order.user_full_name || order.full_name || order.username || order.email || 'Anonymous'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="p-2 bg-slate-100 rounded-xl">
                          <Package className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Intensity</span>
                          <span className="text-sm font-bold">Qty: {order.dosage}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-slate-600">
                        <div className="p-2 bg-slate-100 rounded-xl">
                          <Calendar className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Dispatch Date</span>
                          <span className="text-sm font-bold">{new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>

                      {order.district && (
                        <div className="flex items-center gap-3 text-slate-600 md:col-span-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                          <MapPin className="h-4 w-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Geolocation</span>
                            <span className="text-xs font-bold">{order.district}, {order.sector}, {order.cell}, {order.village}</span>
                          </div>
                        </div>
                      )}

                      {order.medical_certificate && (
                        <div className="md:col-span-3 pt-2">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-primary hover:text-primary-hover font-black uppercase text-[10px] tracking-widest flex items-center gap-2 group/link"
                            onClick={() => {
                              const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
                              const path = order.medical_certificate.startsWith('/') ? order.medical_certificate : `/${order.medical_certificate}`;
                              const url = order.medical_certificate.startsWith('data:')
                                ? order.medical_certificate
                                : (order.medical_certificate.startsWith('http') ? order.medical_certificate : `${base}${path}`);
                              setCertUrl(url);
                              setCertFileName(order.medical_certificate.startsWith('data:') ? 'Secured Medical Document' : order.medical_certificate);
                              setCertViewerOpen(true);
                            }}
                          >
                            <div className="p-1.5 bg-primary/10 rounded-lg group-hover/link:bg-primary group-hover/link:text-white transition-all">
                              <FileText className="h-3 w-3" />
                            </div>
                            View Digital Certificate
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 border-l border-border p-6 sm:p-8 flex flex-col gap-6 items-center lg:items-end justify-center lg:w-72 shrink-0">
                    <Badge variant="outline" className={getStatusColor(order.admin_status)}>
                      <span className="flex items-center gap-2">
                        {getStatusIcon(order.admin_status)}
                        {order.admin_status}
                      </span>
                    </Badge>

                    {order.admin_status === 'pending' && (
                      <div className="flex flex-col gap-3 w-full">
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
                          onClick={() => { setAssignOrderId(order.id); setAssignOpen(true); loadDoctors(); }}
                          disabled={updateOrderMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-2" /> Assign Reviewer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl transition-all"
                          onClick={() => { setPendingRejectId(order.id); setRejectReason(""); setRejectOpen(true); }}
                          disabled={updateOrderMutation.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-2" /> Decline Request
                        </Button>
                      </div>
                    )}

                    {order.admin_status === 'under_review' && (
                      <div className="flex flex-col gap-3 items-end w-full">
                        {(!order.provider_id && !order.provider_confirmed) && (
                          <Button
                            size="sm"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            disabled={order.doctor_status !== 'approved'}
                            title={order.doctor_status !== 'approved' ? 'Awaiting Doctor Approval' : ''}
                            onClick={async () => {
                              try {
                                const res = await fetch(`${API_URL}/orders/${order.id}/nearest-providers`, { headers: { Authorization: `Bearer ${token}` } });
                                const data = await res.json();
                                if (!res.ok || data?.error) throw new Error(data?.error || 'Targeting failed');
                                setProviders(Array.isArray(data.providers) ? data.providers : []);
                                setMatchLevel(data.matchLevel || null);
                                setSelectedProviderId(null);
                                setProviderOrderId(order.id);
                                setProviderOpen(true);
                              } catch (e:any) {
                                toast({ title: 'System Error', description: e?.message || 'Geographical scan failed', variant: 'destructive' });
                              }
                            }}
                          >
                            <MapPin className="h-3 w-3 mr-2" /> Locate Provider
                          </Button>
                        )}

                        {/* If provider confirmed, show quote summary and payment action */}
                        {order.provider_confirmed ? (
                          <div className="flex flex-col gap-4 items-end w-full">
                            <div className="text-right p-4 bg-white border border-slate-100 rounded-2xl shadow-inner w-full">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Provider Confirmation</div>
                              <div className="text-sm font-bold text-slate-700">Stock: <span className="text-primary">{order.provider_confirmed_qty} Units</span></div>
                              <div className="text-sm font-bold text-slate-700">Quoted: <span className="text-emerald-600">{Number(order.provider_confirmed_price || 0).toFixed(2)} RWF</span></div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 w-full">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl"
                                onClick={() => {
                                  setInvoiceOrder(order);
                                  setFulfillmentMethod('online');
                                  setDoctorFee('0');
                                  setServiceFee('0');
                                  setDeliveryFee('0');
                                  setNotes('');
                                  setInvoiceOpen(true);
                                }}
                                disabled={!!order.invoice_total && order.invoice_status === 'sent'}
                              >
                                {order.invoice_status === 'sent' ? 'Invoice Released' : 'Generate Invoice'}
                              </Button>
                              {order.invoice_status === 'sent' && order.payment_status !== 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="w-full bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl"
                                  onClick={() => {
                                    setCancelInvoiceOrderId(order.id);
                                    setCancelInvoiceOpen(true);
                                  }}
                                >
                                  Void Invoice
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
                                disabled={order.payment_status === 'confirmed'}
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_URL}/orders/${order.id}/payment-status`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ status: 'confirmed' })
                                    });
                                    const body = await res.json();
                                    if (!res.ok || body?.error) throw new Error(body?.error || 'Handshake failed');
                                    queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                                    toast({ title: 'Transaction Secured', description: `Order #${order.id} verified` });
                                  } catch (e:any) {
                                    toast({ title: 'System Error', description: e?.message || 'Payment logic failed', variant: 'destructive' });
                                  }
                                }}
                              >
                                {order.payment_status === 'confirmed' ? 'Payment Verified' : 'Verify Transaction'}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        <Button
                          size="sm"
                          className="w-full bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-xl shadow-primary/25 transition-all active:scale-95"
                          onClick={() => updateOrderMutation.mutate({ orderId: order.id, status: 'approved' })}
                          disabled={updateOrderMutation.isPending || order.doctor_status !== 'approved' || String(order.payment_status).toLowerCase() !== 'confirmed'}
                          title={order.doctor_status !== 'approved' ? 'Medical authorization missing' : (String(order.payment_status).toLowerCase() !== 'confirmed' ? 'Financial settlement pending' : '')}
                        >
                          Execute Approval
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
          <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-slate-100 shadow-inner">
            <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
              <FileText className="h-12 w-12 text-slate-200" />
            </div>
            <h3 className="text-slate-800 font-black tracking-tight uppercase text-sm mb-2">No Active Manifests</h3>
            <p className="text-slate-400 font-bold text-xs max-w-[300px] mx-auto px-6">
              {searchTerm || statusFilter !== "all" 
                ? "Your search query yielded no results in the central registry." 
                : "The medication order queue is currently empty."}
            </p>
          </div>
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
        <DialogContent className="bg-white border-border text-foreground shadow-2xl rounded-[32px] p-8 ring-1 ring-black/[0.05]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">Assign Reviewer</DialogTitle>
            <DialogDescription className="font-bold text-slate-400">Select a certified healthcare professional to analyze this request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Medical Professional</Label>
            <Select onValueChange={(v)=> setSelectedDoctorId(Number(v))}>
              <SelectTrigger className="bg-slate-50 border-border text-foreground h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner">
                <SelectValue placeholder="Choose a specialist" />
              </SelectTrigger>
              <SelectContent className="bg-white border-border text-foreground max-h-64 rounded-2xl shadow-2xl p-2">
                {doctors.map(d => (
                  <SelectItem key={d.id} value={String(d.id)} className="rounded-xl font-bold py-3 hover:bg-slate-50">
                    <div className="flex flex-col">
                      <span className="text-sm">{d.username ? `@${d.username}` : d.name}</span>
                      <span className="text-[10px] text-muted-foreground opacity-60 font-black uppercase tracking-widest">{d.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" className="font-bold text-slate-500 rounded-xl px-6" onClick={()=> setAssignOpen(false)}>Dismiss</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
              disabled={!assignOrderId || !selectedDoctorId}
              onClick={async ()=>{
                if (!assignOrderId || !selectedDoctorId) return;
                try {
                  const res = await fetch(`${API_URL}/orders/${assignOrderId}/assign-doctor`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ doctorId: selectedDoctorId })
                  });
                  const data = await res.json();
                  if (!res.ok || data?.error) throw new Error(data?.error || 'Authorization denied');
                  setAssignOpen(false);
                  setAssignOrderId(null);
                  setSelectedDoctorId(null);
                  queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                  toast({ title: 'Assigned Successfully', description: 'Review protocols initialized.' });
                } catch (e:any) {
                  toast({ title: 'System Error', description: e?.message || 'Handshake failed', variant: 'destructive' });
                }
              }}
            >
              Confirm Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="bg-white border-border text-foreground max-w-lg h-[90vh] p-0 overflow-hidden flex flex-col rounded-[40px] shadow-2xl ring-1 ring-black/[0.05]">
          <div className="flex h-full flex-col">
            <DialogHeader className="px-8 pt-8 pb-4 bg-slate-50/50 border-b border-border/50">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">Financial Settlement</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 mt-1">Review provider quote and configure clinical fees.</DialogDescription>
            </DialogHeader>
            {invoiceOrder && (
              <>
                <div className="px-8 py-6 flex-1 overflow-y-auto">
                  <div className="space-y-6 pr-2">
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                      <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 opacity-60">Verified Order Metrics</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Manifest ID</span><span className="text-xs font-black text-slate-800">#{invoiceOrder.id}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Medicine</span><span className="text-xs font-black text-slate-800">{invoiceOrder.medicine_name || '—'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">Inventory Units</span><span className="text-xs font-black text-slate-800">{invoiceOrder.provider_confirmed_qty}</span></div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2"><span className="text-xs font-black text-slate-500 uppercase tracking-widest">Base Quote</span><span className="text-sm font-black text-emerald-600">{Number(invoiceOrder.provider_confirmed_price || 0).toFixed(2)} RWF</span></div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fulfillment Protocol</Label>
                      <Select value={fulfillmentMethod} onValueChange={(v)=> setFulfillmentMethod(v as any)}>
                        <SelectTrigger className="bg-slate-50 border-border text-foreground h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-border rounded-2xl shadow-2xl p-2">
                          <SelectItem value="online" className="rounded-xl font-bold py-3">Digital Fulfillment (No Fee)</SelectItem>
                          <SelectItem value="home_delivery" className="rounded-xl font-bold py-3">Direct Home Delivery</SelectItem>
                          <SelectItem value="pharmacy_pickup" className="rounded-xl font-bold py-3">On-site Pharmacy Pickup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Review Fee</Label>
                        <Input type="number" min="0" step="0.01" className="bg-slate-50 border-border h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner" value={doctorFee} onChange={(e)=> setDoctorFee(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Service Fee</Label>
                        <Input type="number" min="0" step="0.01" className="bg-slate-50 border-border h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner" value={serviceFee} onChange={(e)=> setServiceFee(e.target.value)} />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Logistics {fulfillmentMethod === 'online' && <span className="text-[8px] text-rose-400 font-black ml-2">(DISABLED FOR DIGITAL)</span>}</Label>
                        <Input type="number" min="0" step="0.01" className="bg-slate-50 border-border h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner" value={deliveryFee} onChange={(e)=> setDeliveryFee(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Administrative Notes</Label>
                      <Textarea className="bg-slate-50 border-border rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner min-h-[100px]" rows={3} value={notes} onChange={(e)=> setNotes(e.target.value)} placeholder="Attach specific instructions or context..." />
                    </div>
                    {(() => {
                      const med = Number(invoiceOrder.provider_confirmed_price || 0) || 0;
                      const d = Number(doctorFee || 0) || 0;
                      const s = Number(serviceFee || 0) || 0;
                      const del = fulfillmentMethod === 'online' ? 0 : (Number(deliveryFee || 0) || 0);
                      const total = med + d + s + del;
                      return (
                        <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-24 w-24 text-white" />
                          </div>
                          <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Quote</span><span className="text-sm font-bold text-white">{med.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Review</span><span className="text-sm font-bold text-white">{d.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Access</span><span className="text-sm font-bold text-white">{s.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logistic Fee</span><span className="text-sm font-bold text-white">{del.toFixed(2)}</span></div>
                            <Separator className="my-4 bg-slate-800" />
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Authenticated Total</span>
                              <span className="text-3xl font-black text-white tracking-tighter">{total.toFixed(2)} <span className="text-xs opacity-40">RWF</span></span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="px-8 pb-8 pt-6 flex justify-end gap-3 border-t border-border bg-slate-50/50 shrink-0 sticky bottom-0">
                  <Button variant="ghost" className="font-bold text-slate-500 rounded-xl px-6" onClick={()=> setInvoiceOpen(false)}>Dismiss</Button>
                  <Button
                    className="bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-primary/25 transition-all active:scale-95"
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
                        if (!res.ok || body?.error) throw new Error(body?.error || 'Validation failed');
                        setInvoiceOpen(false);
                        setInvoiceOrder(null);
                        queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                        toast({ title: 'Invoice Dispatched', description: `Financial record sent to order #${invoiceOrder.id}` });
                      } catch (e:any) {
                        toast({ title: 'Transmission Error', description: e?.message || 'Invoice finalization failed', variant: 'destructive' });
                      } finally {
                        setSubmittingInvoice(false);
                      }
                    }}
                  >
                    Release Invoice
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Provider dialog */}
      <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
        <DialogContent className="bg-white border-border text-foreground shadow-2xl rounded-[32px] p-8 ring-1 ring-black/[0.05]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">Target Fulfillment</DialogTitle>
            <DialogDescription className="font-bold text-slate-400">Identify a local pharmacy or clinical provider to fulfill this manifest.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="text-sm">
              {matchLevel === 'all' ? (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-4 shadow-sm">
                  <span className="text-amber-600 font-black uppercase text-[10px] tracking-widest block mb-1">⚠️ Wide Coverage Mode</span>
                  <p className="text-slate-600 font-medium text-xs leading-relaxed">No nearest facilities detected. Platform is now scanning the global provider network. Please select any available hub.</p>
                </div>
              ) : matchLevel ? (
                <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-800">Geographical Match: <span className="uppercase text-[10px] tracking-widest">{matchLevel}</span> Precision</span>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-widest">Network Offline / No Providers</div>
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Licensed Hub</Label>
              <Select onValueChange={(v)=> setSelectedProviderId(Number(v))}>
                <SelectTrigger className="bg-slate-50 border-border text-foreground h-14 rounded-2xl focus:ring-primary/40 focus:border-primary font-bold shadow-inner">
                  <SelectValue placeholder={providers.length ? 'Choose a hub' : 'No hubs synchronized'} />
                </SelectTrigger>
                <SelectContent className="bg-white border-border text-foreground max-h-64 rounded-2xl shadow-2xl p-2">
                  {providers.map((p:any) => (
                    <SelectItem key={p.id} value={String(p.id)} className="rounded-xl font-bold py-3 hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="text-sm">{(p.name || p.username || p.email)}</span>
                        <span className="text-[10px] text-muted-foreground opacity-60 font-black uppercase tracking-widest">{p.district}, {p.sector}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="ghost" className="font-bold text-slate-500 rounded-xl px-6" onClick={()=> setProviderOpen(false)}>Dismiss</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
              disabled={!providerOrderId || !selectedProviderId}
              onClick={async ()=>{
                if (!providerOrderId || !selectedProviderId) return;
                try {
                  const res = await fetch(`${API_URL}/orders/${providerOrderId}/assign-provider`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ providerId: selectedProviderId })
                  });
                  const data = await res.json();
                  if (!res.ok || data?.error) throw new Error(data?.error || 'Targeting failed');
                  setProviderOpen(false);
                  setProviderOrderId(null);
                  setSelectedProviderId(null);
                  queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                  toast({ title: 'Hub Assigned', description: 'Logistics protocols initialized for manifest.' });
                } catch (e:any) {
                  toast({ title: 'System Error', description: e?.message || 'Assignment handshake failed', variant: 'destructive' });
                }
              }}
            >
              Initialize Fulfillment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Invoice confirm */}
      <AlertDialog open={cancelInvoiceOpen} onOpenChange={setCancelInvoiceOpen}>
        <AlertDialogContent className="bg-white border-border text-foreground shadow-2xl rounded-[32px] p-8 ring-1 ring-black/[0.05]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-800">Void Financial Record?</AlertDialogTitle>
            <AlertDialogDescription className="font-bold text-slate-400 mt-2">
              This action will permanently invalidate the current invoice. Only proceed if the transaction has not been clinicaly settled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3">
            <AlertDialogCancel className="font-bold text-slate-500 rounded-xl px-8 border-slate-200">Keep Original</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95"
              onClick={async ()=>{
                if (!cancelInvoiceOrderId) return;
                try {
                  const res = await fetch(`${API_URL}/orders/${cancelInvoiceOrderId}/invoice/cancel`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  });
                  const body = await res.json();
                  if (!res.ok || body?.error) throw new Error(body?.error || 'Voiding cancelled');
                  setCancelInvoiceOpen(false);
                  setCancelInvoiceOrderId(null);
                  queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                  toast({ title: 'Invoice Voided', description: `Record cleared for manifest #${cancelInvoiceOrderId}.` });
                } catch (e:any) {
                  toast({ title: 'Security Error', description: e?.message || 'Failed to void transaction', variant: 'destructive' });
                }
              }}
            >
              Confirm Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Certificate Viewer dialog */}
      <Dialog open={certViewerOpen} onOpenChange={setCertViewerOpen}>
        <DialogContent className="bg-white border-border text-foreground max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-[40px] shadow-2xl ring-1 ring-black/[0.05]">
          <DialogHeader className="px-10 pt-10 pb-6 bg-slate-50/50 border-b border-border/50">
            <DialogTitle className="text-3xl font-black tracking-tight text-slate-800">Clinical Verification</DialogTitle>
            <DialogDescription className="font-bold text-slate-400 mt-1 truncate max-w-md">Reference: <span className="text-primary">{certFileName}</span></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-8 overflow-auto max-h-[60vh] bg-slate-100/30">
            {certUrl?.toLowerCase().endsWith('.pdf') ? (
              <object data={certUrl} type="application/pdf" className="w-full h-[55vh] rounded-3xl border border-slate-200 shadow-2xl bg-white">
                <div className="p-16 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-slate-800 font-black tracking-tight uppercase text-xs">PDF Render Error</h3>
                  <p className="text-slate-400 font-bold text-xs mt-4 mb-8">This browser manifest does not support direct PDF streaming.</p>
                  <Button asChild className="bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl h-12 shadow-lg shadow-primary/20 transition-all"><a href={certUrl} target="_blank" rel="noreferrer">Open Secure Stream</a></Button>
                </div>
              </object>
            ) : (
              <div className="relative group/preview">
                <img src={certUrl || ''} alt="Clinical Verification" className="max-w-full max-h-full object-contain rounded-[32px] border-4 border-white shadow-2xl ring-1 ring-black/[0.05]" />
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[32px] pointer-events-none" />
              </div>
            )}
          </div>
          <div className="px-10 py-8 flex justify-end gap-4 border-t border-border bg-slate-50/50">
            <Button variant="ghost" className="font-bold text-slate-500 rounded-xl px-8 h-12 hover:bg-white hover:text-primary transition-all" asChild>
              <a href={certUrl || ''} target="_blank" rel="noreferrer">
                <Search className="h-4 w-4 mr-2" /> Inspect Original
              </a>
            </Button>
            <Button variant="default" className="bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest px-10 h-12 rounded-xl shadow-xl shadow-primary/25 transition-all" onClick={() => setCertViewerOpen(false)}>Close Inspector</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

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
      <AlertDialogContent className="bg-white border-border text-foreground shadow-2xl rounded-[32px] p-8 ring-1 ring-black/[0.05]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-800">Decline Request?</AlertDialogTitle>
          <AlertDialogDescription className="font-bold text-slate-400 mt-2">
            This action will permanently reject the clinical manifest. Transparent reasoning must be provided to the patient.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-6">
          <Label className="text-[10px] font-black uppercase tracking-widest text-rose-500 ml-1">Reason for Rejection</Label>
          <Textarea 
            className="mt-2 bg-slate-50 border-border rounded-2xl focus:ring-rose-500/40 focus:border-rose-500 font-bold shadow-inner min-h-[120px]" 
            placeholder="Document the clinical or administrative reason for this decline..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="font-bold text-slate-500 rounded-xl px-8 border-slate-200">Reconsider</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95"
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Processing...' : 'Confirm Rejection'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
