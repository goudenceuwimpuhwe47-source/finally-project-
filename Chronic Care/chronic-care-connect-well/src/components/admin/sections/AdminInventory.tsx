import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-white px-1">Inventory (All Providers)</h1>
      <Card className="bg-gray-800 border-gray-700 overflow-hidden shadow-xl">
        <CardHeader className="border-b border-gray-700/50 text-white">
          <CardTitle>Stock Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              {isLoading ? (
                <div className="p-8 text-gray-400 text-center">Loading inventory data...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-transparent">
                      <TableHead className="text-gray-300 font-semibold">Provider</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Item</TableHead>
                      <TableHead className="text-gray-300 font-semibold">SKU</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Qty</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Unit Price</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Mfg Date</TableHead>
                      <TableHead className="text-gray-300 font-semibold">Exp Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data || []).length > 0 ? (data || []).map((i:any) => (
                      <TableRow key={i.id} className="border-gray-700 hover:bg-gray-700/30 transition-colors">
                        <TableCell className="text-white font-medium">{i.provider_name || i.username}</TableCell>
                        <TableCell className="text-gray-300">{i.name}</TableCell>
                        <TableCell className="text-gray-300 font-mono text-xs">{i.sku || '—'}</TableCell>
                        <TableCell className="text-gray-300">
                          <span className={`${i.quantity < 10 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                            {i.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-300 font-mono whitespace-nowrap">
                          {Number(i.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs">{i.mfg_date || '—'}</TableCell>
                        <TableCell className="text-gray-300 text-xs">{i.exp_date || '—'}</TableCell>
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
