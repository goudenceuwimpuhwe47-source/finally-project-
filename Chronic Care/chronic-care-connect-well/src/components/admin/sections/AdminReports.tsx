
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileText, Download, TrendingUp, Layers, CloudDownload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API_URL } from "@/lib/utils";

export const AdminReports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = user?.token || localStorage.getItem('token') || '';

  type ReportRow = { id: number; type: 'patient_engagement'|'medication_usage'|'provider_activity'; title: string; data: any; generated_at: string };

  const parseData = (val: any) => {
    if (!val) return {} as any;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return {}; }
    }
    return val;
  };

  const { data: reports, isLoading } = useQuery({
    queryKey: ["adminReports"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/reports?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Failed to load reports (${res.status})`);
      const data = await res.json();
      const list = (data.reports || []) as any[];
      return list.map(r => ({ ...r, data: parseData(r.data) })) as ReportRow[];
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (reportType: string) => {
      const res = await fetch(`${API_URL}/admin/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: reportType }),
      });
      if (!res.ok) throw new Error(`Generate failed (${res.status})`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      toast.success("Report generated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to generate report: " + (error?.message || 'Unknown error'));
    },
  });

  const generateAll = async () => {
    try {
      const types: Array<'patient_engagement'|'medication_usage'|'provider_activity'> = ['patient_engagement','medication_usage','provider_activity'];
      for (const t of types) {
        const res = await fetch(`${API_URL}/admin/reports/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: t })
        });
        if (!res.ok) throw new Error(`${t} failed (${res.status})`);
      }
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      toast.success('All reports generated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate all');
    }
  };

  const download = (filename: string, content: string, mime = 'application/json') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const exportJSON = (report: ReportRow) => {
    const name = `${report.type}-${format(new Date(report.generated_at), 'yyyyMMdd_HHmm')}.json`;
    download(name, JSON.stringify({ ...report, data: report.data }, null, 2));
  };

  const exportCSV = (report: ReportRow) => {
    const dt = report.data || {};
    let csv = 'metric,value\n';
    if (report.type === 'patient_engagement') {
      csv += `totalPatients,${dt.totalPatients ?? 0}\n`;
      csv += `totalOrders,${dt.totalOrders ?? 0}\n`;
    } else if (report.type === 'medication_usage') {
      csv += `totalMedicationOrders,${dt.totalMedicationOrders ?? 0}\n`;
    } else if (report.type === 'provider_activity') {
      csv += `totalProviders,${dt.totalProviders ?? 0}\n`;
      csv += `totalPrescriptions,${dt.totalPrescriptions ?? 0}\n`;
    }
    const name = `${report.type}-${format(new Date(report.generated_at), 'yyyyMMdd_HHmm')}.csv`;
    download(name, csv, 'text/csv');
  };

  const exportServer = async (report: ReportRow, format: 'json'|'csv') => {
    try {
      const res = await fetch(`${API_URL}/admin/reports/${report.id}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const dispo = res.headers.get('Content-Disposition') || '';
      const fnameMatch = dispo.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
      const suggested = fnameMatch ? decodeURIComponent((fnameMatch[1] || fnameMatch[2] || '').trim()) : `${report.type}-${format}.` + (format === 'csv' ? 'csv' : 'json');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = suggested; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e: any) {
      toast.error(e?.message || 'Server download failed');
    }
  };

  if (isLoading) {
    return <div className="text-white">Loading reports...</div>;
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Generate and export system-wide clinical data reports.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2 w-full xl:w-auto">
          <Button
            onClick={() => generateReportMutation.mutate("patient_engagement")}
            className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-semibold shadow-lg shadow-blue-900/20"
            disabled={generateReportMutation.isPending}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Engagements
          </Button>
          <Button
            onClick={() => generateReportMutation.mutate("medication_usage")}
            className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm font-semibold shadow-lg shadow-green-900/20"
            disabled={generateReportMutation.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            Usage
          </Button>
          <Button
            onClick={() => generateReportMutation.mutate("provider_activity")}
            className="bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm font-semibold shadow-lg shadow-purple-900/20"
            disabled={generateReportMutation.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            Activity
          </Button>
          <Button
            onClick={generateAll}
            variant="outline"
            className="border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs sm:text-sm font-semibold"
            disabled={generateReportMutation.isPending}
            title="Generate all reports"
          >
            <Layers className="h-4 w-4 mr-2 text-gray-400" />
            Generate All
          </Button>
        </div>
      </div>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Generated Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports?.map((report) => (
              <div key={report.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border border-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white text-[10px] font-bold uppercase transition-all"
                        onClick={() => exportJSON(report)}
                        title="Export JSON"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border border-green-600/30 text-green-400 hover:bg-green-600 hover:text-white text-[10px] font-bold uppercase transition-all"
                        onClick={() => exportCSV(report)}
                        title="Export CSV"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border border-indigo-600/30 text-indigo-400 hover:bg-indigo-600 hover:text-white text-[10px] font-bold uppercase transition-all"
                        onClick={() => exportServer(report, 'json')}
                        title="Download from server (JSON)"
                      >
                        <CloudDownload className="h-3.5 w-3.5 mr-1.5" />
                        Srvr JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[10px] font-bold uppercase transition-all"
                        onClick={() => exportServer(report, 'csv')}
                        title="Download from server (CSV)"
                      >
                        <CloudDownload className="h-3.5 w-3.5 mr-1.5" />
                        Srvr CSV
                      </Button>
                    </div>
                  </div>
              </div>
            ))}
            {reports?.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No reports generated yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
