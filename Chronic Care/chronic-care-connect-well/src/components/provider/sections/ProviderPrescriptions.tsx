
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/lib/utils";

export const ProviderPrescriptions = () => {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    patient_id: "",
    medicine_name: "",
    dosage: "",
    frequency_per_day: "",
    quantity_units: "",
    instructions: "",
  });

  const queryClient = useQueryClient();
  // Use stored JWT; AuthContext user object doesn't expose token directly
  const token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null) as string | null;

  const { data: prescriptions, isLoading, refetch } = useQuery({
    queryKey: ["providerPrescriptions"],
    queryFn: async () => {
      if (!token) return [];
      const r = await fetch(`${API_URL}/orders/provider/prescriptions`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await r.json();
      return Array.isArray(b?.prescriptions) ? b.prescriptions : [];
    },
    enabled: !!token,
  });

  async function confirmDispense(p: any) {
  if (!token) return;
    try {
      const r = await fetch(`${API_URL}/orders/${p.order_id}/prescriptions/${p.id}/confirm-dispense`, {
        method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
      });
      const b = await r.json();
      if (!r.ok || b?.error) throw new Error(b?.error || 'Failed to confirm');
      toast.success('Dispense confirmed');
      refetch();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  }

  // Simple local inputs; no remote lists for now
  const patients: any[] = [];

  const addPrescriptionMutation = useMutation({
    mutationFn: async (prescription: typeof newPrescription) => {
      if (!token) throw new Error("Not authenticated");
      // This is a free-form creation not tied to an order; skip for now.
      throw new Error("Use 'Assigned Orders' to create prescription for a specific order.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerPrescriptions"] });
      setShowAddForm(false);
      setNewPrescription({
        patient_id: "",
        medicine_name: "",
        dosage: "",
        frequency_per_day: "",
        quantity_units: "",
        instructions: "",
      });
      toast.success("Done");
    },
    onError: (error) => {
      toast.error("Failed to create prescription: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPrescriptionMutation.mutate(newPrescription);
  };

  if (isLoading) {
    return <div className="text-white">Loading prescriptions...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Prescription Ledger</h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5 italic">Clinical Distribution History</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2 stroke-[3px]" />
          Manual Entry
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-white border-slate-100 rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <CardHeader className="border-b border-slate-50 p-8">
            <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Clinical Manifest Entry</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Patient Matrix</label>
                  <select
                    value={newPrescription.patient_id}
                    onChange={(e) => setNewPrescription({ ...newPrescription, patient_id: e.target.value })}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold focus:ring-emerald-500/10"
                    required
                  >
                    <option value="">Select Clinical ID</option>
                    {patients?.map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Medication Sync</label>
                  <Input
                    value={newPrescription.medicine_name}
                    onChange={(e) => setNewPrescription({ ...newPrescription, medicine_name: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 text-slate-800 rounded-2xl font-bold"
                    placeholder="e.g. Amoxicillin"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Dosage Unit</label>
                  <Input
                    value={newPrescription.dosage}
                    onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 text-slate-800 rounded-2xl font-bold"
                    placeholder="e.g. 500mg"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Daily Flux (Qty/Day)</label>
                  <Input
                    type="number"
                    value={newPrescription.frequency_per_day}
                    onChange={(e) => setNewPrescription({ ...newPrescription, frequency_per_day: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 text-slate-800 rounded-2xl font-black"
                    placeholder="e.g. 2"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Total Manifest Volume</label>
                  <Input
                    type="number"
                    value={newPrescription.quantity_units}
                    onChange={(e) => setNewPrescription({ ...newPrescription, quantity_units: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 text-slate-800 rounded-2xl font-black"
                    placeholder="e.g. 30"
                    required
                  />
                  {Number(newPrescription.frequency_per_day) > 0 && Number(newPrescription.quantity_units) > 0 && (
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-2 ml-1">Cycle Duration: {Math.ceil(Number(newPrescription.quantity_units)/Number(newPrescription.frequency_per_day))} Days</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Special Instructions</label>
                  <Input
                    value={newPrescription.instructions}
                    onChange={(e) => setNewPrescription({ ...newPrescription, instructions: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-100 text-slate-800 rounded-2xl font-bold italic"
                    placeholder="Clinical constraints..."
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={addPrescriptionMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 px-8 font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                  Synchronize Manifest
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-2xl h-14 px-8 font-black uppercase text-[11px] tracking-widest text-slate-400 hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-white border border-slate-100 rounded-[40px] shadow-2xl overflow-hidden border-t-8 border-t-emerald-500">
        <CardHeader className="border-b border-slate-50 p-8">
          <CardTitle className="text-xl font-black text-slate-800 uppercase tracking-tight">Active Distribution History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/80 backdrop-blur">
                <TableRow className="hover:bg-transparent border-b border-slate-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Clinical Subject</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Medication Matrix</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Dosage Flux</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16 text-center">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Clinical Logic</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 h-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!prescriptions || prescriptions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-20 text-center">
                       <div className="flex flex-col items-center gap-3">
                          <FileText className="h-10 w-10 text-slate-200" />
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Registry Empty</span>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
                {prescriptions?.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors group">
                    <TableCell className="px-6 py-6 text-slate-800 font-black text-sm tracking-tight">{p.patient_name || p.patient_id}</TableCell>
                    <TableCell className="px-6 py-6 text-[11px] font-black text-slate-500 uppercase tracking-tight">{p.medicine_name}</TableCell>
                    <TableCell className="px-6 py-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-slate-800">{p.dosage || '-'}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.frequency_per_day != null ? `${p.frequency_per_day}/DAY` : '-'} · {p.duration_days != null ? `${p.duration_days} DAYS` : '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-6 text-center">
                      <Badge variant="outline" className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border-2 shadow-sm ${
                        p.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        p.status === 'completed' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {p.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-6 text-[10px] font-bold text-slate-400 italic max-w-[200px] line-clamp-1">{p.instructions || 'Routine protocol'}</TableCell>
                    <TableCell className="px-6 py-6">
                      {p.status === 'active' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-11 px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95" onClick={() => confirmDispense(p)}>
                          Confirm Dispense
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
