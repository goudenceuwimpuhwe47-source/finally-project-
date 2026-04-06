import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DoctorChat from './DoctorChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { availableMedicines } from '@/lib/medicines';
import { MessageSquare, Activity } from 'lucide-react';
import { API_URL } from '@/lib/utils';
import { getMedType } from '@/lib/med-utils';

export default function DoctorContent({ activeSection, setActiveSection }: { activeSection: string; setActiveSection: (s: string)=>void; }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]); // assigned/pending
  const [history, setHistory] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any | null>(null);
  const [approving, setApproving] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [form, setForm] = useState({ 
    medicineName: '', 
    prescriptionQuantity: '', 
    dose_amount: '1', 
    dose_unit: 'piece(s)', 
    times_per_day: 1, 
    instructions: '', 
    advice: '', 
    adherencePlan: '' 
  });
  const [rejectReason, setRejectReason] = useState('');
  
  // Clinical Unified Hook logic relocated to top level (Fix React Hook Rule Violation)
  useEffect(() => {
    if (!approving) return;
    const info = getMedType(form.medicineName);
    if (!form.dose_unit || form.dose_unit === 'piece(s)') {
       setForm(f=>({...f, dose_unit: info.unit}));
    }
  }, [form.medicineName, approving]);

  useEffect(() => {
    if (!approving) return;
    const gen = `${form.dose_amount} ${form.dose_unit} ${form.times_per_day > 1 ? `${form.times_per_day}x` : 'once'} daily`;
    if (!form.instructions || form.instructions.includes('daily')) {
       setForm(f=>({...f, instructions: gen}));
    }
  }, [form.dose_amount, form.dose_unit, form.times_per_day, approving]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { toast } = useToast();

  // Scoped local persistence for history per logged-in doctor
  const HIST_KEY = useMemo(() => user?.id ? `doctor_history_items_${user.id}` : 'doctor_history_items_guest', [user?.id]);
  const readHistoryLS = (): any[] => {
    try {
      const raw = localStorage.getItem(HIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  };
  const writeHistoryLS = (items: any[]) => {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(items)); } catch {}
  };

  const loadAssigned = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/orders/doctor/assigned`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const arr = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
      if (arr.length === 0) return; // don't override optimistic UI with empty
      setOrders(arr);
    } catch {
      // keep current state on error
    }
  };

  const loadHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/orders/doctor/history`, { headers: { Authorization: `Bearer ${token}` } });
      // allow either { orders: [...] } or a raw array
      let data: any = null;
      try { data = await res.json(); } catch { data = []; }
      const arr = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
      setHistory(arr);
      writeHistoryLS(arr);
    } catch {
      // on error only, try cache
      const cached = readHistoryLS();
      if (cached.length) setHistory(cached);
    }
  };

  const loadPatients = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/orders/doctor/patients`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Server error');
      setPatients(Array.isArray(data?.patients) ? data.patients : []);
    } catch (e: any) {
      toast({ title: 'Error', description: `Failed to load patients list: ${e.message}`, variant: 'destructive' });
    }
  };

  useEffect(()=>{
  // Cleanup legacy unscoped cache key from older builds
  try { localStorage.removeItem('doctor_history_items'); } catch {}

    if (activeSection === 'history') {
      loadHistory();
    } else if (activeSection === 'patients') {
      loadPatients();
    } else {
      loadAssigned();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user?.id]);

  // fetch JSON safely: tolerate non-JSON error bodies (e.g., 404 HTML)
  const requestJSON = async (url: string, options: RequestInit) => {
    const res = await fetch(url, options);
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // ignore non-JSON bodies
    }
    if (!res.ok) {
      const msg = data?.error || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  };

  const submitApprove = async () => {
    if (!token || !approving) return;
    const current = approving; // snapshot to avoid races
  if (!form.medicineName.trim() || !form.prescriptionQuantity.trim() || !form.instructions.trim()) {
      toast({ title: 'Missing fields', description: 'Medicine, quantity and instructions are required.', variant: 'destructive' });
      return;
    }
    
    // Validate quantity is a positive number
    const quantity = parseInt(form.prescriptionQuantity);
    if (isNaN(quantity) || quantity < 1) {
      toast({ title: 'Invalid quantity', description: 'Quantity must be a positive number.', variant: 'destructive' });
      return;
    }
    try {
      await requestJSON(`${API_URL}/orders/${current.id}/doctor-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: 'approved',
          medicine_name: form.medicineName,
          prescription_quantity: form.prescriptionQuantity,
          instructions: form.instructions,
          advice: form.advice,
          adherence_plan: form.adherencePlan,
        }),
      });
      toast({ title: 'Approved', description: 'Prescription saved and sent back to admin.' });
      // optimistic: move item to history locally (dedupe by id)
      setOrders(prev => prev.filter(p => p.id !== current.id));
      setHistory(prev => {
        const filtered = prev.filter(p => p.id !== current.id);
        const next = [{
          ...current,
          doctor_status: 'approved',
          medicine_name: form.medicineName,
          prescription_quantity: form.prescriptionQuantity,
          dosage: `${form.dose_amount}${form.dose_unit}`,
          frequency_per_day: form.times_per_day,
          instructions: form.instructions,
          advice: form.advice,
          adherence_plan: form.adherencePlan,
        }, ...filtered];
        writeHistoryLS(next);
        return next;
      });
      setApproving(null);
      setForm({ medicineName: '', prescriptionQuantity: '', dose_amount: '1', dose_unit: 'piece(s)', times_per_day: 1, instructions: '', advice: '', adherencePlan: '' });
  // avoid immediate refetch that could clobber optimistic state; backend sync happens later
  setActiveSection('history');
    } catch (e: any) {
      const msg = e?.message || 'Please try again.';
      toast({ title: 'Approval failed', description: msg, variant: 'destructive' });
    }
  };

  const submitReject = async () => {
    if (!token || !rejecting) return;
    const current = rejecting; // snapshot
    if (!rejectReason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a rejection reason.', variant: 'destructive' });
      return;
    }
    try {
      await requestJSON(`${API_URL}/orders/${current.id}/doctor-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'rejected', reason: rejectReason.trim() }),
      });
      toast({ title: 'Rejected', description: 'Order rejected with reason.' });
      // optimistic: move to history locally (dedupe)
      setOrders(prev => prev.filter(p => p.id !== current.id));
      setHistory(prev => {
        const filtered = prev.filter(p => p.id !== current.id);
        const next = [{
          ...current,
          doctor_status: 'rejected',
          doctor_reject_reason: rejectReason.trim(),
        }, ...filtered];
        writeHistoryLS(next);
        return next;
      });
      setRejecting(null);
      setRejectReason('');
  // avoid immediate refetch; keep optimistic state
    } catch (e: any) {
      const msg = e?.message || 'Please try again.';
      toast({ title: 'Reject failed', description: msg, variant: 'destructive' });
    }
  };

  if (activeSection === 'chat' || activeSection === 'chat-doctor') {
    return (
      <div className="p-4">
        <h2 className="text-xl font-black text-slate-800 mb-4 uppercase tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl shadow-sm">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          Clinical Direct
        </h2>
        <DoctorChat initialPatientId={viewing?.user_id || approving?.user_id || rejecting?.user_id || undefined} />
      </div>
    );
  }

  // assigned orders section
  const assignedSection = (
    <Card className="bg-white border-slate-100 shadow-xl rounded-3xl overflow-hidden border-t-4 border-t-primary">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-slate-800 font-black uppercase tracking-tight">Active Assignments</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {orders.filter(o => o.doctor_status !== 'approved').length === 0 && <p className="text-gray-400">No assigned orders.</p>}
        <div className="space-y-3">
          {orders.filter(o => o.doctor_status !== 'approved').map(o => (
            <div key={o.id} className="p-5 bg-white border border-slate-100 rounded-[24px] flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all group duration-300">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-primary/5 rounded-[20px] flex items-center justify-center border border-primary/10 shadow-sm group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                   <Activity className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-slate-800 font-black capitalize tracking-tight text-lg">{String(o.disease||'request').replace(/_/g,' ')}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1 flex items-center gap-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">Order #{o.id}</span>
                    <span>•</span>
                    <span>{new Date(o.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-bold mt-1.5 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    Patient: <span className="text-slate-700">{o.full_name || o.username || o.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog onOpenChange={(open)=> { if (!open) setViewing(null); }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-slate-500 border-slate-200 hover:bg-slate-50 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                      onClick={()=> setViewing(o)}
                    >
                      Audit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-black uppercase tracking-tight text-slate-800">Review Clinical Request</DialogTitle>
                      <DialogDescription className="text-slate-500 font-medium italic">Satellite synchronization data for medication fulfillment.</DialogDescription>
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
                      {(viewing?.doctor_status === 'approved' || viewing?.doctor_status === 'rejected') && (
                        <div className="p-3 bg-gray-700/60 rounded border border-gray-600">
                          <div className="text-sm text-gray-300 mb-2">Doctor guidance</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-400">Medicine:</span> <span className="font-medium">{viewing?.medicine_name || '-'}</span></div>
                            <div><span className="text-gray-400">Quantity:</span> <span className="font-medium">{viewing?.prescription_quantity || '-'}</span></div>
                            <div className="md:col-span-2"><span className="text-gray-400">Instructions:</span>
                              <div className="font-medium whitespace-pre-line">{viewing?.instructions || viewing?.doctor_instructions || '-'}</div>
                            </div>
                            {viewing?.advice || viewing?.doctor_advice ? (
                              <div className="md:col-span-2"><span className="text-gray-400">Advice:</span>
                                <div className="font-medium whitespace-pre-line">{viewing?.advice || viewing?.doctor_advice}</div>
                              </div>
                            ) : null}
                            {viewing?.adherence_plan ? (
                              <div className="md:col-span-2"><span className="text-gray-400">Adherence plan:</span>
                                <div className="font-medium whitespace-pre-line">{viewing?.adherence_plan}</div>
                              </div>
                            ) : null}
                            {viewing?.doctor_status === 'rejected' && viewing?.doctor_reject_reason ? (
                              <div className="md:col-span-2 text-red-300"><span className="text-red-300">Reject reason:</span>
                                <div className="whitespace-pre-line">{viewing?.doctor_reject_reason}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
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
                              const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
                              const path = (viewing?.medical_certificate || '').startsWith('/') 
                                ? viewing.medical_certificate 
                                : `/${viewing?.medical_certificate}`;
                              const url = viewing?.medical_certificate?.startsWith('http')
                                ? viewing.medical_certificate!
                                : `${base}${path}`;
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
                    </div>
                    <div className="mt-4 flex justify-end">
                      <DialogClose asChild>
                        <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-4 shadow-lg shadow-primary/20" size="sm" onClick={()=> { setViewing(o); setActiveSection('chat-doctor'); }}>Sync Chat</Button>
                  <Dialog onOpenChange={(open)=> { if (!open) setApproving(null); }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-4 shadow-lg shadow-emerald-500/20"
                        onClick={()=> {
                          setApproving(o);
                          setForm({
                            medicineName: o.medicine_name || '',
                            prescriptionQuantity: String(o.prescription_quantity || o.quantity || ''),
                            dose_amount: '1',
                            dose_unit: 'piece(s)',
                            times_per_day: 1,
                            instructions: o.instructions || o.doctor_instructions || '',
                            advice: o.advice || o.doctor_advice || '',
                            adherencePlan: o.adherence_plan || '',
                          });
                        }}
                      >
                        Authenticate
                      </Button>
                    </DialogTrigger>
          <DialogContent className="bg-white border-slate-100 text-slate-800 max-w-2xl rounded-3xl shadow-2xl">
                      <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Clinical Authorization</DialogTitle>
            <DialogDescription className="text-slate-500 italic">Determine regimen parameters for this medication request.</DialogDescription>
                      </DialogHeader>
                      {approving?.doctor_status === 'approved' && (
                        <div className="mb-3 text-sm p-2 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-200">
                          This order was already approved before. You can update the prescription and resend.
                        </div>
                      )}
                      
                      {approving?.medical_certificate && (
                        <div className="mb-4 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                             <Label className="text-blue-300 font-semibold flex items-center gap-2">
                               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                               Patient Medical Certificate
                             </Label>
                             <a 
                               href={approving.medical_certificate.startsWith('http') ? approving.medical_certificate : `${API_URL.endsWith('/') ? API_URL.slice(0,-1) : API_URL}/uploads/${approving.medical_certificate.startsWith('/') ? approving.medical_certificate.slice(1) : approving.medical_certificate}`} 
                               target="_blank" 
                               rel="noreferrer" 
                               className="text-xs text-blue-400 hover:text-blue-300 underline"
                             >
                               Open Full View
                             </a>
                          </div>
                          <div className="relative group">
                            {approving.medical_certificate.toLowerCase().endsWith('.pdf') ? (
                              <div className="bg-gray-800 rounded p-4 text-center border border-dashed border-gray-600">
                                <p className="text-sm text-gray-400">PDF Document attached</p>
                                <Button variant="link" className="text-blue-400 text-xs" asChild>
                                  <a href={approving.medical_certificate.startsWith('http') ? approving.medical_certificate : `${API_URL.endsWith('/') ? API_URL.slice(0,-1) : API_URL}/uploads/${approving.medical_certificate.startsWith('/') ? approving.medical_certificate.slice(1) : approving.medical_certificate}`} target="_blank" rel="noreferrer">
                                    Click to preview PDF
                                  </a>
                                </Button>
                              </div>
                            ) : (
                               <img 
                                 src={approving.medical_certificate.startsWith('http') ? approving.medical_certificate : `${API_URL.endsWith('/') ? API_URL.slice(0,-1) : API_URL}/uploads/${approving.medical_certificate.startsWith('/') ? approving.medical_certificate.slice(1) : approving.medical_certificate}`} 
                                 alt="Certificate Preview" 
                                 className="max-h-40 w-full object-contain rounded bg-gray-950/50 border border-gray-800"
                               />
                            )}
                          </div>
                        </div>
                      )}

                      <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-4">
                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl shadow-inner space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-slate-800 font-black uppercase text-[10px] tracking-widest">Clinical Search Engine</Label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded-md border-slate-200 bg-white text-primary focus:ring-primary/20"
                                checked={showAll}
                                onChange={e => setShowAll(e.target.checked)}
                              />
                              <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-widest">Show all categories</span>
                            </label>
                          </div>
                          <div className="relative">
                            <Input
                              placeholder="Search medicine database..."
                              className="bg-white border-slate-100 text-slate-800 pl-10 rounded-2xl h-12 shadow-sm focus:ring-primary/20"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Clinical Regimen Selection *</Label>
                          <Select
                            value={form.medicineName}
                            onValueChange={(value) => {
                              const medicine = availableMedicines.find(m => m.value === value);
                              setForm(f => ({ ...f, medicineName: medicine?.label || value }));
                            }}
                          >
                            <SelectTrigger className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl shadow-sm">
                              <SelectValue placeholder="Select diagnostic medication">
                                {form.medicineName || "Select diagnostic medication"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-100 text-slate-800 max-h-[400px] rounded-2xl shadow-2xl">
                              {(() => {
                                const diseaseToCategory: Record<string, string[]> = {
                                  'diabetes': ['Diabetes'],
                                  'hypertension': ['Hypertension'],
                                  'asthma': ['Respiratory'],
                                  'hiv_aids': ['HIV/AIDS'],
                                  'tuberculosis': ['Tuberculosis'],
                                  'ckd': ['Kidney Disease'],
                                  'respiratory': ['Respiratory'],
                                  'cancer': ['Cancer'],
                                  'sickle_cell': ['Cardiovascular'],
                                  'liver': ['Liver Disease'],
                                  'epilepsy': ['Epilepsy'],
                                  'cardiovascular': ['Cardiovascular'],
                                };

                                const supportCategories = ['Pain Management', 'Vitamins', 'Gastrointestinal'];
                                const patientDisease = (approving?.disease || '').toLowerCase();
                                const recommendedCategories = diseaseToCategory[patientDisease] || [];
                                
                                const filtered = availableMedicines.filter(m => {
                                  const matchesSearch = !searchQuery || 
                                    m.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    m.category.toLowerCase().includes(searchQuery.toLowerCase());
                                  
                                  if (!matchesSearch) return false;
                                  if (showAll || searchQuery) return true;
                                  
                                  return recommendedCategories.includes(m.category) || supportCategories.includes(m.category);
                                });

                                if (filtered.length === 0) {
                                  return <div className="p-4 text-center text-gray-400 text-sm">No medicines found matching your search.</div>;
                                }

                                // Group by category
                                const grouped: Record<string, typeof availableMedicines> = {};
                                filtered.forEach(m => {
                                  if (!grouped[m.category]) grouped[m.category] = [];
                                  grouped[m.category].push(m);
                                });

                                return Object.entries(grouped).sort((a,b) => {
                                  const aRec = recommendedCategories.includes(a[0]);
                                  const bRec = recommendedCategories.includes(b[0]);
                                  if (aRec && !bRec) return -1;
                                  if (!aRec && bRec) return 1;
                                  return a[0].localeCompare(b[0]);
                                }).map(([cat, meds]) => (
                                  <div key={cat} className="mb-2 last:mb-0">
                                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-gray-900/50 flex justify-between items-center">
                                      <span>{cat}</span>
                                      {recommendedCategories.includes(cat) && <span className="bg-blue-500 text-white px-1.5 rounded-full lowercase text-[9px] font-normal">recommended</span>}
                                    </div>
                                    {meds.map((med) => (
                                      <SelectItem
                                        key={med.value}
                                        value={med.value}
                                        className="text-white hover:bg-gray-700/50 focus:bg-gray-700/50 pl-6 cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-sm">{med.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                          {!showAll && !searchQuery && (
                            <p className="text-[10px] text-blue-400/80 mt-1.5 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                              Showing clinical matches for {approving?.disease?.replace(/_/g,' ')}. Toggle "Show all" for full list.
                            </p>
                          )}
                        </div>
                        {(() => {
                          const info = getMedType(form.medicineName);
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[28px] border border-slate-100 shadow-inner">
                              <div className="md:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Clinical Quantity *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder={info.placeholder}
                                  className="bg-white border-slate-100 text-slate-800 h-12 rounded-2xl shadow-sm"
                                  value={form.prescriptionQuantity}
                                  onChange={e => setForm(f => ({ ...f, prescriptionQuantity: e.target.value }))}
                                />
                                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wide">Volume to be dispensed in {info.unit}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dose Amount</Label>
                                  <Input type="number" step="0.5" className="bg-gray-700 border-gray-600 text-white h-8" value={form.dose_amount} onChange={e=> setForm(f=>({...f, dose_amount: e.target.value}))} />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Unit</Label>
                                  <Input className="bg-gray-700 border-gray-600 text-white h-8" value={form.dose_unit} onChange={e=> setForm(f=>({...f, dose_unit: e.target.value}))} />
                                </div>
                              </div>
                              <div>
                                <Label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Times per Day</Label>
                                <Input type="number" min="1" className="bg-gray-700 border-gray-600 text-white h-8" value={form.times_per_day} onChange={e=> setForm(f=>({...f, times_per_day: Number(e.target.value)||1}))} />
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Regimen Instructions *</Label>
                                <textarea className="w-full bg-white border border-slate-100 text-slate-800 rounded-2xl p-4 text-sm font-bold italic shadow-sm focus:ring-primary/10 transition-all placeholder:text-slate-300" rows={3} value={form.instructions} onChange={e=> setForm(f=> ({...f, instructions: e.target.value}))} placeholder="e.g. Sync-take after 20:00 clinical cycles" />
                                {Number(form.times_per_day) > 0 && Number(form.prescriptionQuantity) > 0 && (
                                  <p className="text-[10px] text-emerald-600 mt-2 font-black uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full inline-flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Dynamic Duration: {Math.ceil(Number(form.prescriptionQuantity) / (Number(form.dose_amount) * Number(form.times_per_day)))} days
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Physician Guidance Advisory</Label>
                          <textarea className="w-full bg-slate-50 border border-slate-100 text-slate-800 rounded-2xl p-4 shadow-sm focus:ring-primary/10 transition-all font-medium" rows={3} value={form.advice} onChange={e=> setForm(f=> ({...f, advice: e.target.value}))} placeholder="Precision medical advice for patient telemetry..." />
                        </div>
                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Adherence Strategy (Optional)</Label>
                          <textarea className="w-full bg-slate-50 border border-slate-100 text-slate-800 rounded-2xl p-4 shadow-sm focus:ring-primary/10 transition-all font-medium" rows={2} value={form.adherencePlan} onChange={e=> setForm(f=> ({...f, adherencePlan: e.target.value}))} placeholder="Monitoring plan and follow-up clinical cycles..." />
                        </div>
                      </div>

                      <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-50">
                        <DialogClose asChild>
                          <Button variant="ghost" onClick={()=> setApproving(null)} className="rounded-xl font-bold text-slate-400">Cancel</Button>
                        </DialogClose>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl shadow-lg shadow-emerald-500/20 h-10" onClick={submitApprove}>Authenticate & Sync</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog onOpenChange={(open)=> { if (!open) setRejecting(null); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-300 border-red-400 hover:bg-red-600/10" onClick={()=> { setRejecting(o); setRejectReason(''); }}>Reject</Button>
                    </DialogTrigger>
           <DialogContent className="bg-white border-slate-100 text-slate-800 max-w-md rounded-3xl shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight text-red-500">Clinical Rejection</DialogTitle>
                        <DialogDescription className="text-slate-400 italic">Provide clinical justification for rejecting this fulfillment request.</DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 space-y-4">
                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Rejection Justification *</Label>
                          <textarea className="w-full bg-slate-50 border border-slate-100 text-slate-800 rounded-2xl p-4 text-sm font-medium focus:ring-red-500/10 focus:border-red-500 transition-all" rows={4} value={rejectReason} onChange={e=> setRejectReason(e.target.value)} placeholder="Explain the clinical basis for rejection..." />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="ghost" onClick={()=> setRejecting(null)} className="rounded-xl font-bold text-slate-400">Cancel</Button>
                        </DialogClose>
                        <Button className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl shadow-lg shadow-red-500/20 h-10" onClick={submitReject}>Confirm Rejection</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // order history section
  const historySection = (
    <Card className="bg-white border-slate-100 shadow-xl rounded-3xl overflow-hidden border-t-4 border-t-slate-400">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-slate-800 font-black uppercase tracking-tight">Fulfillment History</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {history.length === 0 && <p className="text-gray-400">No orders in history yet.</p>}
        <div className="space-y-4">
          {history.map(o => (
            <div key={o.id} className="p-5 bg-white border border-slate-100 rounded-[28px] flex items-center justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-slate-50 rounded-[22px] flex items-center justify-center border border-slate-100 shadow-sm group-hover:bg-slate-800 group-hover:text-white transition-colors duration-300">
                  <Activity className="h-7 w-7 text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-slate-800 font-black capitalize tracking-tight text-lg">{String(o.disease||'request').replace(/_/g,' ')}</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mt-1 flex items-center gap-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">Log ID #{o.id}</span>
                    <span>•</span>
                    <span>{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-bold mt-2 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${o.doctor_status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'} shadow-sm`} />
                    Channel Status: <span className={`uppercase text-[10px] tracking-widest ${o.doctor_status === 'approved' ? 'text-emerald-600' : 'text-red-500'}`}>{o.doctor_status}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog onOpenChange={(open)=> { if (!open) setViewing(null); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-gray-200 border-gray-400 hover:bg-gray-600/20" onClick={()=> setViewing(o)}>View details</Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Request details</DialogTitle>
                      <DialogDescription className="sr-only">Detailed health information and payment status for this medication request.</DialogDescription>
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
                      {(viewing?.doctor_status === 'approved' || viewing?.doctor_status === 'rejected') && (
                        <div className="p-3 bg-gray-700/60 rounded border border-gray-600">
                          <div className="text-sm text-gray-300 mb-2">Doctor guidance</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div><span className="text-gray-400">Medicine:</span> <span className="font-medium">{viewing?.medicine_name || '-'}</span></div>
                            <div><span className="text-gray-400">Quantity:</span> <span className="font-medium">{viewing?.prescription_quantity || '-'}</span></div>
                            <div className="md:col-span-2"><span className="text-gray-400">Instructions:</span>
                              <div className="font-medium whitespace-pre-line">{viewing?.instructions || viewing?.doctor_instructions || '-'}</div>
                            </div>
                            {viewing?.advice || viewing?.doctor_advice ? (
                              <div className="md:col-span-2"><span className="text-gray-400">Advice:</span>
                                <div className="font-medium whitespace-pre-line">{viewing?.advice || viewing?.doctor_advice}</div>
                              </div>
                            ) : null}
                            {viewing?.adherence_plan ? (
                              <div className="md:col-span-2"><span className="text-gray-400">Adherence plan:</span>
                                <div className="font-medium whitespace-pre-line">{viewing?.adherence_plan}</div>
                              </div>
                            ) : null}
                            {viewing?.doctor_status === 'rejected' && viewing?.doctor_reject_reason ? (
                              <div className="md:col-span-2 text-red-300"><span className="text-red-300">Reject reason:</span>
                                <div className="whitespace-pre-line">{viewing?.doctor_reject_reason}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
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
                              const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
                              const path = (viewing?.medical_certificate || '').startsWith('/') 
                                ? viewing.medical_certificate 
                                : `/${viewing?.medical_certificate}`;
                              const url = viewing?.medical_certificate?.startsWith('http')
                                ? viewing.medical_certificate!
                                : `${base}${path}`;
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
                    </div>
                    <div className="mt-4 flex justify-end">
                      <DialogClose asChild>
                        <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={()=> { setViewing(o); setActiveSection('chat-doctor'); }}>Open Chat</Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // patients list section
  const patientsSection = (
    <Card className="bg-white border-slate-100 shadow-xl rounded-3xl overflow-hidden border-t-4 border-t-primary">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-slate-800 font-black uppercase tracking-tight">Assigned Patients</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {patients.length === 0 && <p className="text-gray-400">You haven't been assigned any patients yet.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(p => (
            <div key={p.id} className="p-4 bg-gray-700 rounded-lg border border-gray-600 flex flex-col justify-between">
              <div>
                <div className="text-lg font-semibold text-white mb-1">
                  {p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : (p.username || p.email)}
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>Email: {p.email || '-'}</div>
                  <div>Phone: {p.phone || '-'}</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 flex-1" 
                  onClick={()=> { 
                    setViewing({ user_id: p.id }); 
                    setActiveSection('chat-doctor'); 
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 space-y-4">
      {activeSection === 'history' 
        ? historySection 
        : activeSection === 'patients' 
          ? patientsSection 
          : assignedSection}
    </div>
  );
}
