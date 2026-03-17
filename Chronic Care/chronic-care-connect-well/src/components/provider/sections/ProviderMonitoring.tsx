import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, TrendingUp, AlertTriangle, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";

const API_URL = "http://localhost:5000";

export const ProviderMonitoring = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const qc = useQueryClient();

  // Load provider patients
  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: ["providerPatientsForMonitoring"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/patients`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      return Array.isArray(body?.patients) ? body.patients : [];
    }
  });

  // Load assigned orders
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["providerAssignedForMonitoring"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/assigned`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      return Array.isArray(body?.orders) ? body.orders : [];
    }
  });

  // Load provider prescriptions
  const { data: prescriptions, isLoading: loadingPresc } = useQuery({
    queryKey: ["providerPrescriptionsForMonitoring"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/orders/provider/prescriptions`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      return Array.isArray(body?.prescriptions) ? body.prescriptions : [];
    }
  });

  const loading = loadingPatients || loadingOrders || loadingPresc;
  const pts = patients || [];
  const ords = orders || [];
  const presc = prescriptions || [];

  // Active patients = distinct patients list
  const activePatients = pts.length;

  // Prescriptions completion for compliance
  const prescTotal = presc.length;
  const prescCompleted = presc.filter((p: any) => String(p.status || '').toLowerCase() === 'completed').length;
  const compliance = prescTotal > 0 ? Math.round((prescCompleted / prescTotal) * 100) : 0;

  // Outcomes: delivered orders vs total assigned
  const delivered = ords.filter((o: any) => String(o.pharmacy_status || '').toLowerCase() === 'delivered').length;
  const deliveredRate = ords.length > 0 ? Math.round((delivered / ords.length) * 100) : 0;

  // Alerts
  const prescOrderIds = new Set(presc.map((p: any) => p.order_id));
  const alerts: Array<{ patient: string; condition: string; severity: 'high'|'medium'|'low'; time?: string }> = [];
  for (const o of ords) {
    const name = o.full_name || o.user_full_name || o.username || o.email || `Order #${o.id}`;
    if (!o.provider_confirmed) {
      alerts.push({ patient: name, condition: `Confirm availability for Order #${o.id}`, severity: 'medium' });
    } else if (String(o.payment_status || '').toLowerCase() !== 'confirmed') {
      alerts.push({ patient: name, condition: `Awaiting payment for Order #${o.id}`, severity: 'low' });
    } else if (String(o.admin_status || '').toLowerCase() === 'approved' && String(o.pharmacy_status || '').toLowerCase() !== 'delivered' && !prescOrderIds.has(o.id)) {
      alerts.push({ patient: name, condition: `Prescription pending for Order #${o.id}`, severity: 'high' });
    }
  }

  // Patient progress: compute per-patient prescription completion
  const progressItems = pts.slice(0, 5).map((p: any) => {
    const pPresc = presc.filter((x: any) => x.patient_id === p.id);
    const t = pPresc.length;
    const c = pPresc.filter((x: any) => String(x.status || '').toLowerCase() === 'completed').length;
    const pct = t > 0 ? Math.round((c / t) * 100) : 0;
    const trend = pct >= 80 ? 'improving' : pct >= 50 ? 'stable' : 'at_risk';
    return { patient: p.full_name || p.email || `Patient #${p.id}`, progress: pct, condition: p.email || '', trend } as any;
  });

  // Realtime updates: refetch on key lifecycle events
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    const refetchAll = () => {
      qc.invalidateQueries({ queryKey: ["providerPatientsForMonitoring"] });
      qc.invalidateQueries({ queryKey: ["providerAssignedForMonitoring"] });
      qc.invalidateQueries({ queryKey: ["providerPrescriptionsForMonitoring"] });
    };
    socket.on('order:provider_confirmed', refetchAll);
    socket.on('order:provider_unavailable', refetchAll);
    socket.on('order:payment_received', refetchAll);
    socket.on('order:admin_approved', refetchAll);
    socket.on('prescription:created', refetchAll);
    socket.on('order:prescription_created', refetchAll);
    socket.on('order:pharmacy_delivered', refetchAll);
    return () => { socket.disconnect(); };
  }, [token]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Patient Monitoring</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1,2,3,4].map(i => (
            <Card key={i} className="bg-gray-800 border-gray-700 h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Active Patients</CardTitle>
              <Activity className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activePatients}</div>
              <p className="text-xs text-gray-400">Distinct patients assigned to you</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Health Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{alerts.length}</div>
              <p className="text-xs text-gray-400">Require attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Avg Compliance</CardTitle>
              <Heart className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{compliance}%</div>
              <p className="text-xs text-gray-400">Completed prescriptions</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Outcomes</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{deliveredRate}%</div>
              <p className="text-xs text-gray-400">Orders delivered</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Health Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="p-3 bg-gray-700 rounded-lg text-gray-300">No alerts. You're all caught up.</div>
              ) : (
                alerts.slice(0,10).map((alert, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-300" />
                      <div>
                        <p className="font-medium text-white">{alert.patient}</p>
                        <p className="text-sm text-gray-400">{alert.condition}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        alert.severity === 'high' ? 'bg-red-600 text-red-100' :
                        alert.severity === 'medium' ? 'bg-yellow-600 text-yellow-100' :
                        'bg-blue-600 text-blue-100'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Patient Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressItems.length === 0 ? (
                <div className="p-3 bg-gray-700 rounded-lg text-gray-300">No patients to show yet.</div>
              ) : (
                progressItems.map((progress: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{progress.patient}</p>
                        <p className="text-sm text-gray-400">{progress.condition}</p>
                      </div>
                      <span className={`text-sm ${
                        progress.trend === 'improving' ? 'text-green-400' :
                        progress.trend === 'stable' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {progress.trend}
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{progress.progress}% prescriptions completed</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
