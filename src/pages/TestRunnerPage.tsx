import React, { useState } from 'react';
import { TestTube2, Play, CheckCircle2, XCircle, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import { TestResultItem } from '../types/index.js';

export const TestRunnerPage: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestResultItem[];
  } | null>(null);

  const runSuite = async () => {
    setRunning(true);
    try {
      const res = await api.runTests();
      if (res.success) {
        setReport({
          total: res.total,
          passed: res.passed,
          failed: res.failed,
          results: res.results,
        });
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Test run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Automated Test Harness</h1>
          <p className="text-xs text-slate-500">
            Automated verification of signatures, token entropy, amount validations, idempotency, and XSS escaping
          </p>
        </div>

        <button
          onClick={runSuite}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition w-fit"
        >
          <Play size={14} className={running ? 'animate-spin' : ''} />
          <span>{running ? 'Executing Tests...' : 'Run Test Suite'}</span>
        </button>
      </div>

      {/* Summary KPI */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase">Total Tests</span>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">{report.total}</div>
            </div>
            <TestTube2 size={24} className="text-slate-400" />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-600 uppercase">Passed</span>
              <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">{report.passed}</div>
            </div>
            <CheckCircle2 size={24} className="text-emerald-500" />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-600 uppercase">Failed</span>
              <div className="text-2xl font-bold text-rose-600 font-mono mt-1">{report.failed}</div>
            </div>
            <XCircle size={24} className={report.failed > 0 ? 'text-rose-500' : 'text-slate-300'} />
          </div>
        </div>
      )}

      {/* Test List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Critical Test Specifications</h3>

        {!report ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <TestTube2 size={36} className="mx-auto text-slate-300" />
            <p className="text-xs">Click "Run Test Suite" to execute all automated test scenarios.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {report.results.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                  t.passed ? 'bg-slate-50/70 border-slate-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {t.passed ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold text-slate-900">{t.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-6">{t.assertion}</p>
                  {t.details && (
                    <div className="text-[11px] text-rose-700 font-mono pl-6 mt-1 bg-rose-100/60 p-2 rounded">
                      Failure Reason: {t.details}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 pl-6 md:pl-0">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock size={11} />
                    {t.durationMs}ms
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      t.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    {t.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
