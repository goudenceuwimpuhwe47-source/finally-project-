
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Activity, TrendingUp, AlertCircle, Stethoscope } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/lib/utils";

type AdminStats = {
  pendingOrders: number;
  totalOrders: number;
  totalUsers: number;
  totalProviders: number;
  totalDoctors: number;
};

type RecentOrder = {
  id: number;
  user_id: number;
  disease: string;
  dosage: string;
  created_at: string;
  admin_status: "pending" | "under_review" | "approved" | "rejected";
  doctor_status: string;
  payment_status: string;
  pharmacy_status: string;
  // from join
  username?: string;
  email?: string;
  user_full_name?: string | null;
  full_name?: string | null; // also stored on the order itself
};



export const AdminDashboard = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery<AdminStats>({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load stats");
      return (await res.json()) as AdminStats;
    },
  });

  const { data: recent, isLoading: recentLoading, isError: recentError } = useQuery<RecentOrder[]>({
    queryKey: ["recentOrders"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/recent-orders?limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load recent orders");
      const body = await res.json();
      return (body?.orders ?? []) as RecentOrder[];
    },
  });

  if (statsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
          System Active
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Patients</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-gray-400">Registered patients</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pharmacies</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalProviders ?? 0}</div>
            <p className="text-xs text-gray-400">Registered pharmacies</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalDoctors ?? 0}</div>
            <p className="text-xs text-gray-400">Medical doctors</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending Orders</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.pendingOrders ?? 0}</div>
            <p className="text-xs text-gray-400">Orders awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalOrders ?? 0}</div>
            <p className="text-xs text-gray-400">All time orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentError && (
            <div className="text-sm text-red-400 mb-3">Failed to load recent orders.</div>
          )}
          {recentLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-700/50 rounded" />
              ))}
            </div>
          ) : recent && recent.length > 0 ? (
            <div className="space-y-4">
              {recent.map((order) => {
                const patient = order.user_full_name || order.full_name || order.username || order.email || "Unknown";
                const status = order.admin_status;
                const badgeClass =
                  status === "pending"
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : status === "under_review"
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    : status === "approved"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : status === "rejected"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-gray-500/10 text-gray-300 border-gray-500/20";
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
                  <div className="flex-1">
                    <p className="font-medium text-white">{order.disease?.replace(/_/g, ' ') || 'Medication Request'}</p>
                    <p className="text-sm text-gray-400">Patient: {patient}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={badgeClass}>{status}</Badge>
                    <p className="text-xs text-gray-400 mt-1">Dosage: {order.dosage}</p>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent orders found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
