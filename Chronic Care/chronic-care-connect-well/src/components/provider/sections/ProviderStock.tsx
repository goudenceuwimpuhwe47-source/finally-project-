import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, RefreshCw, Search, Edit3, Trash2, ArrowUpCircle, ArrowDownCircle, Equal } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Stock</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search items..." className="pl-8 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400" />
          </div>
          <Button onClick={()=>openNew()} className="bg-green-600 hover:bg-green-500"><Plus className="h-4 w-4 mr-2"/>New Item</Button>
          <Button variant="outline" onClick={()=>qc.invalidateQueries({ queryKey: ['stockItems'] })} className="border-gray-700 text-gray-200"><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="bg-gray-800 border-gray-700"><CardContent className="p-6">Loading...</CardContent></Card>
      ) : error ? (
        <Card className="bg-gray-800 border-gray-700"><CardContent className="p-6 text-red-400">Failed to load items</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">SKU</TableHead>
                <TableHead className="text-gray-300">Qty</TableHead>
                <TableHead className="text-gray-300">Price</TableHead>
                <TableHead className="text-gray-300">MFD</TableHead>
                <TableHead className="text-gray-300">EXP</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data||[]).map((it: any) => (
                <TableRow key={it.id} className="hover:bg-gray-800/60">
                  <TableCell className="text-white font-medium">{it.name}</TableCell>
                  <TableCell className="text-gray-300">{it.sku || '-'}</TableCell>
                  <TableCell className="text-gray-200">{it.quantity}</TableCell>
                  <TableCell className="text-gray-200">{Number(it.unit_price||0).toFixed(2)}</TableCell>
                  <TableCell className="text-gray-300">{fmtDate(it.mfg_date)}</TableCell>
                  <TableCell className="text-gray-300">{fmtDate(it.exp_date)}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" onClick={()=>setMoveFor(it)} className="bg-blue-600 hover:bg-blue-500"><ArrowUpCircle className="h-4 w-4 mr-1"/>Move</Button>
                    <Button size="sm" variant="outline" onClick={()=>openEdit(it)} className="border-gray-700 text-gray-200"><Edit3 className="h-4 w-4 mr-1"/>Edit</Button>
                    <Button size="sm" variant="outline" onClick={()=>deleteItem.mutate(it.id)} className="border-red-700 text-red-400 hover:bg-red-600 hover:text-white"><Trash2 className="h-4 w-4 mr-1"/>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'New Item'}</DialogTitle>
            <DialogDescription className="sr-only">Update the details of this stock item including quantity, price, and expiration dates.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <Input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">SKU</label>
              <Input value={form.sku} onChange={e=>setForm({ ...form, sku: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity</label>
              <Input type="number" value={form.quantity} onChange={e=>setForm({ ...form, quantity: Number(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Unit Price</label>
              <Input type="number" step="0.01" value={form.unit_price} onChange={e=>setForm({ ...form, unit_price: Number(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Manufactured Date</label>
              <Input type="date" value={form.mfg_date} onChange={e=>setForm({ ...form, mfg_date: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Expiry Date</label>
              <Input type="date" value={form.exp_date} onChange={e=>setForm({ ...form, exp_date: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={()=>saveItem.mutate()} className="bg-green-600 hover:bg-green-500">Save</Button>
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
