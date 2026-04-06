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
import { MessageSquare } from 'lucide-react';
import { API_URL } from '@/lib/utils';

export default function DoctorContent({ activeSection, setActiveSection }: { activeSection: string; setActiveSection: (s: string)=>void; }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]); // assigned/pending
  const [history, setHistory] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any | null>(null);
  const [approving, setApproving] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [form, setForm] = useState({ medicineName: '', prescriptionQuantity: '', instructions: '', advice: '', adherencePlan: '' });
  const [rejectReason, setRejectReason] = useState('');
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
          instructions: form.instructions,
          advice: form.advice,
          adherence_plan: form.adherencePlan,
        }, ...filtered];
        writeHistoryLS(next);
        return next;
      });
      setApproving(null);
      setForm({ medicineName: '', prescriptionQuantity: '', instructions: '', advice: '', adherencePlan: '' });
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
        <h2 className="text-xl font-semibold text-white mb-3">Patient Chat</h2>
        <DoctorChat initialPatientId={viewing?.user_id || approving?.user_id || rejecting?.user_id || undefined} />
      </div>
    );
  }

  // assigned orders section
  const assignedSection = (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Assigned Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.filter(o => o.doctor_status !== 'approved').length === 0 && <p className="text-gray-400">No assigned orders.</p>}
        <div className="space-y-3">
          {orders.filter(o => o.doctor_status !== 'approved').map(o => (
            <div key={o.id} className="p-3 bg-gray-700 rounded flex items-center justify-between">
              <div>
                <div className="text-white font-medium capitalize">{String(o.disease||'request').replace(/_/g,' ')}</div>
                <div className="text-xs text-gray-300">Order #{o.id} • {new Date(o.created_at).toLocaleString()}</div>
                <div className="text-xs text-gray-300">Patient: {o.full_name || o.username || o.email}</div>
              </div>
              <div className="flex gap-2">
                <Dialog onOpenChange={(open)=> { if (!open) setViewing(null); }}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-200 border-gray-400 hover:bg-gray-600/20"
                      onClick={()=> setViewing(o)}
                    >
                      View details
                    </Button>
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
                    </div>
                    <div className="mt-4 flex justify-end">
                      <DialogClose asChild>
                        <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={()=> { setViewing(o); setActiveSection('chat-doctor'); }}>Open Chat</Button>
                  <Dialog onOpenChange={(open)=> { if (!open) setApproving(null); }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-300 border-green-400 hover:bg-green-600/10"
                        onClick={()=> {
                          setApproving(o);
                          setForm({
                            medicineName: o.medicine_name || '',
                            prescriptionQuantity: o.prescription_quantity || o.quantity || '',
                            instructions: o.instructions || o.doctor_instructions || '',
                            advice: o.advice || o.doctor_advice || '',
                            adherencePlan: o.adherence_plan || '',
                          });
                        }}
                      >
                        Verify & Approve
                      </Button>
                    </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-2xl">
                      <DialogHeader>
            <DialogTitle>Approve prescription</DialogTitle>
            <DialogDescription className="sr-only">Provide prescription details and guidance for the patient.</DialogDescription>
                      </DialogHeader>
                      {approving?.doctor_status === 'approved' && (
                        <div className="mb-3 text-sm p-2 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-200">
                          This order was already approved before. You can update the prescription and resend.
                        </div>
                      )}
                      <div className="space-y-4">
                        <div className="bg-blue-900/10 border border-blue-800/30 p-3 rounded flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-blue-300 font-semibold">Medicine selection</Label>
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                id="show-all" 
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                                checked={showAll}
                                onChange={e => setShowAll(e.target.checked)}
                              />
                              <label htmlFor="show-all" className="text-xs text-gray-400 cursor-pointer">Show all categories</label>
                            </div>
                          </div>
                          <div className="relative">
                            <Input
                              placeholder="Search medicine..."
                              className="bg-gray-800 border-gray-700 text-white pl-9 text-sm h-9"
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-gray-300 mb-1.5 block">Recommended / Selected Medicine *</Label>
                          <Select
                            value={form.medicineName}
                            onValueChange={(value) => {
                              const medicine = availableMedicines.find(m => m.value === value);
                              setForm(f => ({ ...f, medicineName: medicine?.label || value }));
                            }}
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white min-h-[44px]">
                              <SelectValue placeholder="Select a medicine">
                                {form.medicineName || "Select a medicine"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-[400px]">
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
                        <div>
                          <Label className="text-gray-300">Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g., 30"
                            className="bg-gray-700 border-gray-600 text-white"
                            value={form.prescriptionQuantity}
                            onChange={e => setForm(f => ({ ...f, prescriptionQuantity: e.target.value }))}
                          />
                          <p className="text-xs text-gray-400 mt-1">Number of tablets/doses/units</p>
                        </div>
                        <div>
                          <Label className="text-gray-300">How to take (instructions) *</Label>
                          <textarea className="w-full bg-gray-700 border border-gray-600 text-white rounded p-2" rows={3} value={form.instructions} onChange={e=> setForm(f=> ({...f, instructions: e.target.value}))} placeholder="e.g., Take 1 tablet twice daily after meals" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Advice</Label>
                          <textarea className="w-full bg-gray-700 border border-gray-600 text-white rounded p-2" rows={3} value={form.advice} onChange={e=> setForm(f=> ({...f, advice: e.target.value}))} placeholder="Additional medical advice for the patient" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Adherence plan (optional)</Label>
                          <textarea className="w-full bg-gray-700 border border-gray-600 text-white rounded p-2" rows={2} value={form.adherencePlan} onChange={e=> setForm(f=> ({...f, adherencePlan: e.target.value}))} placeholder="Follow-up schedule and monitoring plan" />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="outline" onClick={()=> setApproving(null)}>Cancel</Button>
                        </DialogClose>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={submitApprove}>Approve & Send</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog onOpenChange={(open)=> { if (!open) setRejecting(null); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-300 border-red-400 hover:bg-red-600/10" onClick={()=> { setRejecting(o); setRejectReason(''); }}>Reject</Button>
                    </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-md">
                      <DialogHeader>
            <DialogTitle>Reject order</DialogTitle>
            <DialogDescription className="sr-only">Provide a reason for rejecting this order.</DialogDescription>
                      </DialogHeader>
                      <div>
                        <Label className="text-gray-300">Reason</Label>
                        <textarea className="w-full bg-gray-700 border border-gray-600 text-white rounded p-2" rows={3} value={rejectReason} onChange={e=> setRejectReason(e.target.value)} />
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <DialogClose asChild>
                          <Button variant="outline" onClick={()=> setRejecting(null)}>Cancel</Button>
                        </DialogClose>
                        <Button className="bg-red-600 hover:bg-red-700" onClick={submitReject}>Reject</Button>
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
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Order History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 && <p className="text-gray-400">No orders in history yet.</p>}
        <div className="space-y-3">
          {history.map(o => (
            <div key={o.id} className="p-3 bg-gray-700 rounded flex items-center justify-between">
              <div>
                <div className="text-white font-medium capitalize">{String(o.disease||'request').replace(/_/g,' ')}</div>
                <div className="text-xs text-gray-300">Order #{o.id} • {new Date(o.created_at).toLocaleString()}</div>
                <div className="text-xs text-gray-300">Patient: {o.full_name || o.username || o.email}</div>
                <div className="text-xs text-gray-400 mt-1">Doctor status: {o.doctor_status}</div>
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
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Patients List</CardTitle>
      </CardHeader>
      <CardContent>
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
