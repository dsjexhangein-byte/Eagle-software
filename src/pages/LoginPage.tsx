import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { api, setAuthToken } from '../services/api.js';
import { AdminUser } from '../types/index.js';

interface LoginPageProps {
  onSuccess: (user: AdminUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@Password2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(username, password);
      if (res.success && res.token && res.user) {
        setAuthToken(res.token);
        onSuccess(res.user);
      } else {
        setError(res.error || 'Authentication failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 antialiased">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-xl mx-auto">
            EP
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            EaglePay Operations Portal
          </h1>
          <p className="text-xs text-slate-400">
            Multi-Brand Payment Links, Eagle Pay Orchestration &amp; cPanel Deployment
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-950/60 border border-teal-800/60 text-teal-300 text-xs">
            <ShieldCheck size={16} className="text-teal-400 shrink-0" />
            <span>PBKDF2 SHA-512 Password Verification Active</span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-teal-500 font-medium"
                  placeholder="admin or admin@platform.local"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-teal-500 font-medium"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400 space-y-0.5">
              <div className="font-semibold text-slate-300">Initial Super Admin Credentials:</div>
              <div>Username: <strong className="text-teal-400 font-mono">admin</strong></div>
              <div>Password: <strong className="text-teal-400 font-mono">Admin@Password2026!</strong></div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Panel</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-[11px] text-slate-500">
          EaglePay Platform • Protected by brute-force rate limiting &amp; session token invalidation
        </div>
      </div>
    </div>
  );
};
