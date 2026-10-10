import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Edit2,
  X,
  Lock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { GatewayAccount } from '../types/index.js';

export const GatewayAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<GatewayAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  // Edit / Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GatewayAccount | null>(null);

  const [name, setName] = useState('');
  const [adapter, setAdapter] = useState('eaglepay');
  const [mchId, setMchId] = useState('');
  const [mchKey, setMchKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1');
  const [isSandbox, setIsSandbox] = useState(false);
  const [tradeType, setTradeType] = useState('INRUPI');
  const [notifyUrl, setNotifyUrl] = useState('https://example.com/webhooks/eaglepay');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.getGatewayAccounts();
      if (res.success) {
        setAccounts(res.accounts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName('');
    setAdapter('eaglepay');
    setMchId('');
    setMchKey('');
    setBaseUrl('https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1');
    setIsSandbox(false);
    setTradeType('INRUPI');
    setNotifyUrl('https://example.com/webhooks/eaglepay');
    setSaveError(null);
    setModalOpen(true);
  };

  const openEditModal = (acc: GatewayAccount) => {
    setEditingAccount(acc);
    setName(acc.name);
    setAdapter(acc.adapter);
    setMchId(acc.mchId);
    setMchKey(acc.mchKeyMasked || '');
    setBaseUrl(acc.baseUrl);
    setIsSandbox(acc.isSandbox);
    setTradeType(acc.tradeType);
    setNotifyUrl(acc.notifyUrl);
    setSaveError(null);
    setModalOpen(true);
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.testGatewayAccount(id);
      setTestResult({
        id,
        success: res.success,
        msg: res.message || 'API connection verified.',
      });
      fetchAccounts();
    } catch (err: unknown) {
      setTestResult({
        id,
        success: false,
        msg: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      if (editingAccount) {
        await api.updateGatewayAccount(editingAccount.id, {
          name,
          mchId,
          mchKey,
          baseUrl,
          isSandbox,
          tradeType,
          notifyUrl,
        });
      } else {
        await api.createGatewayAccount({
          name,
          adapter,
          mchId,
          mchKey,
          baseUrl,
          isSandbox,
          tradeType,
          notifyUrl,
        });
      }
      setModalOpen(false);
      fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payment Gateway Accounts</h1>
          <p className="text-xs text-slate-500">
            Configure merchant IDs, encrypted signing keys, endpoints, and adapter routing
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition w-fit"
        >
          <Plus size={15} />
          <span>Add Gateway Account</span>
        </button>
      </div>

      {/* Info Card on Eagle Pay Contract */}
      <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-white text-sm">Eagle Pay Standard Integration Contract</h3>
            <p className="text-slate-300">
              Eagle Pay requires <span className="font-mono text-teal-300">mchId</span>,{' '}
              <span className="font-mono text-teal-300">mchOrderNo</span>, and uppercase MD5 signature computed over
              ASCII-sorted nonempty parameters appended with <span className="font-mono text-teal-300">&amp;key=mchKey</span>.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] text-slate-400">
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">POST /payin</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">POST /check-order-status</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Currency: INR</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Default TradeType: INRUPI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gateway Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      acc.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                    }`}
                  ></span>
                  <h3 className="font-bold text-sm text-slate-900">{acc.name}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {acc.isSandbox ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                      SANDBOX SIMULATOR
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                      LIVE PRODUCTION
                    </span>
                  )}
                  <button
                    onClick={() => openEditModal(acc)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                    title="Edit Credentials"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>

              <div className="mt-4 bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-100 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Adapter:</span>
                  <span className="font-bold text-slate-800">{acc.adapter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Merchant ID:</span>
                  <span className="font-bold text-slate-800">{acc.mchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Secret Key:</span>
                  <span className="text-slate-600 flex items-center gap-1">
                    <Lock size={11} className="text-teal-600" />
                    <span>{acc.mchKeyMasked || '••••••••'}</span>
                  </span>
                </div>
                <div className="flex justify-between truncate">
                  <span className="text-slate-400">Endpoint:</span>
                  <span className="text-slate-600 truncate max-w-[200px]" title={acc.baseUrl}>
                    {acc.baseUrl}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trade Type:</span>
                  <span className="text-slate-700 font-bold">{acc.tradeType}</span>
                </div>
              </div>
            </div>

            <div>
              {testResult && testResult.id === acc.id && (
                <div
                  className={`p-2.5 mb-3 rounded-lg text-xs font-medium ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.msg}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  {acc.lastTestedAt
                    ? `Tested: ${new Date(acc.lastTestedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}`
                    : 'Not tested yet'}
                </span>

                <button
                  onClick={() => handleTestConnection(acc.id)}
                  disabled={testingId === acc.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
                >
                  <Play size={12} className={testingId === acc.id ? 'animate-spin' : ''} />
                  <span>{testingId === acc.id ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edit / Create */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {editingAccount ? 'Edit Gateway Account' : 'Add Gateway Account'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Credentials are safely stored and never leaked to browser</p>

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-rose-500" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eagle Pay Primary Live"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gateway Adapter</label>
                  <select
                    value={adapter}
                    onChange={(e) => setAdapter(e.target.value)}
                    disabled={!!editingAccount}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-teal-500"
                  >
                    <option value="eaglepay">Eagle Pay</option>
                    <option value="mock">Sandbox Simulator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Environment Mode</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSandbox}
                      onChange={(e) => setIsSandbox(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">Sandbox / Test Mode</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant ID (mchId) *</label>
                  <input
                    type="text"
                    required
                    placeholder="MCH100..."
                    value={mchId}
                    onChange={(e) => setMchId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Secret Key (mchKey) *</label>
                  <input
                    type="password"
                    required={!editingAccount}
                    placeholder={editingAccount ? 'Leave unchanged to keep existing' : 'Secret signing key'}
                    value={mchKey}
                    onChange={(e) => setMchKey(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">API Base URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://xgxbscfgfhtiizzxipog.supabase.co/functions/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Type</label>
                  <input
                    type="text"
                    value={tradeType}
                    onChange={(e) => setTradeType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Callback Notify URL</label>
                  <input
                    type="url"
                    value={notifyUrl}
                    onChange={(e) => setNotifyUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Gateway Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
