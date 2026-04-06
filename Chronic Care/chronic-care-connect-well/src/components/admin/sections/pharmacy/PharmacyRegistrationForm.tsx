
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/utils";

interface PharmacyRegistrationFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export const PharmacyRegistrationForm = ({ onCancel, onSuccess }: PharmacyRegistrationFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    license_number: "",
    contact_person: "",
    delivery_radius: "10",
    status: "active"
  });
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        license_number: formData.license_number.trim(),
        contact_person: formData.contact_person.trim() || undefined,
        delivery_radius: Number(formData.delivery_radius) || 10,
        status: formData.status,
      };

      const res = await fetch(`${API_URL}/admin/pharmacies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // If endpoint not ready, soft-fallback
        const msg = `Failed (${res.status})`;
        throw new Error(msg);
      }
      toast({ title: "Success", description: "Pharmacy registered" });
      onSuccess();
    } catch (e: any) {
      console.warn('Pharmacy create failed', e?.message || e);
      toast({ title: "Error", description: "Failed to register pharmacy", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-10 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl h-12 w-12 p-0 transition-all border border-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none">Register Clinical Node</h1>
            </div>
            <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">Onboard a new distribution partner into the network.</p>
          </div>
        </div>
      </div>

      <Card className="bg-white border-border shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden border-t-4 border-t-primary">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-slate-800 font-black text-xl tracking-tight">Partner Credentials</CardTitle>
          <p className="text-slate-400 font-bold text-xs mt-1">Please provide the verified clinical and operational details.</p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pharmacy Name / Ident</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40 focus:border-primary placeholder:text-slate-300"
                  placeholder="e.g. Apex Clinical Center"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="license_number" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Clinical License Cert</Label>
                <Input
                  id="license_number"
                  required
                  value={formData.license_number}
                  onChange={(e) => handleInputChange("license_number", e.target.value)}
                  className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40 focus:border-primary placeholder:text-slate-300"
                  placeholder="Official license string"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Geospatial Address</Label>
              <Input
                id="address"
                required
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40 focus:border-primary placeholder:text-slate-300"
                placeholder="Full operational location"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Comms Line (Voice)</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40 focus:border-primary placeholder:text-slate-300"
                  placeholder="+250..."
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Digital Uplink (Email)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40 focus:border-primary placeholder:text-slate-300"
                  placeholder="contact@pharmacy.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="contact_person" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Liaison Officer</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange("contact_person", e.target.value)}
                  className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40 focus:border-primary placeholder:text-slate-300"
                  placeholder="Primary contact name"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="delivery_radius" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational Radius (KM)</Label>
                <Input
                  id="delivery_radius"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.delivery_radius}
                  onChange={(e) => handleInputChange("delivery_radius", e.target.value)}
                  className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="status" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Network Deployment Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger className="h-14 bg-slate-50 border-slate-100 text-slate-700 font-bold rounded-2xl focus:ring-primary/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-100 rounded-2xl shadow-xl">
                  <SelectItem value="active" className="font-bold text-slate-700 focus:bg-emerald-50 focus:text-emerald-600">Active Node</SelectItem>
                  <SelectItem value="inactive" className="font-bold text-slate-700 focus:bg-slate-50 focus:text-slate-600">Standby Mode</SelectItem>
                  <SelectItem value="suspended" className="font-bold text-slate-700 focus:bg-rose-50 focus:text-rose-600">Access Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-14 border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-50 active:scale-95 transition-all"
              >
                Abort Operation
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-14 bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                {loading ? "Transmitting..." : "Initialize Node Deployment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
