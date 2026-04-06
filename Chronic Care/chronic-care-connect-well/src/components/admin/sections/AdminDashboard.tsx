
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Activity, TrendingUp, AlertCircle, Stethoscope, Clock } from "lucide-react";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[
          { title: 'Patients', icon: Users, val: stats?.totalUsers, color: 'emerald', label: 'Total registered' },
          { title: 'Pharmacies', icon: Activity, val: stats?.totalProviders, color: 'purple', label: 'Active providers' },
          { title: 'Doctors', icon: Stethoscope, val: stats?.totalDoctors, color: 'cyan', label: 'Medical experts' },
          { title: 'Attention', icon: AlertCircle, val: stats?.pendingOrders, color: 'orange', label: 'Awaiting review' },
          { title: 'Volume', icon: FileText, val: stats?.totalOrders, color: 'blue', label: 'Total requests' },
        ].map((s, i) => (
          <Card key={i} className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden hover:shadow-lg transition-all group border-t-2" style={{ borderTopColor: `var(--${s.color}-500)` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.title}</CardTitle>
              <div className={`p-2 bg-${s.color}-50 rounded-xl group-hover:scale-110 transition-transform`}>
                <s.icon className={`h-4 w-4 text-${s.color}-600`} />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-3xl font-black text-slate-800 tracking-tighter">{s.val ?? 0}</div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-white border-slate-200 shadow-md rounded-[40px] overflow-hidden border-t-4 border-t-primary">
        <CardHeader className="border-b border-slate-50 py-8 px-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-800 flex items-center gap-4 font-black tracking-tight text-xl">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span>Real-time Manifest</span>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Live clinical activity stream</p>
              </div>
            </CardTitle>
            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-black px-4 py-1.5 rounded-full uppercase text-[10px] tracking-widest">
              Last 8 Packets
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-10 pt-8">
          {recentError && (
            <div className="text-sm text-red-500 font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Synchronization Error: Failed to load manifest data.
            </div>
          )}
          {recentLoading ? (
            <div className="space-y-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : recent && recent.length > 0 ? (
            <div className="space-y-6">
              {recent.map((order) => {
                const patient = order.user_full_name || order.full_name || order.username || order.email || "Unknown Entity";
                const status = order.admin_status;
                const badgeClass =
                  status === "pending"
                    ? "bg-amber-50 text-amber-600 border-amber-100 font-extrabold uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full"
                    : status === "under_review"
                    ? "bg-blue-50 text-blue-600 border-blue-100 font-extrabold uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full"
                    : status === "approved"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 font-extrabold uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full"
                    : status === "rejected"
                    ? "bg-rose-50 text-rose-600 border-rose-100 font-extrabold uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full"
                    : "bg-slate-50 text-slate-500 border-slate-100 font-extrabold uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-full";
                return (
                  <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[28px] bg-white border border-slate-50/80 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-primary transition-colors" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-black text-slate-800 tracking-tight text-lg group-hover:text-primary transition-colors">{order.disease?.replace(/_/g, ' ') || 'Clinical Consultation'}</p>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-50 rounded text-slate-400 uppercase tracking-tighter">#{order.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-slate-300" />
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Patient: <span className="text-slate-700">{patient}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-slate-300" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                            Manifested {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 text-right flex flex-col items-end gap-3 shrink-0">
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
