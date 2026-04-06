
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
    return (
      <div className="space-y-8 animate-pulse h-full">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-slate-200 rounded-2xl w-64"></div>
          <div className="h-12 bg-slate-200 rounded-xl w-96"></div>
        </div>
        <div className="h-96 bg-slate-200 rounded-[32px]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 flex flex-col h-full">
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-start xl:items-center mb-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary rounded-2xl shadow-lg shadow-primary/20">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            Clinical Intelligence
          </h1>
          <p className="text-slate-400 font-bold text-sm">Synchronize and export system-wide clinical persistence data.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-3 w-full xl:w-auto p-4 bg-slate-50/50 rounded-[28px] border border-slate-100 shadow-inner">
          <Button
            onClick={() => generateReportMutation.mutate("patient_engagement")}
            className="bg-primary hover:bg-primary-hover text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
            disabled={generateReportMutation.isPending}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Engagements
          </Button>
          <Button
            onClick={() => generateReportMutation.mutate("medication_usage")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02]"
            disabled={generateReportMutation.isPending}
          >
            <Layers className="h-4 w-4 mr-2" />
            Usage Metrics
          </Button>
          <Button
            onClick={() => generateReportMutation.mutate("provider_activity")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
            disabled={generateReportMutation.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            Activity Log
          </Button>
          <Button
            onClick={generateAll}
            variant="outline"
            className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest h-12 px-6 rounded-xl transition-all"
            disabled={generateReportMutation.isPending}
            title="Generate all reports"
          >
            <Layers className="h-4 w-4 mr-2 text-primary" />
            Batch Process
          </Button>
        </div>
      </div>
      
      <Card className="bg-white border-border shadow-sm rounded-[32px] overflow-hidden">
        <CardHeader className="px-8 pt-8 pb-4 border-b border-slate-50">
          <CardTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center">
            <Layers className="h-5 w-5 mr-3 text-primary" />
            Archive Manifest
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-8">
          <div className="space-y-6">
            {reports?.map((report) => (
              <div key={report.id} className="p-8 bg-slate-50 border border-slate-100 rounded-[28px] hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-20" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none capitalize">
                        {report.type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{format(new Date(report.generated_at), 'MMMM dd, yyyy · HH:mm:ss')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white border border-slate-100 text-primary hover:bg-primary hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-5 rounded-xl transition-all shadow-sm"
                      onClick={() => exportJSON(report)}
                      title="Local Object Export"
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white border border-slate-100 text-emerald-600 hover:bg-emerald-600 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-5 rounded-xl transition-all shadow-sm"
                      onClick={() => exportCSV(report)}
                      title="Spreadsheet Export"
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      CSV
                    </Button>
                    <div className="w-[1px] h-8 bg-slate-200 mx-1 hidden md:block" />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white border border-slate-100 text-indigo-600 hover:bg-indigo-600 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-5 rounded-xl transition-all shadow-sm"
                      onClick={() => exportServer(report, 'json')}
                      title="Cloud Persistence Retrieval"
                    >
                      <CloudDownload className="h-3.5 w-3.5 mr-2" />
                      SRVR JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="bg-white border border-slate-100 text-rose-600 hover:bg-rose-600 hover:text-white text-[10px] font-black uppercase tracking-widest h-10 px-5 rounded-xl transition-all shadow-sm"
                      onClick={() => exportServer(report, 'csv')}
                      title="Cloud CSV Retrieval"
                    >
                      <CloudDownload className="h-3.5 w-3.5 mr-2" />
                      SRVR CSV
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {reports?.length === 0 && (
              <div className="text-center py-24 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <FileText className="h-8 w-8 text-slate-200" />
                </div>
                <h3 className="text-slate-400 font-black uppercase text-xs tracking-widest">Archive Void</h3>
                <p className="text-slate-400 font-bold text-[10px] mt-2">No clinical reports have been manifested for this period.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
