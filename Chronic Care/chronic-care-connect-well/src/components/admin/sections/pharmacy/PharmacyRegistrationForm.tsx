
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Building2 className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold text-white">Register New Pharmacy</h1>
      </div>

      <Card className="bg-gray-800 border-gray-700 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Pharmacy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Pharmacy Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter pharmacy name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_number" className="text-gray-300">License Number *</Label>
                <Input
                  id="license_number"
                  required
                  value={formData.license_number}
                  onChange={(e) => handleInputChange("license_number", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter license number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-300">Address *</Label>
              <Input
                id="address"
                required
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter full address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person" className="text-gray-300">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange("contact_person", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter contact person name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_radius" className="text-gray-300">Delivery Radius (km)</Label>
                <Input
                  id="delivery_radius"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.delivery_radius}
                  onChange={(e) => handleInputChange("delivery_radius", e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-300">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Registering..." : "Register Pharmacy"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
