import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageSquare,
  Sparkles,
  Smartphone,
  ExternalLink,
  Edit3,
  RotateCcw,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api.js';
import { NoticeTemplate, PaymentLink } from '../types/index.js';

interface ShareNoticeModalProps {
  link: PaymentLink;
  onClose: () => void;
  onNavigateToSettings?: () => void;
}

export const ShareNoticeModal: React.FC<ShareNoticeModalProps> = ({
  link,
  onClose,
  onNavigateToSettings,
}) => {
  const [templates, setTemplates] = useState<NoticeTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [renderedMessage, setRenderedMessage] = useState<string>('');
  const [editableMessage, setEditableMessage] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedLinkOnly, setCopiedLinkOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load templates and render initial content
  useEffect(() => {
    let isMounted = true;

    async function loadTemplatesAndRender() {
      try {
        setLoading(true);
        const res = await api.getNoticeTemplates();
        if (res.success && res.templates && res.templates.length > 0) {
          if (isMounted) {
            setTemplates(res.templates);
            const defaultTpl = res.templates.find((t: NoticeTemplate) => t.isDefault) || res.templates[0];
            setSelectedTemplateId(defaultTpl.id);
            await renderContent(defaultTpl.id, defaultTpl.content);
          }
        } else {
          // Fallback if no templates returned
          const fallbackContent = generateFallbackNotice(link);
          if (isMounted) {
            setRenderedMessage(fallbackContent);
            setEditableMessage(fallbackContent);
          }
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
        const fallbackContent = generateFallbackNotice(link);
        if (isMounted) {
          setRenderedMessage(fallbackContent);
          setEditableMessage(fallbackContent);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTemplatesAndRender();

    return () => {
      isMounted = false;
    };
  }, [link]);

  const generateFallbackNotice = (l: PaymentLink): string => {
    const fullUrl = window.location.origin + (l.publicUrl || `/${l.brandSlug || 'pay'}/${l.token}`);
    const custName = l.customerName || 'Valued Customer';
    const amount = l.amountFormatted || String(l.amount);
    const brand = l.brandName || 'Financial Services';
    const loanOrder = (l as any).loanOrderNumber || l.merchantOrderNo || 'N/A';
    const pan = (l as any).panNumber || 'DOJPC3710R';

    return `${custName},

To stop the field agents and clear your record, pay your ONE-TIME SETTLEMENT of INR ${amount}/- immediately using this link:
👉 ${fullUrl}

Your ${brand} account (Order NO: ${loanOrder}) is severely overdue. We have approved a final settlement amount of INR ${amount}/- for today only.

If this settlement is not cleared in the next 1 hour, the offer will be cancelled and the following actions will begin:

CIBIL Defaulter Entry: Your PAN (${pan}) and registered details will be permanently reported as a defaulter, blocking your access to any future loans or credit cards.
Field Recovery Visit: Our collection agents will be dispatched directly to your registered home address for physical cash collection of the full original penalty amount.

Clear your settlement dues right now to permanently close this account and receive your NOC.

Recovery Department
${brand} Financial Services`;
  };

  const renderContent = async (templateId: string, rawContent?: string) => {
    try {
      const res = await api.renderNoticeTemplate({
        templateId,
        paymentLinkId: link.id,
      });

      if (res.success && res.renderedText) {
        setRenderedMessage(res.renderedText);
        setEditableMessage(res.renderedText);
      } else {
        // Fallback local substitution
        const fullUrl = window.location.origin + (link.publicUrl || `/${link.brandSlug || 'pay'}/${link.token}`);
        const tpl = templates.find((t) => t.id === templateId);
        const text = (rawContent || tpl?.content || '')
          .replaceAll('{{customer.name}}', link.customerName || 'Valued Customer')
          .replaceAll('{{payment.amount}}', link.amountFormatted || String(link.amount))
          .replaceAll('{{payment.link}}', fullUrl)
          .replaceAll('{{payment.url}}', fullUrl)
          .replaceAll('{{brand.name}}', link.brandName || 'Financial Services')
          .replaceAll('{{payment.loan_order_number}}', (link as any).loanOrderNumber || link.merchantOrderNo)
          .replaceAll('{{customer.pan}}', (link as any).panNumber || 'DOJPC3710R')
          .replaceAll('{{payment.repayment_date}}', (link as any).repaymentDate || 'Today')
          .replaceAll('{{customer.masked_mobile}}', link.customerMobile || 'XXXXX');

        setRenderedMessage(text);
        setEditableMessage(text);
      }
    } catch (err) {
      console.error(err);
      const fallback = generateFallbackNotice(link);
      setRenderedMessage(fallback);
      setEditableMessage(fallback);
    }
  };

  const handleTemplateChange = async (newId: string) => {
    setSelectedTemplateId(newId);
    setIsEditing(false);
    await renderContent(newId);
  };

  const handleCopyReadyMessage = () => {
    const textToCopy = isEditing ? editableMessage : renderedMessage;
    navigator.clipboard.writeText(textToCopy);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2200);
  };

  const handleCopyLinkOnly = () => {
    const fullUrl = window.location.origin + (link.publicUrl || `/${link.brandSlug || 'pay'}/${link.token}`);
    navigator.clipboard.writeText(fullUrl);
    setCopiedLinkOnly(true);
    setTimeout(() => setCopiedLinkOnly(false), 2200);
  };

  const handleShareWhatsApp = () => {
    const textToSend = isEditing ? editableMessage : renderedMessage;
    const phone = (link.customerMobile || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textToSend)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank');
  };

  const handleShareSMS = () => {
    const textToSend = isEditing ? editableMessage : renderedMessage;
    const phone = (link.customerMobile || '').replace(/[^0-9]/g, '');
    window.open(`sms:${phone}?body=${encodeURIComponent(textToSend)}`, '_blank');
  };

  const fullPaymentUrl = window.location.origin + (link.publicUrl || `/${link.brandSlug || 'pay'}/${link.token}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <MessageSquare size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Ready-To-Share Recovery Notice</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  AUTO-FILLED
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Customer data, settlement amount & payment link inserted automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Customer & Token Context Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-400 text-[11px] block">Customer:</span>
              <span className="font-bold text-slate-800">{link.customerName || 'N/A'}</span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <span className="text-slate-400 text-[11px] block">Settlement Amount:</span>
              <span className="font-extrabold text-emerald-700">₹{link.amountFormatted}</span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <span className="text-slate-400 text-[11px] block">Brand Portal:</span>
              <span className="font-semibold text-slate-700">{link.brandName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLinkOnly}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition shadow-2xs"
            >
              {copiedLinkOnly ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>Copy Link Only</span>
            </button>
            <a
              href={fullPaymentUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              title="Open checkout link"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Template Selector & Edit Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-slate-700 shrink-0">Template:</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} {tpl.isDefault ? '★ (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isEditing
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Edit3 size={13} />
                <span>{isEditing ? 'Preview Mode' : 'Edit Before Copy'}</span>
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => setEditableMessage(renderedMessage)}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  title="Reset edits to original template"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Message Box */}
          <div className="relative">
            {isEditing ? (
              <textarea
                value={editableMessage}
                onChange={(e) => setEditableMessage(e.target.value)}
                rows={11}
                className="w-full p-4 rounded-2xl bg-white border-2 border-teal-500/50 font-mono text-xs text-slate-800 focus:outline-hidden leading-relaxed shadow-xs"
                placeholder="Type message here..."
              />
            ) : (
              <div className="p-4.5 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-100 leading-relaxed whitespace-pre-wrap select-all shadow-inner relative max-h-[340px] overflow-y-auto">
                {renderedMessage}
              </div>
            )}

            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {isEditing ? 'Editing message copy directly' : 'Click "Copy Ready Message" below to paste into WhatsApp/SMS'}
              </span>
              <span>{(isEditing ? editableMessage : renderedMessage).length} characters</span>
            </div>
          </div>

          {/* Quick Notice Features Tip */}
          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-start gap-3 text-xs text-teal-900">
            <Sparkles size={16} className="text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">One-Click Dispatch:</span>
              <p className="text-teal-800 text-[11px] leading-relaxed">
                Customer name <span className="font-semibold underline">"{link.customerName}"</span>, loan order number, PAN, and their unique payment link are already inserted into the message. You can customize notice templates anytime from Admin Settings.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToSettings();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 text-xs font-semibold transition"
              >
                <Sliders size={14} />
                <span>Customize Templates in Settings</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
              title="Open WhatsApp with pre-filled message"
            >
              <Share2 size={14} />
              <span>Send WhatsApp</span>
            </button>

            {/* SMS */}
            <button
              type="button"
              onClick={handleShareSMS}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition"
              title="Open default SMS app"
            >
              <Smartphone size={14} />
              <span>SMS</span>
            </button>

            {/* Primary Copy Button */}
            <button
              type="button"
              onClick={handleCopyReadyMessage}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition ${
                copiedMessage
                  ? 'bg-emerald-600 text-white'
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {copiedMessage ? <Check size={15} /> : <Copy size={15} />}
              <span>{copiedMessage ? 'Copied to Clipboard!' : 'Copy Ready Message'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
