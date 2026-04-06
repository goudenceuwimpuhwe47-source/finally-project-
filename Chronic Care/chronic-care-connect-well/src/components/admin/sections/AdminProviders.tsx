
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
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
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-2xl w-64"></div>
        <div className="h-96 bg-slate-200 rounded-[32px]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/20">
            <User className="h-6 w-6 text-white" />
          </div>
          Clinical Authority
        </h1>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-[10px]">
          {providers?.length || 0} Registered Practitioners
        </Badge>
      </div>
      
      <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden">
        <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
          <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Verified Healthcare Providers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14 px-8">Practitioner</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Secure ID</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">License</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Specialty</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Hub</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Auth Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14">Registry Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-14 text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers && providers.length > 0 ? (
                providers
                  .filter((p: any) => {
                    const name = (p.full_name || p.name || p.username || '').toLowerCase();
                    const isPharmacy = name.includes('pharmacy') || name.includes('clinic') && !name.includes('dr.');
                    // In a real scenario, we'd use p.role === 'doctor' or similar metadata
                    return !isPharmacy;
                  })
                  .map((provider: any) => (
                    <TableRow key={provider.id} className="border-border hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-sm shadow-sm border border-primary/5">
                            {(provider.full_name || provider.name || provider.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 leading-tight">{provider.full_name || provider.name || `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim() || provider.username || 'N/A'}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Clinical Practitioner</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-bold text-xs">
                        {provider.email || 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-400 font-black text-[10px] tracking-tight uppercase">{provider.license_number || provider.license || '—'}</TableCell>
                      <TableCell className="text-slate-600 font-bold text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {provider.specialty || 'General Practice'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-bold text-xs">{provider.hospital_affiliation || provider.hospital || 'Private Hub'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full shadow-sm ${
                          (provider.verification_status || provider.status) === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          (provider.verification_status || provider.status) === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {provider.verification_status || provider.status || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none">
                        {provider.created_at ? format(new Date(provider.created_at), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        {(provider.verification_status || provider.status || 'pending') === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[9px] tracking-widest h-10 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
                              onClick={() => verifyProviderMutation.mutate({ 
                                providerId: provider.id, 
                                status: 'verified' 
                              })}
                            >
                              Verify Node
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-200 text-slate-500 hover:bg-slate-50 font-black uppercase text-[9px] tracking-widest h-10 px-4 rounded-xl transition-all"
                              onClick={() => verifyProviderMutation.mutate({ 
                                providerId: provider.id, 
                                status: 'rejected' 
                              })}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-20">
                      <User className="h-12 w-12 mb-4" />
                      <p className="font-black uppercase text-xs tracking-widest">No Manifested Providers</p>
                    </div>
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
