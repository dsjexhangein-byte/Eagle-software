import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';
import { api } from '../services/api.js';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-teal-600" size={32} />
          <p className="text-sm font-medium text-slate-500">Loading live platform statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Zap size={220} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Production Gateway Active
              </span>
              <span className="text-xs text-slate-400">Eagle Pay Supabase API</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Payment Operations Center</h1>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Multi-brand payment links, cryptographic token resolution, and real-time Eagle Pay callback orchestration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('payment-links')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Plus size={16} />
              <span>Create Payment Link</span>
            </button>

            <button
              onClick={() => onNavigate('cpanel')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition"
            >
              <Server size={14} className="text-amber-400" />
              <span>cPanel Deployment</span>
            </button>

            <button
              onClick={fetchStats}
              title="Refresh Live Statistics"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <span>Error loading metrics: {error}</span>
          <button onClick={fetchStats} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              ₹{stats?.totalCollectedFormatted || '0.00'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span className="font-semibold text-emerald-600">{stats?.successfulPayments || 0}</span> confirmed transactions
            </div>
          </div>
        </div>

        {/* Total Payment Links */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Links</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {stats?.totalLinks || 0}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>Today: <strong className="text-slate-800">{stats?.paymentsToday || 0}</strong></span>
              <span>•</span>
              <span className="text-amber-600 font-medium">{stats?.pendingPayments || 0} pending</span>
            </div>
          </div>
        </div>

        {/* Payment Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Success Rate</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {stats?.successRate || 100}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full"
                style={{ width: `${stats?.successRate || 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Failed / Expired Links */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exceptions</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {(stats?.failedPayments || 0) + (stats?.expiredLinks || 0)}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{stats?.failedPayments || 0} failed</span>
              <span>•</span>
              <span>{stats?.expiredLinks || 0} expired</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Status Health Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Configured Payment Gateway Accounts</h3>
            <p className="text-xs text-slate-500">Active status and endpoint health for payment adapters</p>
          </div>
          <button
            onClick={() => onNavigate('gateway-accounts')}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>Manage Gateways</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats?.gatewayHealth?.map((gw: any) => (
            <div
              key={gw.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    gw.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                ></div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span>{gw.name}</span>
                    {gw.isSandbox && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                        SANDBOX
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Adapter: {gw.adapter} • Status Check: {gw.lastTestStatus || 'HEALTHY'}
                  </div>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800">
                Connected
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
              <p className="text-xs text-slate-500">Real-time payment executions</p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Order Ref</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Brand</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {stats?.recentTransactions?.length ? (
                  stats.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 font-mono font-medium text-slate-800">
                        {tx.merchantOrderNo}
                        {tx.gatewayOrderNo && (
                          <div className="text-[10px] text-slate-400 font-mono">{tx.gatewayOrderNo}</div>
                        )}
                      </td>
                      <td className="py-3 text-slate-700">{tx.customerName}</td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-700">{tx.brandName}</span>
                      </td>
                      <td className="py-3 font-bold font-mono text-slate-900">
                        ₹{Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Audit Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Security Audit Feed</h3>
            <ShieldCheck size={16} className="text-teal-600" />
          </div>

          <div className="space-y-3.5">
            {stats?.recentActivity?.slice(0, 6).map((log: any) => (
              <div key={log.id} className="text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-700">{log.action}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{log.details}</p>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">By: {log.adminUsername}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
