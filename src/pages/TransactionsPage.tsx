import React, { useEffect, useState } from 'react';
import { Receipt, Search, Download, RefreshCw, ArrowUpRight, CheckCircle2, Clock, AlertTriangle, Eye, X } from 'lucide-react';
import { api } from '../services/api.js';

export const TransactionsPage: React.FC = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLink, setSelectedLink] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getPaymentLinks({ search });
      if (res.success) {
        setLinks(res.links);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.getPaymentLink(id);
      if (res.success) {
        setSelectedLink(res.link);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments &amp; Transactions</h1>
          <p className="text-xs text-slate-500">
            Audit-grade transaction records, verified callbacks, and gateway order reconciliation
          </p>
        </div>

        <a
          href="/api/reports/export/csv?type=payments"
          download="payments_report.csv"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition w-fit"
        >
          <Download size={14} />
          <span>Export Ledger</span>
        </a>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order ref, gateway order, or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-teal-500 transition"
          />
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Merchant Order No</th>
                <th className="py-3.5 px-4">Gateway Order No</th>
                <th className="py-3.5 px-4">Customer &amp; Brand</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Paid Timestamp</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {link.merchantOrderNo}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {link.gatewayOrderNo || <span className="text-slate-400 font-sans italic">Not yet created</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{link.customerName}</div>
                      <div className="text-[11px] text-teal-600 font-medium">{link.brandName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ₹{link.amountFormatted}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          link.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : link.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800'
                            : link.status === 'EXPIRED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {link.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {link.paidAt ? new Date(link.paidAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openDetail(link.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition"
                        title="View Audit Details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 relative border border-slate-100 max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setSelectedLink(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                {selectedLink.token}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedLink.status === 'SUCCESS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {selectedLink.status}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Transaction &amp; Status Audit</h3>

            <div className="my-4 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Merchant Order:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLink.merchantOrderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway Order:</span>
                <span className="font-mono font-bold text-slate-800">{selectedLink.gatewayOrderNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-bold text-emerald-600">₹{selectedLink.amountFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">{selectedLink.customer?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Brand:</span>
                <span className="font-semibold text-slate-800">{selectedLink.brand?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gateway:</span>
                <span className="font-semibold text-slate-800">{selectedLink.gateway?.name}</span>
              </div>
            </div>

            {/* Status Timeline History */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Status Transition Timeline
              </h4>
              <div className="space-y-2 border-l-2 border-teal-500/30 pl-3">
                {selectedLink.history?.map((h: any) => (
                  <div key={h.id} className="text-xs pb-1 relative">
                    <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-teal-500"></span>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-700">
                        {h.previousStatus} → {h.newStatus}
                      </span>
                      <span>{new Date(h.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-600 text-[11px] mt-0.5">{h.reason}</div>
                    <div className="text-slate-400 text-[10px] font-mono">Actor: {h.actor} ({h.source})</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLink(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
