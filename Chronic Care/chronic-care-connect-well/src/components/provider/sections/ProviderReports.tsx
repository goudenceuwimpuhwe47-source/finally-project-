import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { API_URL } from "@/lib/utils";

export const ProviderReports = () => {
  const token = (typeof window !== 'undefined' ? localStorage.getItem('token') : null) as string | null;

  const { data: patients } = useQuery({
    queryKey: ["providerReports:patients"],
    enabled: !!token,
    queryFn: async () => {
      const r = await fetch(`${API_URL}/orders/provider/patients`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await r.json();
      return Array.isArray(b?.patients) ? b.patients : [];
    }
  });

  const { data: prescriptions } = useQuery({
    queryKey: ["providerReports:prescriptions"],
    enabled: !!token,
    queryFn: async () => {
      const r = await fetch(`${API_URL}/orders/provider/prescriptions`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await r.json();
      return Array.isArray(b?.prescriptions) ? b.prescriptions : [];
    }
  });

  const { data: orders } = useQuery({
    queryKey: ["providerReports:assignedOrders"],
    enabled: !!token,
    queryFn: async () => {
      const r = await fetch(`${API_URL}/orders/provider/assigned`, { headers: { Authorization: `Bearer ${token}` } });
      const b = await r.json();
      return Array.isArray(b?.orders) ? b.orders : [];
    }
  });

  const totalPatients = (patients || []).length;
  const totalPrescriptions = (prescriptions || []).length;
  const completedPrescriptions = (prescriptions || []).filter((p:any)=> String(p.status||'').toLowerCase()==='completed').length;
  const compliancePct = totalPrescriptions > 0 ? Math.round((completedPrescriptions/totalPrescriptions)*100) : 0;

  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate()-7);
  const prescLast7 = (prescriptions || []).filter((p:any)=> p.created_at && new Date(p.created_at) >= startOfWeek).length;

  // Active orders: not delivered
  const norm = (s:any)=> String(s||'').toLowerCase();
  const deliveredCount = (orders||[]).filter((o:any)=> norm(o.pharmacy_status)==='delivered').length;
  const activeOrders = (orders||[]).length - deliveredCount;

  // Active this month: unique patients with orders in current month
  const monthKey = (d:Date)=> format(d, 'yyyy-MM');
  const currentMonthKey = monthKey(now);
  const activePatientIdsThisMonth = new Set<number>();
  for (const o of (orders||[])) {
    if (!o?.created_at) continue;
    if (monthKey(new Date(o.created_at)) === currentMonthKey) {
      const pid = Number(o.patient_id);
      if (Number.isFinite(pid)) activePatientIdsThisMonth.add(pid);
    }
  }

  // Orders status distribution
  const counts = { awaiting_provider: 0, awaiting_payment: 0, awaiting_admin: 0, in_progress: 0, delivered: 0 };
  for (const o of (orders||[])) {
    const providerConfirmed = !!(o.provider_confirmed || o.provider_available);
    const paymentConfirmed = norm(o.payment_status) === 'confirmed';
    const adminApproved = norm(o.admin_status) === 'approved';
    const isDelivered = norm(o.pharmacy_status) === 'delivered';
    if (isDelivered) counts.delivered++;
    else if (!providerConfirmed) counts.awaiting_provider++;
    else if (!paymentConfirmed) counts.awaiting_payment++;
    else if (!adminApproved) counts.awaiting_admin++;
    else counts.in_progress++;
  }

  // Monthly activity for last 6 months
  const lastMonths: string[] = [];
  for (let i=5;i>=0;i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    lastMonths.push(format(d, 'yyyy-MM'));
  }
  const monthly = lastMonths.map(mk => {
    const presc = (prescriptions||[]).filter((p:any)=> p.created_at && format(new Date(p.created_at),'yyyy-MM')===mk).length;
    const consults = (orders||[]).filter((o:any)=> o.created_at && format(new Date(o.created_at),'yyyy-MM')===mk).length;
    return { month: mk, consultations: consults, prescriptions: presc };
  });

  const monthlyChartData = monthly.map(row => ({ name: row.month, consultations: row.consultations, prescriptions: row.prescriptions }));
  const monthlyConfig = {
    consultations: { label: 'Consultations (Orders)', color: '#60a5fa' },
    prescriptions: { label: 'Prescriptions', color: '#10b981' }
  } as const;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Provider Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalPatients}</div>
            <p className="text-xs text-gray-400">Active this month: {activePatientIdsThisMonth.size}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Prescriptions</CardTitle>
            <Activity className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalPrescriptions}</div>
            <p className="text-xs text-gray-400">+{prescLast7} in last 7 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Compliance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{compliancePct}%</div>
            <p className="text-xs text-gray-400">{completedPrescriptions} completed / {totalPrescriptions} total</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeOrders}</div>
            <p className="text-xs text-gray-400">{deliveredCount} delivered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: 'awaiting_provider', label: 'Awaiting Provider', color: 'bg-blue-600', value: counts.awaiting_provider },
                { key: 'awaiting_payment', label: 'Awaiting Payment', color: 'bg-yellow-600', value: counts.awaiting_payment },
                { key: 'awaiting_admin', label: 'Awaiting Admin', color: 'bg-orange-600', value: counts.awaiting_admin },
                { key: 'in_progress', label: 'In Progress', color: 'bg-green-600', value: counts.in_progress },
                { key: 'delivered', label: 'Delivered', color: 'bg-purple-600', value: counts.delivered },
              ].map((row:any) => (
                <div key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">{row.label}</p>
                    <span className="text-white font-bold">{row.value}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className={`${row.color} h-2 rounded-full`} style={{ width: `${(orders||[]).length>0 ? Math.max(3, (row.value/(orders||[]).length)*100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={monthlyConfig as any} className="h-64">
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#9ca3af" />
                <YAxis allowDecimals={false} stroke="#9ca3af" />
                <ChartTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="consultations" stackId="a" fill="var(--color-consultations)" radius={[4,4,0,0]} />
                <Bar dataKey="prescriptions" stackId="a" fill="var(--color-prescriptions)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
