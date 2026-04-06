import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MtnMomoDialog } from './RequestMedicationSection';
import { io } from 'socket.io-client';
import { API_URL } from '@/lib/utils';
import { CheckCircle, LogOut } from 'lucide-react';

type Order = {
  id: number;
  full_name?: string;
  disease: string;
  dosage: string;
  admin_status: string;
  doctor_status: string;
  pharmacy_status: string;
  payment_status: string;
  admin_reject_reason?: string | null;
  created_at: string;
  doctor_id?: number | null;
  medicine_name?: string | null;
  doctor_instructions?: string | null;
  doctor_advice?: string | null;
  adherence_plan?: string | null;
  prescription_quantity?: string | null;
  doctor_reject_reason?: string | null;
};

function getStage(o: Order): 'admin'|'doctor'|'pharmacy'|'canceled' {
  if ((o as any).canceled) return 'canceled';
  if (o.payment_status === 'confirmed' || o.payment_status === 'approved' || o.pharmacy_status !== 'pending') return 'pharmacy';
  if (o.doctor_status === 'approved') return 'admin';
  if (o.admin_status === 'under_review' && (o.doctor_id ?? null)) return 'doctor';
  if (o.admin_status === 'approved') return 'doctor';
  return 'admin';
}

export function MyRequestsSection({ setActiveSection }: { setActiveSection?: (s: string)=>void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // MoMo dialog state
  const [momoOpen, setMomoOpen] = useState(false);
  const [momoOrder, setMomoOrder] = useState<Order | null>(null);
  const [msisdn, setMsisdn] = useState('');
  const [momoRef, setMomoRef] = useState<string | null>(null);
  const [momoStatus, setMomoStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setOrders(Array.isArray(d.orders) ? d.orders : []))
      .catch(() => {});
  }, [token]);

  // Realtime: prescription created
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socket.on('prescription:created', async (p: any) => {
      try {
        const list = await fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
        const listData = await list.json();
        setOrders(Array.isArray(listData.orders) ? listData.orders : []);
      } catch {}
    });
    return () => { socket.disconnect(); };
  }, [token]);

  const openChat = (stage: 'admin'|'doctor'|'pharmacy') => {
    try { sessionStorage.setItem('chatTarget', stage); } catch {}
    if (!setActiveSection) return;
    if (stage === 'admin') setActiveSection('chat-admin');
    else if (stage === 'doctor') setActiveSection('chat-doctor');
    else setActiveSection('chat-pharmacy');
  };

  return (
  <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-gray-400">No requests yet.</p>}
            {orders.map((o) => {
              const stage = getStage(o);
              const chatLabel = stage === 'admin' ? 'Chat with Admin' : stage === 'doctor' ? 'Chat with Doctor' : 'Chat with Pharmacy';
              const canPay = (o as any).invoice_status === 'sent' && o.payment_status !== 'confirmed';
              return (
                <div key={o.id} className="p-3 bg-secondary rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground font-medium capitalize">{o.disease.replace(/_/g,' ')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-background border border-border text-foreground">Admin: {o.admin_status}</span>
                      <span className="px-2 py-1 rounded bg-background border border-border text-foreground">Doctor: {o.doctor_status}</span>
                      <span className="px-2 py-1 rounded bg-background border border-border text-foreground">Payment: {o.payment_status}</span>
                      <span className="px-2 py-1 rounded bg-background border border-border text-foreground">Pharmacy: {o.pharmacy_status}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {(() => {
                      const s = stage;
                      const cls = (x: string) => x === s ? 'text-primary font-bold underline' : 'text-muted-foreground';
                      return (
                        <div className="flex items-center gap-2">
                          <span className={cls('admin')}>Admin</span>
                          <span>›</span>
                          <span className={cls('doctor')}>Doctor</span>
                          <span>›</span>
                          <span className={cls('pharmacy')}>Pharmacy</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(() => { const chatStage: 'admin'|'doctor'|'pharmacy' = stage === 'canceled' ? 'admin' : stage; return (
                    <Button variant="outline" className="text-foreground border-border hover:bg-accent" onClick={() => openChat(chatStage)}>
                      {chatLabel}
                    </Button>
                    ); })()}
                    {canPay && (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => { setMomoOpen(true); setMomoOrder(o); setMsisdn(''); setMomoRef(null); setMomoStatus(null); }}
                      >
                        Pay Now
                      </Button>
                    )}
                  </div>
                  <PatientOrderPrescriptions order={o} token={token!} />
                  {o.admin_status === 'rejected' && o.admin_reject_reason && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 shadow-sm">
                      <div className="font-bold text-red-800 mb-1 flex items-center capitalize">
                        <LogOut className="h-4 w-4 mr-2 rotate-180" />
                        Admin Rejection Reason
                      </div>
                      <div className="whitespace-pre-line font-medium italic">{o.admin_reject_reason}</div>
                    </div>
                  )}
                  {o.doctor_status === 'rejected' && (o as any).doctor_reject_reason && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 shadow-sm">
                      <div className="font-bold text-red-800 mb-1 flex items-center capitalize">
                        <LogOut className="h-4 w-4 mr-2 rotate-180" />
                        Doctor Rejection Reason
                      </div>
                      <div className="whitespace-pre-line font-medium italic">{(o as any).doctor_reject_reason}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <MtnMomoDialog
        open={momoOpen}
        onOpenChange={(v: boolean) => { setMomoOpen(v); if (!v) { setMomoOrder(null); setMomoRef(null); setMomoStatus(null); } }}
        order={momoOrder}
        msisdn={msisdn}
        setMsisdn={setMsisdn}
        referenceId={momoRef}
        setReferenceId={setMomoRef}
        status={momoStatus}
        setStatus={setMomoStatus}
        token={token}
        onPaid={async () => {
          try {
            const list = await fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
            const listData = await list.json();
            setOrders(Array.isArray(listData.orders) ? listData.orders : []);
          } catch (e) {}
        }}
      />
    </div>
  );
}

// Mount the MoMo dialog at the bottom so it’s available on this page
export function MyRequestsSectionWithMomo(props: { setActiveSection?: (s: string)=>void }) {
  return (
    <>
      <MyRequestsSection {...props} />
    </>
  );
}

function PatientOrderPrescriptions({ order, token }: { order: Order; token: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/orders/${order.id}/prescriptions`, { headers: { Authorization: `Bearer ${token}` } });
        const b = await r.json();
  const rows = Array.isArray(b?.prescriptions) ? b.prescriptions : [];
  // Only show the latest active prescription to the patient
  const sorted = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestActive = sorted.find(p => p.status === 'active') || sorted[0];
  if (mounted) setItems(latestActive ? [latestActive] : []);
      } catch {}
    };
    load();
    return () => { mounted = false; };
  }, [order.id, token]);

  const hasGuidance = !!(order.medicine_name || order.doctor_instructions || order.doctor_advice || order.adherence_plan);
  if (!items.length && !hasGuidance) return null;
  if (order.payment_status !== 'confirmed' && order.pharmacy_status !== 'delivered') return null;

  const p = items[0] || {};
  const medicine = p.medicine_name || order.medicine_name || 'Medicine';

  return (
    <div className="mt-4 p-4 bg-emerald-50 rounded-xl space-y-3 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
      <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
        <div className="text-emerald-700 font-black text-sm uppercase tracking-tight flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          Treatment Plan: {medicine}
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-tight font-black shadow-sm">{p.status || 'Active'}</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
        <div className="space-y-2">
          <p className="text-[10px] uppercase text-emerald-600/70 font-black tracking-widest">Fulfillment</p>
          <div><span className="text-emerald-700/60 font-bold">Qty:</span> <span className="text-emerald-900 font-black text-sm">{p.quantity || order.prescription_quantity || '-'}</span></div>
          {p.dosage && <div><span className="text-emerald-700/60 font-bold">Dose:</span> <span className="text-emerald-900 font-black text-sm">{p.dosage}</span></div>}
          {p.frequency_per_day != null && <div><span className="text-emerald-700/60 font-bold">Freq:</span> <span className="text-emerald-900 font-black text-sm">{p.frequency_per_day}x Daily</span></div>}
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase text-emerald-600/70 font-black tracking-widest">Medical Guidance</p>
          <div className="text-emerald-800 italic bg-white/60 p-2 rounded-lg border border-emerald-100/50 shadow-inner">“{p.instructions || order.doctor_instructions || 'Take as prescribed.'}”</div>
          {order.doctor_advice && (
            <div className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg mt-1 border border-blue-100 shadow-sm">
              <span className="font-black uppercase text-[9px] block text-blue-600/70 mb-1">Doctor's Advice</span> {order.doctor_advice}
            </div>
          )}
        </div>
      </div>
      
      {order.adherence_plan && (
        <div className="text-[11px] text-amber-700 border-t border-emerald-100/50 pt-2 font-medium">
          <span className="font-black text-amber-600/70 uppercase text-[9px] block mb-1 tracking-widest">Pharmacist Adherence Plan</span>
          {order.adherence_plan}
        </div>
      )}
    </div>
  );
}
