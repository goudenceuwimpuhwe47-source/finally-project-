
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { API_URL } from "@/lib/utils";

export const AdminProviders = () => {
  const queryClient = useQueryClient();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { data: providers, isLoading } = useQuery({
    queryKey: ["adminProviders"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/admin/providers`, { headers: { Authorization: `Bearer ${token || ''}` } });
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        const body = await res.json();
        return (body?.providers ?? body ?? []) as any[];
      } catch (e:any) {
        console.warn('AdminProviders load failed', e?.message || e);
        return [] as any[];
      }
    },
  });

  const verifyProviderMutation = useMutation({
    mutationFn: async ({ providerId, status }: { providerId: string; status: string }) => {
      const res = await fetch(`${API_URL}/admin/providers/${encodeURIComponent(providerId)}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProviders"] });
      toast.success("Provider status updated");
    },
    onError: (error) => {
      toast.error("Failed to update provider: " + error.message);
    },
  });

  if (isLoading) {
    return <div className="text-white">Loading providers...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Provider Management</h1>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Healthcare Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Name</TableHead>
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">License</TableHead>
                <TableHead className="text-gray-300">Specialty</TableHead>
                <TableHead className="text-gray-300">Hospital</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Registered</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers && providers.length > 0 ? (
                providers.map((provider:any) => (
                  <TableRow key={provider.id} className="border-gray-700">
                    <TableCell className="text-white">
                      {provider.full_name || provider.name || `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim() || provider.username || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {provider.email || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-300">{provider.license_number || provider.license || '—'}</TableCell>
                    <TableCell className="text-gray-300">{provider.specialty || '—'}</TableCell>
                    <TableCell className="text-gray-300">{provider.hospital_affiliation || provider.hospital || 'Independent'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        (provider.verification_status || provider.status) === 'verified' ? 'bg-green-600 text-green-100' :
                        (provider.verification_status || provider.status) === 'rejected' ? 'bg-red-600 text-red-100' :
                        'bg-yellow-600 text-yellow-100'
                      }`}>
                        {provider.verification_status || provider.status || 'pending'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {provider.created_at ? format(new Date(provider.created_at), 'MMM dd, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      {(provider.verification_status || provider.status || 'pending') === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => verifyProviderMutation.mutate({ 
                              providerId: provider.id, 
                              status: 'verified' 
                            })}
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600"
                            onClick={() => verifyProviderMutation.mutate({ 
                              providerId: provider.id, 
                              status: 'rejected' 
                            })}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-400">
                    No providers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
