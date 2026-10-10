import React, { useEffect, useState } from 'react';
import {
  Webhook,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Code2,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../services/api.js';
import { PaymentLink, WebhookLog } from '../types/index.js';

export const WebhooksPage: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulator states
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [simulatedStatus, setSimulatedStatus] = useState('success');
  const [tamperedSignature, setTamperedSignature] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, linksRes] = await Promise.all([api.getWebhookLogs(), api.getPaymentLinks()]);
      if (logsRes.success) setLogs(logsRes.logs);
      if (linksRes.success) {
        setLinks(linksRes.links);
        if (!selectedLinkId && linksRes.links.length > 0) {
          setSelectedLinkId(linksRes.links[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulate = async () => {
    if (!selectedLinkId) return;
    setSimulating(true);
    setSimulationResult(null);

    try {
      const res = await api.simulateWebhook({
        paymentLinkId: selectedLinkId,
        simulatedStatus,
        tamperedSignature,
      });

      if (res.success) {
        setSimulationResult(res.simulationResult);
        fetchData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Webhooks &amp; Callback Simulator</h1>
          <p className="text-xs text-slate-500">
            Dedicated endpoint at <span className="font-mono text-teal-600 font-bold">/webhooks/eaglepay</span> with
            constant-time MD5 signature validation &amp; idempotent processing
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition w-fit"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Simulator Section */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Play size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Interactive Webhook Delivery Simulator</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            TEST HARNESS
          </span>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Simulate external Eagle Pay HTTP POST callback delivery. Automatically generates an authentic MD5 signature
          over the parameters using the configured account secret key, exercises the callback verification service,
          records the audit log, and tests idempotency protections.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Select Payment Link
            </label>
            <select
              value={selectedLinkId}
              onChange={(e) => setSelectedLinkId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-teal-500"
            >
              {links.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.token} (₹{l.amountFormatted}) - {l.merchantOrderNo} [{l.status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Simulated Status Event
            </label>
            <select
              value={simulatedStatus}
              onChange={(e) => setSimulatedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-teal-500"
            >
              <option value="success">success (Mark as Paid)</option>
              <option value="pending">pending (Processing)</option>
              <option value="failed">failed (Transaction Failed)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Security Test Options
            </label>
            <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={tamperedSignature}
                onChange={(e) => setTamperedSignature(e.target.checked)}
                className="rounded text-rose-500 focus:ring-rose-500"
              />
              <span className="text-xs font-semibold text-rose-300">
                Tamper Signature (Test Rejection)
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition"
          >
            <Play size={14} className={simulating ? 'animate-spin' : ''} />
            <span>{simulating ? 'Executing Verification...' : 'Send Simulated Callback'}</span>
          </button>
        </div>

        {/* Simulation Output Banner */}
        {simulationResult && (
          <div className="mt-5 p-4 rounded-xl bg-slate-800/80 border border-slate-700 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <span className="text-slate-400 font-bold">Simulator Output</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  simulationResult.httpCode === 200
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                HTTP {simulationResult.httpCode} • ACK: "{simulationResult.responseBody}"
              </span>
            </div>

            <div className="text-slate-300">
              Processing Status:{' '}
              <span className="font-bold text-white">{simulationResult.status}</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Raw Signed String:{' '}
              <span className="text-slate-300 break-all">{simulationResult.rawString}</span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Computed MD5 Signature:{' '}
              <span className="text-teal-400 font-bold">{simulationResult.generatedSign}</span>
            </div>
          </div>
        )}
      </div>

      {/* Webhook Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Audit-Grade Webhook Ingestion Log</h3>
          <span className="text-xs text-slate-500">{logs.length} logged events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Merchant Order</th>
                <th className="py-3 px-4">Signature Check</th>
                <th className="py-3 px-4">Result &amp; Idempotency</th>
                <th className="py-3 px-4">HTTP Ack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No webhooks received yet. Use the simulator above to test callback ingestion.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {log.merchantOrderNo || 'N/A'}
                    </td>

                    <td className="py-3 px-4">
                      {log.isSignatureValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                          <ShieldCheck size={11} />
                          VALID SIGNATURE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-200">
                          <ShieldAlert size={11} />
                          SIGNATURE MISMATCH
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 font-mono text-[11px]">
                        {log.processingStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        HTTP {log.httpStatusCode} ("{log.responseSent}")
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
