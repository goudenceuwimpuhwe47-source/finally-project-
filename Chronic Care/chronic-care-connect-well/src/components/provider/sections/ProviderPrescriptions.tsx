
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
const API_URL = 'http://localhost:5000';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Prescription Management</h1>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Prescription
        </Button>
      </div>

      {showAddForm && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Prescription</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Patient
                  </label>
                  <select
                    value={newPrescription.patient_id}
                    onChange={(e) => setNewPrescription({ ...newPrescription, patient_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    required
                  >
                    <option value="">Select Patient</option>
                    {patients?.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Medication or Medicine
                  </label>
                  <Input
                    value={newPrescription.medicine_name}
                    onChange={(e) => setNewPrescription({ ...newPrescription, medicine_name: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., Amoxicillin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Dosage
                  </label>
                  <Input
                    value={newPrescription.dosage}
                    onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Frequency (pieces per day)
                  </label>
                  <Input
                    type="number"
                    value={newPrescription.frequency_per_day}
                    onChange={(e) => setNewPrescription({ ...newPrescription, frequency_per_day: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., 2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quantity (total pieces)
                  </label>
                  <Input
                    type="number"
                    value={newPrescription.quantity_units}
                    onChange={(e) => setNewPrescription({ ...newPrescription, quantity_units: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., 30"
                    required
                  />
                  {Number(newPrescription.frequency_per_day) > 0 && Number(newPrescription.quantity_units) > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Duration: {Math.ceil(Number(newPrescription.quantity_units)/Number(newPrescription.frequency_per_day))} day(s)</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Instructions
                  </label>
                  <Input
                    value={newPrescription.instructions}
                    onChange={(e) => setNewPrescription({ ...newPrescription, instructions: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Special instructions"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={addPrescriptionMutation.isPending}>
                  Create Prescription
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Prescription History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Patient</TableHead>
                <TableHead className="text-gray-300">Medication or Medicine</TableHead>
                <TableHead className="text-gray-300">Dosage</TableHead>
                <TableHead className="text-gray-300">Frequency</TableHead>
                <TableHead className="text-gray-300">Duration</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Prescribed</TableHead>
                <TableHead className="text-gray-300">Instructions</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
        {(!prescriptions || prescriptions.length === 0) && (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-gray-400">No prescriptions yet.</TableCell>
          </TableRow>
        )}
        {prescriptions?.map((p: any) => (
                <TableRow key={p.id} className="border-gray-700">
          <TableCell className="text-white">{p.patient_name || p.patient_id}</TableCell>
                  <TableCell className="text-gray-300">{p.medicine_name}</TableCell>
                  <TableCell className="text-gray-300">{p.dosage || '-'}</TableCell>
                  <TableCell className="text-gray-300">{p.frequency_per_day != null ? `${p.frequency_per_day}/day` : '-'}</TableCell>
                  <TableCell className="text-gray-300">{p.duration_days != null ? `${p.duration_days} day(s)` : '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      p.status === 'active' ? 'bg-green-600 text-green-100' :
                      p.status === 'completed' ? 'bg-blue-600 text-blue-100' : 'bg-gray-600 text-gray-100'
                    }`}>
                      {p.status || 'active'}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {p.created_at ? format(new Date(p.created_at), 'MMM dd, yyyy') : ''}
                  </TableCell>
                  <TableCell className="text-gray-300">{p.instructions || ''}</TableCell>
                  <TableCell>
                    {p.status === 'active' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => confirmDispense(p)}>
                        Confirm Dispense
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
