
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, MapPin, Phone, Mail, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PharmacyRegistrationForm } from "./pharmacy/PharmacyRegistrationForm";
import { PharmacyCommunication } from "./pharmacy/PharmacyCommunication";
import { API_URL } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export const AdminPharmacies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [showCommunication, setShowCommunication] = useState(false);
  const { toast } = useToast();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Fetch pharmacies
  const { data: pharmacies, isLoading, refetch } = useQuery({
    queryKey: ["pharmacies"],
    // Try backend: GET /admin/pharmacies, fallback to empty list
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/admin/pharmacies`, { headers: { Authorization: `Bearer ${token || ''}` } });
        if (!res.ok) throw new Error(`Failed to load pharmacies (${res.status})`);
        const body = await res.json();
        // Support either { pharmacies: [...] } or direct array
        return (body?.pharmacies ?? body ?? []) as any[];
      } catch (e: any) {
        // Soft-fail: show toast once and return []
        console.warn('AdminPharmacies load failed', e?.message || e);
        toast({ title: 'Pharmacies unavailable', description: 'Could not load pharmacies from server yet.', variant: 'destructive' });
        return [] as any[];
      }
    },
  });

  const filteredPharmacies = pharmacies?.filter((pharmacy:any) => {
    const name = String(pharmacy?.name || '').toLowerCase();
    const address = String(pharmacy?.address || '').toLowerCase();
    const license = String(pharmacy?.license_number || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || address.includes(q) || license.includes(q);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'suspended':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showAddForm) {
    return (
      <PharmacyRegistrationForm 
        onCancel={() => setShowAddForm(false)}
        onSuccess={() => {
          setShowAddForm(false);
          refetch();
        }}
      />
    );
  }

  if (showCommunication && selectedPharmacy) {
    return (
      <PharmacyCommunication
        pharmacy={selectedPharmacy}
        onBack={() => {
          setShowCommunication(false);
          setSelectedPharmacy(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Pharmacy Management</h1>
        </div>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Pharmacy
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search pharmacies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{pharmacies?.length || 0}</div>
            <p className="text-sm text-gray-400">Total Pharmacies</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">
              {pharmacies?.filter(p => p.status === 'active').length || 0}
            </div>
            <p className="text-sm text-gray-400">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-400">
              {pharmacies?.filter(p => p.status === 'inactive').length || 0}
            </div>
            <p className="text-sm text-gray-400">Inactive</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">
              {pharmacies?.filter(p => p.status === 'suspended').length || 0}
            </div>
            <p className="text-sm text-gray-400">Suspended</p>
          </CardContent>
        </Card>
      </div>

      {/* Pharmacies Grid */}
      {filteredPharmacies && filteredPharmacies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPharmacies.map((pharmacy:any, idx:number) => (
            <Card key={pharmacy.id ?? idx} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-white text-lg">{pharmacy.name}</CardTitle>
                  <Badge className={getStatusColor(pharmacy.status)}>
                    {pharmacy.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{pharmacy.address}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-400">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{pharmacy.phone}</span>
                </div>
                
                {pharmacy.email && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{pharmacy.email}</span>
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  License: {pharmacy.license_number}
                </div>
                
                <div className="text-xs text-gray-500">
                  Delivery Radius: {pharmacy.delivery_radius}km
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPharmacy(pharmacy);
                      setShowCommunication(true);
                    }}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400 opacity-50" />
            <p className="text-gray-400">No pharmacies found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
