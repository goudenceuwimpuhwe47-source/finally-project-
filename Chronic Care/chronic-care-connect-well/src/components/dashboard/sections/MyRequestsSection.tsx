import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MtnMomoDialog } from './RequestMedicationSection';
import { io } from 'socket.io-client';
import { API_URL } from '@/lib/utils';

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
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-gray-400">No requests yet.</p>}
            {orders.map((o) => {
              const stage = getStage(o);
              const chatLabel = stage === 'admin' ? 'Chat with Admin' : stage === 'doctor' ? 'Chat with Doctor' : 'Chat with Pharmacy';
              const canPay = (o as any).invoice_status === 'sent' && o.payment_status !== 'confirmed';
              return (
                <div key={o.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium capitalize">{o.disease.replace(/_/g,' ')}</p>
                      <p className="text-xs text-gray-300">{new Date(o.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-1 rounded bg-gray-600 text-gray-100">Admin: {o.admin_status}</span>
                      <span className="px-2 py-1 rounded bg-gray-600 text-gray-100">Doctor: {o.doctor_status}</span>
                      <span className="px-2 py-1 rounded bg-gray-600 text-gray-100">Payment: {o.payment_status}</span>
                      <span className="px-2 py-1 rounded bg-gray-600 text-gray-100">Pharmacy: {o.pharmacy_status}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-300">
                    {(() => {
                      const s = stage;
                      const cls = (x: string) => x === s ? 'text-blue-400 underline' : 'text-gray-300';
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
                    <Button variant="outline" className="text-gray-300 border-gray-400 hover:bg-gray-600/20" onClick={() => openChat(chatStage)}>
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
    {(o.payment_status === 'confirmed' || o.pharmacy_status === 'delivered') && (o.medicine_name || o.doctor_instructions || o.doctor_advice || o.prescription_quantity) && (
                    <div className="mt-3 text-xs text-gray-200">
                      <div className="font-medium mb-1">Doctor guidance</div>
                      {o.medicine_name && <div><span className="text-gray-400">Medicine:</span> {o.medicine_name}</div>}
            {o.prescription_quantity && <div><span className="text-gray-400">Quantity:</span> {o.prescription_quantity}</div>}
                      {o.doctor_instructions && <div className="line-clamp-2"><span className="text-gray-400">How to take:</span> {o.doctor_instructions}</div>}
                      {o.doctor_advice && <div className="line-clamp-2"><span className="text-gray-400">Advice:</span> {o.doctor_advice}</div>}
                    </div>
                  )}
      <PatientOrderPrescriptions orderId={o.id} token={token!} />
                  {o.admin_status === 'rejected' && o.admin_reject_reason && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-300">
                      <div className="font-medium text-red-200 mb-1">Rejection reason</div>
                      <div className="whitespace-pre-line">{o.admin_reject_reason}</div>
                    </div>
                  )}
                  {o.doctor_status === 'rejected' && (o as any).doctor_reject_reason && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-300">
                      <div className="font-medium text-red-200 mb-1">Doctor rejection reason</div>
                      <div className="whitespace-pre-line">{(o as any).doctor_reject_reason}</div>
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

function PatientOrderPrescriptions({ orderId, token }: { orderId: number; token: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/orders/${orderId}/prescriptions`, { headers: { Authorization: `Bearer ${token}` } });
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
  }, [orderId, token]);
  if (!items.length) return null;
  return (
    <div className="mt-3 text-xs text-gray-200">
  <div className="font-medium mb-1">Pharmacy prescription</div>
      <div className="space-y-1">
    {items.map((p) => (
          <div key={p.id} className="p-2 bg-gray-800 rounded border border-gray-700">
            <div><span className="text-gray-400">Medicine:</span> {p.medicine_name}</div>
            <div><span className="text-gray-400">Quantity:</span> {p.quantity}</div>
      {p.dosage && <div><span className="text-gray-400">Dosage:</span> {p.dosage}</div>}
      {p.frequency_per_day != null && <div><span className="text-gray-400">Frequency:</span> {p.frequency_per_day} per day</div>}
      {p.duration_days != null && <div><span className="text-gray-400">Duration:</span> {p.duration_days} day(s)</div>}
      {p.status && <div><span className="text-gray-400">Status:</span> {p.status}</div>}
            {p.instructions && <div className="line-clamp-3"><span className="text-gray-400">Instructions:</span> {p.instructions}</div>}
            <div className="text-gray-400">{new Date(p.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
