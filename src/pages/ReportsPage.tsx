import React, { useEffect, useState } from 'react';
import { BarChart3, Download, RefreshCw, Calendar, TrendingUp, Layers, CreditCard } from 'lucide-react';
import { api } from '../services/api.js';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReportSummary();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financial Reports &amp; Exports</h1>
          <p className="text-xs text-slate-500">
            Real-time multi-brand reconciliation, daily settlement metrics, and sanitized ledger exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/reports/export/csv?type=payments"
            download="payments_report.csv"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Daily Collections (Last 7 Days) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daily Collections (Last 7 Days)</h3>
            <p className="text-xs text-slate-500">Verified paid settlement volumes</p>
          </div>
          <Calendar size={16} className="text-teal-600" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {data?.dailyBreakdown?.map((d: any, idx: number) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between"
            >
              <span className="text-[11px] font-semibold text-slate-500">{d.date}</span>
              <div className="mt-3">
                <div className="text-base font-extrabold text-slate-900 font-mono">
                  ₹{Number(d.collected).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-teal-600 font-semibold mt-0.5">{d.count} payments</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand-Wise & Gateway-Wise Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brand-Wise Collections */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Brand-Wise Performance</h3>
            <Layers size={16} className="text-indigo-600" />
          </div>

          <div className="space-y-3">
            {data?.brandBreakdown?.map((b: any) => (
              <div key={b.brandId} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">{b.brandName}</span>
                  <span className="font-mono font-extrabold text-xs text-emerald-600">
                    ₹{Number(b.totalCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{b.paidCount} paid of {b.totalLinks} links generated</span>
                  <span>{b.totalLinks > 0 ? Math.round((b.paidCount / b.totalLinks) * 100) : 0}% paid</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gateway-Wise Collections */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Gateway-Wise Distribution</h3>
            <CreditCard size={16} className="text-teal-600" />
          </div>

          <div className="space-y-3">
            {data?.gatewayBreakdown?.map((g: any) => (
              <div key={g.gatewayId} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-slate-900">{g.gatewayName}</span>
                  <span className="font-mono font-extrabold text-xs text-emerald-600">
                    ₹{Number(g.totalCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{g.paidCount} completed</span>
                  <span className="font-mono text-[10px] uppercase font-semibold text-slate-400">
                    Adapter: {g.adapter}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
