
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
      <div className="p-2 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-3xl"></div>
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Executive Summary</h1>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-bold px-3 py-1 rounded-full uppercase text-[10px] tracking-widest shadow-sm">
          System Operational
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-white border-border shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Patients</CardTitle>
            <div className="p-1.5 bg-emerald-50 rounded-lg">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{stats?.totalUsers ?? 0}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total registered</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-border shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pharmacies</CardTitle>
            <div className="p-1.5 bg-purple-50 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{stats?.totalProviders ?? 0}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Active providers</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-border shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Doctors</CardTitle>
            <div className="p-1.5 bg-cyan-50 rounded-lg">
              <Stethoscope className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{stats?.totalDoctors ?? 0}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Medical experts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-border shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Attention</CardTitle>
            <div className="p-1.5 bg-orange-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{stats?.pendingOrders ?? 0}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Awaiting review</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-border shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume</CardTitle>
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-black text-slate-800 tracking-tighter">{stats?.totalOrders ?? 0}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="bg-white border-border shadow-sm rounded-3xl overflow-hidden mt-8">
        <CardHeader className="border-b border-slate-50 py-6">
          <CardTitle className="text-slate-800 flex items-center gap-3 font-black tracking-tight">
            <div className="p-2 bg-slate-100 rounded-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            Real-time Clinical Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentError && (
            <div className="text-sm text-red-400 mb-3">Failed to load recent orders.</div>
          )}
          {recentLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : recent && recent.length > 0 ? (
            <div className="space-y-4">
              {recent.map((order) => {
                const patient = order.user_full_name || order.full_name || order.username || order.email || "Unknown";
                const status = order.admin_status;
                const badgeClass =
                  status === "pending"
                    ? "bg-amber-50 text-amber-600 border-amber-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full"
                    : status === "under_review"
                    ? "bg-blue-50 text-blue-600 border-blue-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full"
                    : status === "approved"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full"
                    : status === "rejected"
                    ? "bg-rose-50 text-rose-600 border-rose-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full"
                    : "bg-slate-50 text-slate-500 border-slate-100 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full";
                return (
                  <div key={order.id} className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-50 hover:border-primary/20 hover:shadow-md transition-all group">
                    <div className="flex-1">
                      <p className="font-black text-slate-800 tracking-tight text-base group-hover:text-primary transition-colors">{order.disease?.replace(/_/g, ' ') || 'Medical Consultation'}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs font-bold text-muted-foreground uppercase opacity-70">Patient: <span className="text-slate-700">{patient}</span></p>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <p className="text-xs font-bold text-slate-400 uppercase">
                          {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <Badge className={badgeClass} variant="outline">{status}</Badge>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">Qty: {order.dosage}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-slate-800 font-black tracking-tight uppercase text-xs">Queue Clear</h3>
              <p className="text-slate-400 font-bold text-[11px] mt-2 max-w-[200px] mx-auto">No pending or recent orders require immediate action.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
