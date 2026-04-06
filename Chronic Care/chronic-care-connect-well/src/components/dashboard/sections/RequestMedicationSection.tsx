import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { chronicDiseasesRW, dosageFrequencies, genders, paymentMethods } from '@/lib/diseases';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  idCard: z.string().regex(/^1\d{15}$/,'ID card must be 16 digits and start with 1'),
  phone: z.string().min(7, 'Phone is required'),
  district: z.string().min(2, 'District is required'),
  sector: z.string().min(2, 'Sector is required'),
  cell: z.string().min(2, 'Cell is required'),
  village: z.string().min(2, 'Village is required'),
  disease: z.string().min(1, 'Select a disease'),
  dosage: z.string().min(1, 'Select dosage'),
  age: z.coerce.number().int().min(0).max(130),
  gender: z.string().min(1, 'Select gender'),
  paymentMethod: z.string().min(1, 'Select payment method'),
  medicalCertificate: z.any().optional(),
});

type FormDataType = z.infer<typeof schema>;

type Order = {
  id: number;
  full_name?: string;
  id_card?: string;
  phone?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  disease: string;
  dosage: string;
  age?: number;
  gender?: string;
  payment_method?: string;
  medical_certificate?: string;
  payment_status: string;
  admin_status: string;
  doctor_status: string;
  pharmacy_status: string;
  created_at: string;
  admin_reject_reason?: string | null;
  doctor_id?: number | null;
  // optional doctor guidance fields
  medicine_name?: string | null;
  doctor_instructions?: string | null;
  doctor_advice?: string | null;
  adherence_plan?: string | null;
  prescription_quantity?: string | null;
  // invoice fields (optional)
  invoice_status?: 'draft'|'sent'|'paid'|string;
  invoice_method?: 'online'|'home_delivery'|'pharmacy_pickup'|string;
  invoice_medicine_total?: number | null;
  invoice_doctor_fee?: number | null;
  invoice_service_fee?: number | null;
  invoice_delivery_fee?: number | null;
  invoice_total?: number | null;
};

interface Props {
  setActiveSection?: (s: string) => void;
}

function getStage(o: Order): 'admin'|'doctor'|'pharmacy'|'canceled' {
  // derive a simple stage from statuses
  // canceled not returned from API (filtered), but keep for completeness
  if ((o as any).canceled) return 'canceled';
  if (o.payment_status === 'confirmed' || o.payment_status === 'approved' || o.pharmacy_status !== 'pending') return 'pharmacy';
  if (o.doctor_status === 'approved') return 'admin'; // back to admin for payment
  // During doctor review, switch chat to doctor only if a doctor is assigned
  if (o.admin_status === 'under_review' && (o.doctor_id ?? null)) return 'doctor';
  if (o.admin_status === 'approved') return 'doctor';
  return 'admin';
}

export function RequestMedicationSection({ setActiveSection }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState<Order | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [viewing, setViewing] = useState<Order | null>(null);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormDataType>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: 'pay_online',
    }
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [momoOpen, setMomoOpen] = useState(false);
  const [momoOrder, setMomoOrder] = useState<Order | null>(null);
  const [msisdn, setMsisdn] = useState('');
  const [momoRef, setMomoRef] = useState<string | null>(null);
  const [momoStatus, setMomoStatus] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load user profile data on mount to auto-fill form
  useEffect(() => {
    if (!token || profileLoaded) return;
    
    fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data?.user) {
          const u = data.user;
          // Auto-fill form with saved profile data
          if (u.first_name) setValue('fullName', u.first_name);
          if (u.id_card) setValue('idCard', u.id_card);
          if (u.phone) setValue('phone', u.phone);
          if (u.district) setValue('district', u.district);
          if (u.sector) setValue('sector', u.sector);
          if (u.cell) setValue('cell', u.cell);
          if (u.village) setValue('village', u.village);
          if (u.gender) setValue('gender', u.gender);
          setProfileLoaded(true);
        }
      })
      .catch(() => {
        // Silently fail - user can fill form manually
      });
  }, [token, profileLoaded, setValue]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setOrders(Array.isArray(d.orders) ? d.orders : []))
      .catch(() => {});
  }, [token]);

  // Allow other components to request opening MoMo dialog for a specific order
  useEffect(() => {
    const handler = (e: any) => {
      const id = Number(e?.detail?.orderId || sessionStorage.getItem('momo:orderId'));
      if (!id || !Array.isArray(orders)) return;
      const ord = orders.find(x => Number(x.id) === id);
      if (ord) {
        setMomoOrder(ord);
        setMsisdn('');
        setMomoRef(null);
        setMomoStatus(null);
        setMomoOpen(true);
      }
    };
    window.addEventListener('momo:open', handler as any);
    // also check sessionStorage once on mount
    handler({ detail: { orderId: Number(sessionStorage.getItem('momo:orderId')) || undefined } });
    return () => window.removeEventListener('momo:open', handler as any);
  }, [orders]);

  const onSubmit = async (values: FormDataType) => {
    if (!token) {
      toast({ title: 'Not authenticated', description: 'Please log in again.', variant: 'destructive' });
      return;
    }
    try {
      const fd = new FormData();
      fd.append('fullName', values.fullName);
      fd.append('idCard', values.idCard);
      fd.append('phone', values.phone);
      fd.append('district', values.district);
      fd.append('sector', values.sector);
      fd.append('cell', values.cell);
      fd.append('village', values.village);
      fd.append('disease', values.disease);
      fd.append('dosage', values.dosage);
      fd.append('age', String(values.age));
      fd.append('gender', values.gender);
      fd.append('paymentMethod', values.paymentMethod);
      const cert = (watch('medicalCertificate') as FileList | undefined)?.[0];
      if (cert) fd.append('medicalCertificate', cert);

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Request failed', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Request submitted', description: 'Your request has been sent for review.' });
      reset();
      // refresh orders
      const list = await fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
      const listData = await list.json();
      setOrders(Array.isArray(listData.orders) ? listData.orders : []);
    } catch (e) {
      toast({ title: 'Network error', description: 'Please try again later.', variant: 'destructive' });
    }
  };

  // editing submit
  const onEditSubmit = async (values: FormDataType) => {
    if (!token || !editing) return;
    try {
      setEditSubmitting(true);
      const fd = new FormData();
      fd.append('fullName', values.fullName);
      fd.append('idCard', values.idCard);
      fd.append('phone', values.phone);
      fd.append('district', values.district);
      fd.append('sector', values.sector);
      fd.append('cell', values.cell);
      fd.append('village', values.village);
      fd.append('disease', values.disease);
      fd.append('dosage', values.dosage);
      fd.append('age', String(values.age));
      fd.append('gender', values.gender);
      fd.append('paymentMethod', values.paymentMethod);
      const cert = (watch('medicalCertificate') as FileList | undefined)?.[0];
      if (cert) fd.append('medicalCertificate', cert);

      const res = await fetch(`${API_URL}/orders/${editing.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Update failed', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Order updated', description: 'Your request was updated.' });
      setEditing(null);
      // refresh orders
      const list = await fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
      const listData = await list.json();
      setOrders(Array.isArray(listData.orders) ? listData.orders : []);
    } catch (e) {
      toast({ title: 'Network error', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const onCancelOrder = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/orders/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'Cancel failed', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Order canceled', description: 'Your request was canceled.' });
      // refresh
      const list = await fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
      const listData = await list.json();
      setOrders(Array.isArray(listData.orders) ? listData.orders : []);
    } catch {
      toast({ title: 'Network error', description: 'Please try again later.', variant: 'destructive' });
    }
  };

  if (!user) {
    return <div className="text-gray-300">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Request Medication</CardTitle>
          {profileLoaded && (
            <div className="mt-2 p-3 bg-green-900/20 border border-green-700/30 rounded-md">
              <p className="text-sm text-green-400">
                ✓ Your saved profile information has been auto-filled. This saves you time on future requests!
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Your personal details (name, ID, phone, address) are securely stored in your account and will be automatically filled for your next order.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Full Name</Label>
                <Input className="bg-gray-700 border-gray-600 text-white" {...register('fullName')} />
                {errors.fullName && <p className="text-red-400 text-sm mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">ID Card</Label>
                <Input className="bg-gray-700 border-gray-600 text-white" {...register('idCard')} placeholder="16 digits starting with 1" />
                {errors.idCard && <p className="text-red-400 text-sm mt-1">{errors.idCard.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Phone</Label>
                <Input className="bg-gray-700 border-gray-600 text-white" {...register('phone')} />
                {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">District</Label>
                <Input className="bg-gray-700 border-gray-600 text-white" {...register('district')} />
                {errors.district && <p className="text-red-400 text-sm mt-1">{errors.district.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Sector</Label>
                <Input className="bg-gray-700 border-gray-600 text-white" {...register('sector')} />
                {errors.sector && <p className="text-red-400 text-sm mt-1">{errors.sector.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Cell</Label>
                <Input className="bg-gray-700 border-gray-600 text-white" {...register('cell')} />
                {errors.cell && <p className="text-red-400 text-sm mt-1">{errors.cell.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Village</Label>
                <Input className="bg-gray-700 border-gray-600 text-white" {...register('village')} />
                {errors.village && <p className="text-red-400 text-sm mt-1">{errors.village.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Chronic Disease</Label>
                <Select onValueChange={(v) => setValue('disease', v)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select disease" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                    {chronicDiseasesRW.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.disease && <p className="text-red-400 text-sm mt-1">{errors.disease.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Quantity</Label>
                <Select onValueChange={(v) => setValue('dosage', v)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select dose" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                    {dosageFrequencies.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.dosage && <p className="text-red-400 text-sm mt-1">{errors.dosage.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Age</Label>
                <Input type="number" className="bg-gray-700 border-gray-600 text-white" {...register('age', { valueAsNumber: true })} />
                {errors.age && <p className="text-red-400 text-sm mt-1">{errors.age.message as string}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Gender</Label>
                <Select onValueChange={(v) => setValue('gender', v)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                    {genders.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-red-400 text-sm mt-1">{errors.gender.message}</p>}
              </div>
              <div>
                <Label className="text-gray-300">Payment Method</Label>
                <Select onValueChange={(v) => setValue('paymentMethod', v)} defaultValue={'pay_online'}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                    {paymentMethods.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentMethod && <p className="text-red-400 text-sm mt-1">{errors.paymentMethod.message}</p>}
              </div>
              <div className="md:col-span-2">
                <Label className="text-gray-300">Medical Certificate (PDF/JPG/PNG)</Label>
                <Input type="file" accept=".pdf,image/*" className="bg-gray-700 border-gray-600 text-white" {...register('medicalCertificate')} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.length === 0 && (
              <p className="text-gray-400">No requests yet.</p>
            )}
            {orders.map((o) => {
              const stage = getStage(o);
              const editable = (o.admin_status === 'pending' && o.doctor_status === 'pending' && o.payment_status === 'pending' && o.pharmacy_status === 'pending');
              const chatLabel = stage === 'admin' ? 'Chat with Admin' : stage === 'doctor' ? 'Chat with Doctor' : 'Chat with Pharmacy';
              const canPay = (o as any).invoice_status === 'sent' && o.payment_status !== 'confirmed';
              const openChat = () => {
                try { sessionStorage.setItem('chatTarget', stage); } catch {}
                if (!setActiveSection) return;
                if (stage === 'admin') setActiveSection('chat-admin');
                else if (stage === 'doctor') setActiveSection('chat-doctor');
                else if (stage === 'pharmacy') setActiveSection('chat-pharmacy');
                else setActiveSection('chat-admin');
              };
              return (
                <div key={o.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium capitalize">{o.disease.replace(/_/g,' ')}</p>
                      <p className="text-xs text-gray-300">{new Date(o.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
                      <span className="px-2 py-0.5 sm:py-1 rounded bg-gray-600 text-gray-100">Adm: {o.admin_status}</span>
                      <span className="px-2 py-0.5 sm:py-1 rounded bg-gray-600 text-gray-100">Doc: {o.doctor_status}</span>
                      <span className="px-2 py-0.5 sm:py-1 rounded bg-gray-600 text-gray-100">Pay: {o.payment_status}</span>
                      <span className="px-2 py-0.5 sm:py-1 rounded bg-gray-600 text-gray-100">Phar: {o.pharmacy_status}</span>
                    </div>
                  </div>
                  {/* stage indicator */}
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Dialog onOpenChange={(open) => { if (!open) setViewing(null); }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-gray-300 border-gray-400 hover:bg-gray-600/20" onClick={() => setViewing(o)}>
                          View details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Request details</DialogTitle>
                          <DialogDescription className="sr-only">Detailed health information and tracking status for your medication request.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex justify-between"><span className="text-gray-400">Full name</span><span className="font-medium">{viewing?.full_name || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">ID card</span><span className="font-medium">{viewing?.id_card || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="font-medium">{viewing?.phone || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Age</span><span className="font-medium">{viewing?.age ?? '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Gender</span><span className="font-medium capitalize">{(viewing?.gender || '-').toString().replace(/_/g,' ')}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Payment</span><span className="font-medium capitalize">{(viewing?.payment_method || '-').toString().replace(/_/g,' ')}</span></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between"><span className="text-gray-400">District</span><span className="font-medium">{viewing?.district || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Sector</span><span className="font-medium">{viewing?.sector || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Cell</span><span className="font-medium">{viewing?.cell || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Village</span><span className="font-medium">{viewing?.village || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Disease</span><span className="font-medium capitalize">{viewing?.disease?.replace(/_/g,' ')}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="font-medium capitalize">{viewing?.dosage?.replace(/_/g,' ')}</span></div>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Statuses</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-100">Admin: {viewing?.admin_status}</span>
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-100">Doctor: {viewing?.doctor_status}</span>
                            	  <span className="px-2 py-1 rounded bg-gray-700 text-gray-100">Payment: {viewing?.payment_status}</span>
                              <span className="px-2 py-1 rounded bg-gray-700 text-gray-100">Pharmacy: {viewing?.pharmacy_status}</span>
                            </div>
                          </div>
                          {viewing?.admin_status === 'rejected' && viewing?.admin_reject_reason && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-300">
                              <div className="font-medium text-red-200 mb-1">Rejection reason</div>
                              <div className="whitespace-pre-line">{viewing.admin_reject_reason}</div>
                            </div>
                          )}
                          {viewing?.medical_certificate && (
                            <div>
                              <p className="text-sm text-gray-400 mb-2">Medical certificate</p>
                              {
                                (() => {
                                  const url = viewing?.medical_certificate?.startsWith('http')
                                    ? viewing.medical_certificate!
                                    : `${API_URL}/${viewing?.medical_certificate}`;
                                  const isPdf = (viewing?.medical_certificate || '').toLowerCase().endsWith('.pdf');
                                  if (isPdf) {
                                    return (
                                      <>
                                        <object data={url} type="application/pdf" className="w-full h-96 rounded border border-gray-700">
                                          <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 underline">Open PDF</a>
                                        </object>
                                        <div className="mt-2 flex gap-3 text-sm">
                                          <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 underline">Open full</a>
                                          <a href={url} download className="text-blue-400 underline">Download</a>
                                        </div>
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      <img src={url} alt="Medical certificate" className="max-h-96 rounded border border-gray-700" />
                                      <div className="mt-2 flex gap-3 text-sm">
                                        <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 underline">Open full</a>
                                        <a href={url} download className="text-blue-400 underline">Download</a>
                                      </div>
                                    </>
                                  );
                                })()
                              }
                            </div>
                          )}
                          {viewing?.doctor_status === 'rejected' && (viewing as any)?.doctor_reject_reason && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-300">
                              <div className="font-medium text-red-200 mb-1">Doctor rejection reason</div>
                              <div className="whitespace-pre-line">{(viewing as any).doctor_reject_reason}</div>
                            </div>
                          )}
                          {/* Invoice summary and payment */}
                          {(viewing as any)?.invoice_status === 'sent' && (
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-200">
                              <div className="font-medium text-blue-100 mb-2">Invoice Ready — Please Pay</div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-200">
                                <div>Method</div><div className="text-white font-medium capitalize">{(viewing as any).invoice_method?.toString().replace(/_/g,' ') || '—'}</div>
                                <div>Medicine</div><div className="text-white font-medium">{Number((viewing as any).invoice_medicine_total || 0).toFixed(2)}</div>
                                <div>Doctor</div><div className="text-white font-medium">{Number((viewing as any).invoice_doctor_fee || 0).toFixed(2)}</div>
                                <div>Service</div><div className="text-white font-medium">{Number((viewing as any).invoice_service_fee || 0).toFixed(2)}</div>
                                <div>Delivery</div><div className="text-white font-medium">{Number((viewing as any).invoice_delivery_fee || 0).toFixed(2)}</div>
                                <div className="font-semibold">Total</div><div className="text-white font-semibold">{Number((viewing as any).invoice_total || 0).toFixed(2)}</div>
                              </div>
                              {viewing?.payment_status !== 'confirmed' && (
                                <div className="mt-3">
                                  <div className="flex gap-2 flex-wrap">
                                    <Button
                                      className="bg-emerald-600 hover:bg-emerald-700"
                                      onClick={() => { setMomoOpen(true); setMomoOrder(viewing); setMsisdn(''); setMomoRef(null); setMomoStatus(null); }}
                                    >
                                      Pay Now
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
              {/* doctor guidance in details (visible after payment or after delivery) */}
              {((viewing?.payment_status === 'confirmed') || (viewing?.pharmacy_status === 'delivered')) && (viewing?.medicine_name || viewing?.doctor_instructions || viewing?.doctor_advice || viewing?.adherence_plan) && (
                            <div className="p-3 bg-gray-700/60 border border-gray-700 rounded">
                              <p className="text-sm text-gray-200 mb-2">Doctor Prescription & Guidance</p>
                              {viewing?.medicine_name && <div className="text-sm"><span className="text-gray-400">Medicine:</span> <span className="text-gray-100">{viewing.medicine_name}</span></div>}
                              {(viewing?.prescription_quantity || viewing?.dosage) && <div className="text-sm"><span className="text-gray-400">Quantity:</span> <span className="text-gray-100">{viewing?.prescription_quantity || viewing?.dosage}</span></div>}
                              {viewing?.doctor_instructions && <div className="text-sm"><span className="text-gray-400">How to take:</span> <span className="text-gray-100 whitespace-pre-line">{viewing.doctor_instructions}</span></div>}
                              {viewing?.doctor_advice && <div className="text-sm"><span className="text-gray-400">Advice:</span> <span className="text-gray-100 whitespace-pre-line">{viewing.doctor_advice}</span></div>}
                              {viewing?.adherence_plan && <div className="text-sm"><span className="text-gray-400">Adherence plan:</span> <span className="text-gray-100 whitespace-pre-line">{viewing.adherence_plan}</span></div>}
                            </div>
                          )}
              {viewing && (viewing.payment_status !== 'confirmed') && (viewing.pharmacy_status !== 'delivered') && (viewing.medicine_name || viewing.doctor_instructions || viewing.doctor_advice || viewing.adherence_plan) && (
                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-200">
                Doctor guidance will be available after payment is confirmed or once delivery is completed.
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <DialogClose asChild>
                            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                          </DialogClose>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" className="text-blue-300 border-blue-400 hover:bg-blue-600/10" onClick={openChat}>
                      {chatLabel}
                    </Button>
                    {canPay && (
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => { setMomoOpen(true); setMomoOrder(o); setMsisdn(''); setMomoRef(null); setMomoStatus(null); }}
                      >
                        Pay Now
                      </Button>
                    )}
                    {editable && (
                      <>
                        <Dialog onOpenChange={(open) => { if (!open) setEditing(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="text-yellow-300 border-yellow-400 hover:bg-yellow-600/10" onClick={() => {
                              setEditing(o);
                              // prefill form values for editing
                              reset({
                                fullName: o.full_name || '',
                                idCard: o.id_card || '',
                                phone: o.phone || '',
                                district: o.district || '',
                                sector: o.sector || '',
                                cell: o.cell || '',
                                village: o.village || '',
                                disease: o.disease,
                                dosage: o.dosage,
                                age: o.age || 0,
                                gender: o.gender || '',
                                paymentMethod: o.payment_method || 'pay_online',
                                medicalCertificate: undefined,
                              });
                            }}>
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-3xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Edit Request</DialogTitle>
                              <DialogDescription className="sr-only">Update your personal details, location, or medication information for this request.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                                <div>
                                  <Label className="text-gray-300">Full Name</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white" {...register('fullName')} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">ID Card</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white" {...register('idCard')} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Phone</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white" {...register('phone')} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">District</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white" {...register('district')} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Sector</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white" {...register('sector')} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Cell</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white" {...register('cell')} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Village</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white" {...register('village')} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Chronic Disease</Label>
                                  <Select onValueChange={(v) => setValue('disease', v)}>
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                      <SelectValue placeholder="Select disease" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                      {chronicDiseasesRW.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-gray-300">Quantity</Label>
                                  <Select onValueChange={(v) => setValue('dosage', v)}>
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                      <SelectValue placeholder="Select dose" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                      {dosageFrequencies.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-gray-300">Age</Label>
                                  <Input type="number" className="bg-gray-700 border-gray-600 text-white" {...register('age', { valueAsNumber: true })} />
                                </div>
                                <div>
                                  <Label className="text-gray-300">Gender</Label>
                                  <Select onValueChange={(v) => setValue('gender', v)}>
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                      <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                      {genders.map((g) => (
                                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-gray-300">Payment Method</Label>
                                  <Select onValueChange={(v) => setValue('paymentMethod', v)}>
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                      <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                      {paymentMethods.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="md:col-span-2">
                                  <Label className="text-gray-300">Medical Certificate (PDF/JPG/PNG)</Label>
                                  <Input type="file" accept=".pdf,image/*" className="bg-gray-700 border-gray-600 text-white" {...register('medicalCertificate')} />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Close</Button>
                                <Button type="submit" disabled={editSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-red-300 border-red-400 hover:bg-red-600/10">
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-800 border-gray-700 text-gray-100">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-300">
                                This action cannot be undone. Your request will be canceled and removed from active review.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600">No, keep it</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onCancelOrder(o.id)}>
                                Yes, cancel
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                  {/* brief invoice summary on card */}
                  {(o as any).invoice_status === 'sent' && (
                    <div className="mt-3 text-xs text-blue-200 bg-blue-500/10 border border-blue-500/20 rounded p-2">
                      <div className="font-medium mb-1">Invoice</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <div>Method: <span className="text-white capitalize">{(o as any).invoice_method?.toString().replace(/_/g,' ') || '—'}</span></div>
                        <div>Total: <span className="text-white">{Number((o as any).invoice_total || 0).toFixed(2)}</span></div>
                      </div>
                    </div>
                  )}
                  {/* brief doctor guidance summary on card (visible after payment or delivery) */}
                  {(o.payment_status === 'confirmed' || o.pharmacy_status === 'delivered') && (o.medicine_name || o.doctor_instructions || o.doctor_advice || o.prescription_quantity) && (
                    <div className="mt-3 text-xs text-gray-200">
                      <div className="font-medium mb-1">Doctor guidance</div>
                      {o.medicine_name && <div><span className="text-gray-400">Medicine:</span> {o.medicine_name}</div>}
                      {o.prescription_quantity && <div><span className="text-gray-400">Quantity:</span> {o.prescription_quantity}</div>}
                      {o.doctor_instructions && <div className="line-clamp-2"><span className="text-gray-400">How to take:</span> {o.doctor_instructions}</div>}
                      {o.doctor_advice && <div className="line-clamp-2"><span className="text-gray-400">Advice:</span> {o.doctor_advice}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {/* MTN MoMo Payment Dialog */}
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
            if (viewing) setViewing(null);
            toast({ title: 'Payment successful', description: 'Your order has been paid.' });
          } catch (e) {}
        }}
      />
    </div>
  );
}

// Inline MoMo payment dialog (mounted at bottom via portal from parent state)
export function MtnMomoDialog({ open, onOpenChange, order, msisdn, setMsisdn, referenceId, setReferenceId, status, setStatus, token, onPaid }: any) {
  const total = Number((order as any)?.invoice_total || 0);
  const disabled = !/^(2507|07)\d{8}$/.test(msisdn);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-md">
        <DialogHeader>
          <DialogTitle>Pay with MTN MoMo</DialogTitle>
          <DialogDescription className="sr-only">Initiate a secure mobile money payment to complete your medication order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-gray-300">Order #{order?.id}</div>
          <div className="text-sm text-gray-300">Amount to pay: <span className="text-white font-semibold">{total.toFixed(2)}</span></div>
          <div>
            <Label className="text-gray-300">MTN Number (2507XXXXXXXX or 07XXXXXXXX)</Label>
            <Input value={msisdn} onChange={(e:any)=>setMsisdn(e.target.value)} placeholder="07XXXXXXXX or 2507XXXXXXXX" className="bg-gray-700 border-gray-600 text-white" />
          </div>
          {!referenceId ? (
            <Button
              disabled={disabled}
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={async ()=>{
                try {
                  let normalizedMsisdn = msisdn.trim();
                  if (normalizedMsisdn.startsWith('0')) {
                    normalizedMsisdn = '250' + normalizedMsisdn.slice(1);
                  }

                  const r = await fetch(`${API_URL}/payments/mtn/request`, {
                    method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ orderId: order?.id, msisdn: normalizedMsisdn })
                  });
                  const b = await r.json();
                  if (!r.ok || b?.error) throw new Error(b?.error || 'Failed to start payment');
                  setReferenceId(b.referenceId);
                  setStatus('PENDING');
                } catch (e:any) {
                  alert(e?.message || 'Failed to start payment');
                }
              }}
            >
              Request To Pay
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-sm">Reference: <span className="font-mono">{referenceId}</span></div>
              <div className="text-sm">Status: <span className="font-semibold">{status || 'PENDING'}</span></div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async ()=>{
                    try {
                      const r = await fetch(`${API_URL}/payments/mtn/status/${referenceId}`, { headers: { Authorization: `Bearer ${token}` } });
                      const b = await r.json();
                      if (!r.ok || b?.error) throw new Error(b?.error || 'Status failed');
                      setStatus(b.status);
                      if (String(b.status).toUpperCase() === 'SUCCESSFUL') {
                        onPaid && onPaid();
                        onOpenChange(false);
                      }
                    } catch (e:any) {
                      alert(e?.message || 'Failed to poll status');
                    }
                  }}
                >
                  Refresh Status
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  disabled={String(status||'').toUpperCase() !== 'SUCCESSFUL'}
                  onClick={()=>{ onPaid && onPaid(); onOpenChange(false); }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Mount the MoMo dialog at the bottom of this file's default export scope
// no default export
