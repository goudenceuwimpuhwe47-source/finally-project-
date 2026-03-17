import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <h1 className="text-3xl font-bold text-white">Inventory (All Providers)</h1>
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-gray-400">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Provider</TableHead>
                  <TableHead className="text-gray-300">Item</TableHead>
                  <TableHead className="text-gray-300">SKU</TableHead>
                  <TableHead className="text-gray-300">Qty</TableHead>
                  <TableHead className="text-gray-300">Unit Price</TableHead>
                  <TableHead className="text-gray-300">Mfg</TableHead>
                  <TableHead className="text-gray-300">Exp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data || []).length > 0 ? (data || []).map((i:any) => (
                  <TableRow key={i.id} className="border-gray-700">
                    <TableCell className="text-white">{i.provider_name || i.username}</TableCell>
                    <TableCell className="text-gray-300">{i.name}</TableCell>
                    <TableCell className="text-gray-300">{i.sku || '—'}</TableCell>
                    <TableCell className="text-gray-300">{i.quantity}</TableCell>
                    <TableCell className="text-gray-300">{Number(i.unit_price).toFixed(2)}</TableCell>
                    <TableCell className="text-gray-300">{i.mfg_date || '—'}</TableCell>
                    <TableCell className="text-gray-300">{i.exp_date || '—'}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400">No stock found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
