import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, RefreshCw, Search, Edit3, Trash2, ArrowUpCircle, ArrowDownCircle, Equal, Boxes, AlertCircle, FilePlus2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { API_URL } from "@/lib/utils";

function fmtDate(d?: string | null) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

export const ProviderStock = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [q, setQ] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: '', sku: '', quantity: 0, price: 0, expiry_date: '', manufactured_date: '' });
  const [moveFor, setMoveFor] = useState<any | null>(null);
  const [move, setMove] = useState<{ type: 'in'|'out'|'adjust'; quantity: number; note?: string }>({ type: 'in', quantity: 1, note: '' });

  const { data, isLoading, error } = useQuery({
    queryKey: ['stockItems', q],
    queryFn: async () => {
      const url = new URL(`${API_URL}/stock`);
      if (q) url.searchParams.set('q', q);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || 'Failed to load items');
      return json.items || [];
    },
    retry: 1,
    staleTime: 10000,
  });

  const saveItem = useMutation({
    mutationFn: async () => {
      const method = editing ? 'PATCH' : 'POST';
      const endpoint = editing ? `${API_URL}/stock/${editing.id}` : `${API_URL}/stock`;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || 'Save failed');
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockItems'] });
      setShowEditor(false);
      setEditing(null);
      toast({ title: 'Saved', description: 'Stock item saved successfully.' });
    },
    onError: (err: any) => toast({ title: 'Save failed', description: err?.message || 'Could not save item', variant: 'destructive' }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/stock/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || 'Delete failed');
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stockItems'] }); toast({ title: 'Deleted', description: 'Stock item deleted.' }); },
    onError: (err: any) => toast({ title: 'Delete failed', description: err?.message || 'Could not delete item', variant: 'destructive' }),
  });

  const moveItem = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/stock/${moveFor.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(move)
      });
      const json = await res.json();
      if (!res.ok || json?.error) throw new Error(json?.error || 'Movement failed');
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stockItems'] }); setMoveFor(null); toast({ title: 'Stock updated', description: 'Movement applied successfully.' }); },
    onError: (err: any) => toast({ title: 'Movement failed', description: err?.message || 'Could not apply movement', variant: 'destructive' }),
  });

  function openNew() {
    setEditing(null);
    setForm({ name: '', sku: '', quantity: 0, unit_price: 0, mfg_date: '', exp_date: '' });
    setShowEditor(true);
  }
  function openEdit(it: any) {
    setEditing(it);
    setForm({ name: it.name || '', sku: it.sku || '', quantity: it.quantity || 0, unit_price: it.unit_price || 0, mfg_date: it.mfg_date || '', exp_date: it.exp_date || '' });
    setShowEditor(true);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Registry Stock</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5 italic">Real-time Inventory Ledger</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search registry..." className="pl-11 bg-slate-50 border-slate-100 text-slate-800 placeholder:text-slate-400 w-64 rounded-2xl h-12 focus:ring-emerald-500/10 shadow-inner font-bold" />
          </div>
          <Button onClick={()=>openNew()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
             <Plus className="h-4 w-4 mr-2 stroke-[3px]"/>New Sync
          </Button>
          <Button variant="ghost" onClick={()=>qc.invalidateQueries({ queryKey: ['stockItems'] })} className="text-slate-400 hover:bg-slate-50 h-12 px-4 rounded-2xl transition-all">
             <RefreshCw className="h-4 w-4"/>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-white border border-slate-100 rounded-[40px] flex items-center justify-center animate-pulse shadow-sm">
           <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 text-slate-200 animate-spin" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Syncing Registry...</span>
           </div>
        </div>
      ) : error ? (
        <Card className="bg-white border-rose-100 rounded-[40px] shadow-xl overflow-hidden border-t-8 border-t-rose-500">
          <CardContent className="p-10 text-center">
            <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-slate-800 font-black uppercase tracking-tight">Ledger Sync Error</h3>
            <p className="text-slate-400 font-bold italic mt-1 pb-4">Unable to retrieve clinical distribution records.</p>
            <Button variant="outline" className="rounded-xl font-bold border-slate-200 text-slate-800" onClick={() => qc.invalidateQueries({ queryKey: ['stockItems'] })}>Retry Sync</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white border border-slate-100 rounded-[40px] shadow-2xl overflow-hidden border-t-8 border-t-emerald-500">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/80 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Stock Manifest</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">SKU Code</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Dist. Qty</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Unit Cost</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">MFD / EXP</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Nexus Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data||[]).map((it: any) => (
                  <TableRow key={it.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors group">
                    <TableCell className="px-6 py-6 text-slate-800 font-black text-sm tracking-tight">{it.name}</TableCell>
                    <TableCell className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{it.sku || '-'}</TableCell>
                    <TableCell className="px-6 py-6">
                       <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-tight ${it.quantity < 10 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-800 border border-slate-100'}`}>{it.quantity} <span className="text-[8px] uppercase ml-1">Units</span></span>
                    </TableCell>
                    <TableCell className="px-6 py-6 font-black text-emerald-600 text-sm tracking-tighter">{Number(it.unit_price||0).toLocaleString()} <span className="text-[9px] uppercase">Frw</span></TableCell>
                    <TableCell className="px-6 py-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">M: {fmtDate(it.mfg_date)}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${new Date(it.exp_date) < new Date() ? 'text-rose-500' : 'text-slate-400'}`}>E: {fmtDate(it.exp_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-6">
                      <div className="flex gap-2 min-w-[280px]">
                        <Button size="sm" onClick={()=>setMoveFor(it)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-4 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-500/20"><ArrowUpCircle className="h-3.5 w-3.5 mr-1"/>Sync Move</Button>
                        <Button size="sm" variant="ghost" onClick={()=>openEdit(it)} className="text-slate-500 hover:bg-slate-50 rounded-2xl h-11 px-4 font-black uppercase text-[9px] tracking-widest"><Edit3 className="h-3.5 w-3.5 mr-1"/>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={()=>deleteItem.mutate(it.id)} className="text-rose-500 hover:bg-rose-50 rounded-2xl h-11 px-4 font-black uppercase text-[9px] tracking-widest"><Trash2 className="h-3.5 w-3.5 mr-1"/>Purge</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="bg-white border-slate-100 text-slate-800 max-w-xl rounded-[40px] shadow-2xl p-10 ring-1 ring-black/[0.05]">
          <DialogHeader>
            <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
               <FilePlus2 className="h-7 w-7 text-emerald-600" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-800">{editing ? 'Edit Matrix' : 'Registry Entry'}</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold italic">Define clinical distribution parameters for this medication sync-unit.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Product Manifest</label>
              <Input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} className="bg-slate-50 border-slate-100 text-slate-800 h-14 rounded-2xl font-black shadow-inner" placeholder="e.g. Dolutegravir (50mg)" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Global SKU Code</label>
              <Input value={form.sku} onChange={e=>setForm({ ...form, sku: e.target.value })} className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-bold italic" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Initial Qty</label>
              <Input type="number" value={form.quantity} onChange={e=>setForm({ ...form, quantity: Number(e.target.value) })} className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-black" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Unit Price (Frw)</label>
              <Input type="number" step="0.01" value={form.unit_price} onChange={e=>setForm({ ...form, unit_price: Number(e.target.value) })} className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-black text-emerald-600" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Clinical MFD</label>
              <Input type="date" value={form.mfg_date} onChange={e=>setForm({ ...form, mfg_date: e.target.value })} className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 px-1">Clinical EXP</label>
              <Input type="date" value={form.exp_date} onChange={e=>setForm({ ...form, exp_date: e.target.value })} className="bg-slate-50 border-slate-100 text-slate-800 h-12 rounded-2xl font-bold" />
            </div>
          </div>
          <DialogFooter className="mt-8 border-t border-slate-50 pt-8 gap-3">
             <Button variant="ghost" onClick={()=>setShowEditor(false)} className="rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 flex-1">Cancel</Button>
             <Button onClick={()=>saveItem.mutate()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 flex-2">Commit to Ledger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={!!moveFor} onOpenChange={(v)=>setMoveFor(v ? moveFor : null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Stock Movement: {moveFor?.name}</DialogTitle>
            <DialogDescription className="sr-only">Log a manual stock adjustment, incoming shipment, or outgoing inventory movement.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <div className="flex gap-2">
                <Button variant={move.type==='in'? 'default' : 'outline'} onClick={()=>setMove({ ...move, type: 'in' })} className={move.type==='in'? 'bg-emerald-600 hover:bg-emerald-500' : 'border-gray-700 text-gray-200'}><ArrowUpCircle className="h-4 w-4 mr-1"/>In</Button>
                <Button variant={move.type==='out'? 'default' : 'outline'} onClick={()=>setMove({ ...move, type: 'out' })} className={move.type==='out'? 'bg-blue-600 hover:bg-blue-500' : 'border-gray-700 text-gray-200'}><ArrowDownCircle className="h-4 w-4 mr-1"/>Out</Button>
                <Button variant={move.type==='adjust'? 'default' : 'outline'} onClick={()=>setMove({ ...move, type: 'adjust' })} className={move.type==='adjust'? 'bg-yellow-600 hover:bg-yellow-500' : 'border-gray-700 text-gray-200'}><Equal className="h-4 w-4 mr-1"/>Adjust</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <Input type="number" value={move.quantity} onChange={e=>setMove({ ...move, quantity: Number(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Note</label>
              <Input value={move.note || ''} onChange={e=>setMove({ ...move, note: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={()=>moveItem.mutate()} className="bg-green-600 hover:bg-green-500">Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProviderStock;
