import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Download, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  amount: string;
  token: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  amount,
  token,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const fullUrl = window.location.origin + url;

  useEffect(() => {
    if (isOpen && fullUrl) {
      QRCode.toDataURL(fullUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [isOpen, fullUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRCode-${token}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-4">
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            Payment QR Code
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-2">{title}</h3>
          <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">₹{amount}</p>
          <p className="text-xs text-slate-500 font-mono">Token: {token}</p>
        </div>

        <div className="flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-100 my-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Payment QR" className="w-56 h-56 rounded-lg shadow-sm" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">
              Generating QR...
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 truncate">
            <span className="truncate flex-1">{fullUrl}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? 'Copied Link' : 'Copy Link'}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition shadow-sm"
            >
              <Download size={14} />
              Save Image
            </button>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-emerald-700 hover:text-emerald-800 transition"
          >
            <span>Open Public Checkout Page</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
