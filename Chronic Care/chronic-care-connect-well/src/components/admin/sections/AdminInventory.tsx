import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { API_URL } from "@/lib/utils";

export const AdminInventory = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { data, isLoading } = useQuery({
    queryKey: ['adminInventory'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/inventory`, { headers: { Authorization: `Bearer ${token || ''}` } });
      if (!res.ok) throw new Error('Failed to load inventory');
      const body = await res.json();
      return (body?.items ?? []) as any[];
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <Package className="h-6 w-6 text-white" />
          </div>
          Global Inventory
        </h1>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px]">
          {data?.length || 0} Stocked Units
        </Badge>
      </div>

      <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden">
        <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
          <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Consolidated Manifest</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              {isLoading ? (
                <div className="p-8 text-gray-400 text-center">Loading inventory data...</div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50 text-slate-500 font-bold">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14 px-8">Hub Authority</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Clinical Item</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Secure SKU</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Intensity</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Unit Quote</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Mfg Gate</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14 pr-8 text-right">Expiry Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data || []).length > 0 ? (data || []).map((i:any) => (
                      <TableRow key={i.id} className="border-border hover:bg-slate-50/50 transition-colors">
                        <TableCell className="px-8 py-5 text-slate-800 font-bold">{i.provider_name || i.username}</TableCell>
                        <TableCell className="text-slate-600 font-medium">{i.name}</TableCell>
                        <TableCell className="text-slate-400 font-bold text-[10px] tracking-tight">{i.sku || '—'}</TableCell>
                        <TableCell className="text-slate-600">
                          <span className={i.quantity < 10 ? 'bg-rose-50 text-rose-600 border border-rose-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full' : 'font-bold'}>
                            {i.quantity} Units
                          </span>
                        </TableCell>
                        <TableCell className="text-emerald-600 font-black text-sm">
                          {Number(i.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RWF
                        </TableCell>
                        <TableCell className="text-slate-400 font-bold text-xs uppercase opacity-80">{i.mfg_date || '—'}</TableCell>
                        <TableCell className="text-slate-400 font-black text-xs text-right pr-8">{i.exp_date || '—'}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-20 text-gray-500">
                          No stock items found in the system.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
