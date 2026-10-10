import React from 'react';
import {
  Server,
  Download,
  CheckCircle2,
  Database,
  Clock,
  ShieldCheck,
  FileCode,
  FolderTree,
  Terminal,
  ExternalLink,
} from 'lucide-react';

export const CpanelDeploymentPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">cPanel Production Deployment Hub</h1>
          <p className="text-xs text-slate-500">
            Export the complete standalone PHP 8.2 + MySQL production bundle for shared cPanel hosting
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/system/download-installer-sh"
            download="install.sh"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-800 text-xs font-bold shadow-xs transition"
          >
            <Terminal size={14} className="text-amber-600" />
            <span>Download install.sh (1-Click)</span>
          </a>

          <a
            href="/api/system/download-schema-sql"
            download="schema.sql"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            <Database size={14} className="text-teal-600" />
            <span>Download schema.sql</span>
          </a>

          <a
            href="/api/system/download-cpanel-bundle"
            download="eaglepay-cpanel-production-package.zip"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition"
          >
            <Download size={15} />
            <span>Download Full ZIP</span>
          </a>
        </div>
      </div>

      {/* 1-Click CodeCanyon Web Installer Feature Box */}
      <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-teal-500/30 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Server size={22} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>CodeCanyon-Style 1-Click Web Installer (Browser URL)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  RECOMMENDED
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Zip upload karke direct <span className="font-mono text-teal-300 font-semibold">https://yourdomain.com/install</span> open karein. Server requirements aur MySQL tables automatically check aur connect ho jayenge!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText('/install');
                alert('Installer path copied: /install');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition"
            >
              <FileCode size={13} />
              <span>Copy "/install"</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 font-mono text-xs text-teal-300 space-y-2">
          <div className="text-slate-400 text-[11px]"># Web Installation URL:</div>
          <div className="text-sm font-bold text-white selection:bg-teal-500">
            https://vardanloan.eu.cc/install
          </div>
          <div className="text-slate-400 text-[11px] pt-1">
            ✓ Auto-detects PHP version, PDO MySQL, cURL, OpenSSL &amp; permissions with Green/Red indicators<br />
            ✓ Prompts for MySQL Database Name, User, Password &amp; Admin login<br />
            ✓ Auto-runs full schema.sql and creates Super Admin (admin / admin123)<br />
            ✓ Instantly unlocks and launches React SPA Dashboard at root URL (/)
          </div>
        </div>
      </div>

      {/* 1-Click Automated Terminal Setup */}
      <div className="bg-gradient-to-br from-amber-950/90 via-slate-900 to-slate-950 p-6 rounded-3xl border border-amber-500/30 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Terminal size={22} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Alternative: 1-Click Terminal Setup</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  CLI
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Upload files to public_html and run this single command in cPanel Terminal to auto-configure everything
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText('bash install.sh');
                alert('Command copied to clipboard: bash install.sh');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition"
            >
              <FileCode size={13} />
              <span>Copy "bash install.sh"</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 font-mono text-xs text-amber-300 space-y-2">
          <div className="text-slate-400 text-[11px]"># In your cPanel Terminal or SSH:</div>
          <div className="text-sm font-bold text-white selection:bg-teal-500">
            $ bash install.sh
          </div>
        </div>
      </div>

      {/* Target Stack Verification Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div className="space-y-2 max-w-2xl">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Zero External Runtime Dependencies
            </span>
            <h2 className="text-lg font-bold">Genuine PHP 8.2 &amp; MySQL cPanel Stack</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              This package does not require permanent Node.js processes, Docker, Redis, or cloud daemons on your shared host.
              It uses pure PHP 8.2 PDO, Apache mod_rewrite, standard cURL, and native MySQL tables with foreign keys and decimal
              precision.
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1.5 font-mono text-[11px] text-teal-400">
            <span>PHP 8.2+ Certified</span>
            <span>MySQL 5.7+ / 8.0+</span>
            <span>Apache .htaccess Routing</span>
          </div>
        </div>
      </div>

      {/* Step by Step Deployment Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1 & 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create MySQL Database in cPanel</h3>
              <p className="text-xs text-slate-500">Database &amp; Privileged User Setup</p>
            </div>
          </div>

          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
            <li>Log into your shared hosting cPanel dashboard.</li>
            <li>Under the <strong>Databases</strong> section, click <strong>MySQL Databases</strong>.</li>
            <li>Create a new database (e.g. <span className="font-mono font-semibold">youruser_eaglepay</span>).</li>
            <li>Create a MySQL user with a strong 20+ character random password.</li>
            <li>Assign the user to the database and check <strong>ALL PRIVILEGES</strong>.</li>
          </ol>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import schema.sql via phpMyAdmin</h3>
              <p className="text-xs text-slate-500">Creates normalized tables and indexes</p>
            </div>
          </div>

          <ol className="list-decimal list-inside text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
            <li>Click <strong>phpMyAdmin</strong> from cPanel.</li>
            <li>Select your newly created database on the left sidebar.</li>
            <li>Click the <strong>Import</strong> tab at the top.</li>
            <li>Click <strong>Choose File</strong> and select the downloaded <span className="font-mono font-semibold">schema.sql</span>.</li>
            <li>Click <strong>Go</strong> to execute table creation.</li>
          </ol>
        </div>

        {/* Step 3 & 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Files &amp; Web Root Structure</h3>
              <p className="text-xs text-slate-500">File Manager or FTP Upload</p>
            </div>
          </div>

          <div className="text-xs text-slate-700 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-[11px]">
            <p className="font-sans text-xs mb-2">Recommended Directory Structure:</p>
            <div className="text-slate-500">/home/username/public_html/</div>
            <div className="pl-4 text-slate-800">├── index.php (Front controller)</div>
            <div className="pl-4 text-slate-800">├── .htaccess (Apache rewrites)</div>
            <div className="pl-4 text-slate-800">├── config/config.php (DB credentials)</div>
            <div className="pl-4 text-slate-800">├── src/ (Gateways &amp; Services)</div>
            <div className="pl-4 text-slate-800">└── cron/reconcile.php (CLI Cron)</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configure cPanel Cron Reconciliation</h3>
              <p className="text-xs text-slate-500">Scheduled status check for pending orders</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Navigate to <strong>cPanel &gt; Cron Jobs</strong>, choose <strong>Once Every 15 Minutes</strong> (<code>*/15 * * * *</code>),
              and enter:
            </p>
            <div className="p-3 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
              /usr/local/bin/php -q /home/username/public_html/cron/reconcile.php &gt;&gt; /home/username/cron.log 2&gt;&amp;1
            </div>
          </div>
        </div>
      </div>

      {/* Production Security & Verification Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-teal-600" />
          <span>Production Security Checklist Before Accepting Real Payments</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            'Active HTTPS/SSL Certificate verified on your domain (cPanel AutoSSL or Let\'s Encrypt)',
            'mchId and mchKey set up accurately in gateway_accounts table',
            'Webhook URL (https://yourdomain.com/webhooks/eaglepay) registered with Eagle Pay portal',
            'Apache .htaccess verified to block direct access to .env and sensitive subfolders',
            'DB_PASS in config.php uses high entropy password',
            'cPanel Cron Job tested by running "/usr/local/bin/php cron/reconcile.php" once in Terminal',
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
              <span className="text-slate-700 leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
