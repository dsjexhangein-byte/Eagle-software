import React, { useEffect, useState } from 'react';
import {
  Palette,
  Plus,
  Code2,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  Save,
  RefreshCw,
  Sparkles,
  Sliders,
  HelpCircle,
  X,
  Smartphone,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Brand } from '../types/index.js';

// Preset 1: Clean loan card matching user screenshot
const KARYALOAN_PRESET = `<div class="karya-checkout-container max-w-md mx-auto space-y-3 font-sans">
  <!-- Top Rounded Header Card with Brand Gradient -->
  <div class="rounded-3xl shadow-lg overflow-hidden border border-slate-100 bg-white">
    <!-- Curved Header -->
    <div class="px-6 py-5 text-white text-center rounded-t-3xl" style="background: linear-gradient(135deg, {{brand.primary_color}}, {{brand.secondary_color}});">
      <div class="inline-flex items-center justify-center gap-2 mb-1 bg-white/10 px-3 py-1 rounded-2xl backdrop-blur-sm">
        <span class="text-xl font-bold tracking-tight text-white">{{brand.name}}</span>
      </div>
      <div class="text-xs text-white/90 font-medium">Mobile Number: <span class="font-mono">{{customer.masked_mobile}}</span></div>
    </div>

    <!-- Amounts and Due Date Row -->
    <div class="p-5">
      <div class="grid grid-cols-2 gap-4 pb-4">
        <div>
          <span class="text-[11px] font-semibold text-slate-400">Total Payable Amount</span>
          <div class="text-2xl font-extrabold font-mono mt-1" style="color: {{brand.primary_color}};">
            ₹ {{payment.amount}}
          </div>
        </div>
        <div class="border-l border-slate-100 pl-4">
          <span class="text-[11px] font-semibold text-slate-400">Repayment Date</span>
          <div class="text-xl font-bold font-mono text-slate-800 mt-1">
            {{payment.repayment_date}}
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
        <div class="text-xs text-slate-500">
          Order NO. <span class="font-mono font-medium text-slate-700 ml-1">{{payment.loan_order_number}}</span>
        </div>
        <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
          {{payment.status}}
        </span>
      </div>
    </div>
  </div>

  <!-- Second Card: KYC & Loan Details -->
  <div class="bg-white rounded-3xl shadow-lg border border-slate-100 p-5 space-y-3.5">
    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 pb-1">KYC &amp; Loan Details</h3>

    <div class="space-y-2.5 text-xs">
      <div class="flex items-center justify-between">
        <span class="text-slate-500 font-medium">Customer Name</span>
        <span class="font-bold text-slate-900 uppercase">{{customer.name}}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-slate-500 font-medium">PAN Number</span>
        <span class="font-mono font-bold text-slate-900">{{customer.pan}}</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-slate-500 font-medium">Bank Account</span>
        <span class="font-medium text-slate-900 font-mono text-right text-[11px]">{{customer.bank_account}}</span>
      </div>
    </div>

    <div class="pt-3 border-t border-dashed border-slate-200 space-y-2 text-xs">
      <div class="flex items-center justify-between text-slate-700">
        <span class="font-medium">{{brand.name}} ({{payment.loan_order_number}})</span>
        <span class="font-mono font-bold">₹ {{payment.amount}}</span>
      </div>
    </div>

    <div class="pt-3 border-t border-slate-200 space-y-2 text-xs">
      <div class="flex items-center justify-between">
        <span class="font-bold text-slate-900">Total Payable</span>
        <span class="text-sm font-extrabold font-mono" style="color: {{brand.primary_color}};">₹ {{payment.amount}}</span>
      </div>

      <div class="flex items-center justify-between text-slate-500">
        <span>Executive Name</span>
        <span class="font-medium text-slate-800">{{customer.executive_name}}</span>
      </div>
    </div>

    <p class="text-[10px] text-slate-400 text-center pt-2 leading-relaxed">
      I have read and agreed to {{brand.name}}'s <span class="underline" style="color: {{brand.primary_color}};">Sanction Letter</span> and <span class="underline" style="color: {{brand.primary_color}};">Loan Service Contract</span>.
    </p>
  </div>
</div>`;

// Preset 2: Template with Embedded Dynamic Pay Button
const EMBEDDED_BUTTON_PRESET = `<div class="max-w-md mx-auto space-y-3 font-sans">
  <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
    <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, {{brand.primary_color}}, {{brand.secondary_color}});">
      <div class="inline-flex items-center gap-2 mb-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
        <span class="text-lg font-bold">{{brand.name}}</span>
      </div>
      <div class="text-xs uppercase tracking-widest text-white/80">Direct Repayment Portal</div>
      <div class="text-3xl font-black mt-2 font-mono">₹ {{payment.amount}}</div>
    </div>

    <div class="p-6 space-y-4">
      <div class="bg-slate-50 rounded-2xl p-4 text-xs space-y-2.5 border border-slate-100">
        <div class="flex justify-between text-slate-600"><span>Customer:</span><strong class="text-slate-900 uppercase">{{customer.name}}</strong></div>
        <div class="flex justify-between text-slate-600"><span>Contact:</span><span class="font-mono">{{customer.masked_mobile}}</span></div>
        <div class="flex justify-between text-slate-600"><span>Loan Order Ref:</span><span class="font-mono font-bold">{{payment.loan_order_number}}</span></div>
        <div class="flex justify-between text-slate-600"><span>Repayment Date:</span><span>{{payment.repayment_date}}</span></div>
      </div>

      <!-- Embedded Payment Button Variable -->
      <div class="pt-2">
        {{payment.button}}
      </div>
    </div>
  </div>
</div>`;

// Preset 3: Minimal Voucher Card
const MINIMAL_PRESET = `<div class="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 font-sans">
  <div class="p-6 text-white text-center" style="background: linear-gradient(135deg, {{brand.primary_color}}, {{brand.secondary_color}});">
    <div class="text-2xl font-black mb-1">{{brand.name}}</div>
    <div class="text-xs uppercase tracking-widest text-white/80">Repayment Voucher</div>
  </div>
  <div class="p-6 space-y-4">
    <div class="text-center pb-4 border-b border-slate-100">
      <div class="text-xs uppercase font-bold text-slate-400">Total Payable Amount</div>
      <div class="text-4xl font-black mt-1 font-mono" style="color: {{brand.primary_color}};">₹ {{payment.amount}}</div>
      <div class="text-xs text-slate-500 mt-1">Ref: <span class="font-mono">{{payment.loan_order_number}}</span></div>
    </div>
    <div class="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 border border-slate-100">
      <div class="flex justify-between"><span>Customer:</span><strong class="text-slate-900 uppercase">{{customer.name}}</strong></div>
      <div class="flex justify-between"><span>Mobile:</span><span class="font-mono">{{customer.masked_mobile}}</span></div>
      <div class="flex justify-between"><span>Due Date:</span><span>{{payment.repayment_date}}</span></div>
      <div class="flex justify-between"><span>Status:</span><span class="text-blue-600 font-bold">{{payment.status}}</span></div>
    </div>
  </div>
</div>`;

// Master Prompt template that the user can pass to any AI with their screenshot
const MASTER_AI_PROMPT = `I am building a customized customer checkout / loan repayment card for my payment platform.
Here is an image/screenshot of the exact card design I want to reproduce.

Please generate the HTML and Tailwind CSS code matching the design in this screenshot as closely as possible.

CRITICAL REQUIREMENTS:
1. Output ONLY the raw HTML code inside a single code block (no <html> or <body> tags, no markdown commentary, no explanations).
2. Use Tailwind CSS classes for all styling, colors, gradients, rounded corners, padding, and layout.
3. The root container MUST have classes: "max-w-md mx-auto space-y-3 font-sans".
4. You MUST use the following exact handlebars placeholders for all dynamic data fields shown in the screenshot:
   - {{payment.amount}} : Total payable / repayment amount (e.g. 5,000.00)
   - {{payment.repayment_date}} : Due date or repayment date
   - {{payment.loan_order_number}} : Order or Loan reference number
   - {{payment.status}} : Status badge text (e.g. CREATED, PENDING)
   - {{customer.name}} : Customer full name
   - {{customer.masked_mobile}} : Masked phone number (e.g. 98****3210)
   - {{customer.pan}} : Customer PAN number
   - {{customer.bank_account}} : Customer Bank account or UPI ID
   - {{customer.executive_name}} : Loan officer or executive name
   - {{brand.name}} : Brand / Company name
   - {{brand.logo}} : Brand logo image URL
   - {{brand.primary_color}} : Primary brand gradient hex (used in styles)
   - {{brand.secondary_color}} : Secondary brand gradient hex
   - {{payment.button}} : Optional embedded dynamic Pay Now button (or standard button with onclick="window.__initiatePay && window.__initiatePay()")

Please analyze the attached screenshot and produce the exact HTML card now.`;

const COMMON_TAGS = [
  { tag: '{{payment.amount}}', label: 'Amount' },
  { tag: '{{payment.repayment_date}}', label: 'Due Date' },
  { tag: '{{payment.loan_order_number}}', label: 'Order No.' },
  { tag: '{{payment.status}}', label: 'Status' },
  { tag: '{{customer.name}}', label: 'Customer Name' },
  { tag: '{{customer.masked_mobile}}', label: 'Masked Mobile' },
  { tag: '{{customer.pan}}', label: 'PAN' },
  { tag: '{{customer.bank_account}}', label: 'Bank/UPI' },
  { tag: '{{customer.executive_name}}', label: 'Executive' },
  { tag: '{{brand.name}}', label: 'Brand Name' },
  { tag: '{{brand.primary_color}}', label: 'Primary Color' },
  { tag: '{{payment.button}}', label: 'Pay Button' },
];

export const BrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  // Active brand & editor states
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'settings'>('editor');

  // Brand settings form state
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandLogo, setEditBrandLogo] = useState('');
  const [editBrandPrimary, setEditBrandPrimary] = useState('#6366f1');
  const [editBrandSecondary, setEditBrandSecondary] = useState('#818cf8');
  const [editButtonColor, setEditButtonColor] = useState('#6366f1');
  const [editButtonText, setEditButtonText] = useState('PAY NOW');
  const [editSuccessTitle, setEditSuccessTitle] = useState('Payment Successful');
  const [editSuccessMsg, setEditSuccessMsg] = useState('Your payment has been received and verified successfully.');
  const [editPendingTitle, setEditPendingTitle] = useState('Payment Processing');
  const [editPendingMsg, setEditPendingMsg] = useState('Your payment is currently being verified with the banking system.');
  const [editFailedTitle, setEditFailedTitle] = useState('Payment Unsuccessful');
  const [editFailedMsg, setEditFailedMsg] = useState('Transaction could not be completed. Please try again.');
  const [editSupportEmail, setEditSupportEmail] = useState('');
  const [editSupportPhone, setEditSupportPhone] = useState('');
  const [savingBrandSettings, setSavingBrandSettings] = useState(false);

  // New Brand modal
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandSlug, setNewBrandSlug] = useState('');
  const [newBrandPrimaryColor, setNewBrandPrimaryColor] = useState('#6366f1');

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await api.getBrands();
      if (res.success) {
        setBrands(res.brands);
        if (!activeBrand && res.brands.length > 0) {
          selectBrandForTemplate(res.brands[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectBrandForTemplate = async (brand: Brand) => {
    setActiveBrand(brand);
    setStatusMessage(null);

    setEditBrandName(brand.name);
    setEditBrandLogo(brand.logoUrl || '');
    setEditBrandPrimary(brand.primaryColor || '#6366f1');
    setEditBrandSecondary(brand.secondaryColor || '#818cf8');
    setEditButtonColor(brand.buttonColor || brand.primaryColor || '#6366f1');
    setEditButtonText(brand.buttonText || 'PAY NOW');
    setEditSuccessTitle(brand.successTitle || 'Payment Successful');
    setEditSuccessMsg(brand.successMessage || 'Your payment has been received and verified successfully.');
    setEditPendingTitle(brand.pendingTitle || 'Payment Processing');
    setEditPendingMsg(brand.pendingMessage || 'Your payment is currently being verified with the banking system.');
    setEditFailedTitle(brand.failedTitle || 'Payment Unsuccessful');
    setEditFailedMsg(brand.failedMessage || 'Transaction could not be completed. Please try again.');
    setEditSupportEmail(brand.supportEmail || '');
    setEditSupportPhone(brand.supportPhone || '');

    // Immediate default preset so card is never empty
    const fallbackContent = KARYALOAN_PRESET;
    setTemplateHtml(fallbackContent);
    triggerPreview(fallbackContent, brand.id);

    try {
      const res = await api.getBrandTemplate(brand.id);
      if (res.success && res.template && res.template.htmlContent) {
        setTemplateHtml(res.template.htmlContent);
        triggerPreview(res.template.htmlContent, brand.id);
      }
    } catch (err) {
      console.error('Template load fallback:', err);
    }
  };

  const triggerPreview = async (html: string, brandId?: string) => {
    if (!html || html.trim() === '') {
      html = KARYALOAN_PRESET;
    }
    setPreviewLoading(true);
    try {
      const res = await api.previewTemplate(html, brandId || activeBrand?.id);
      if (res.success && res.html) {
        setPreviewHtml(res.html);
      } else {
        // Local render fallback if server preview fails
        setPreviewHtml(html);
      }
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewHtml(html);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleApplyPreset = (presetHtml: string) => {
    setTemplateHtml(presetHtml);
    triggerPreview(presetHtml, activeBrand?.id);
    setStatusMessage({ type: 'success', text: 'Preset loaded! Click "Save Template" to apply.' });
  };

  const handleInsertTag = (tag: string) => {
    const textarea = document.getElementById('template-textarea') as HTMLTextAreaElement | null;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = templateHtml;
      const next = current.substring(0, start) + tag + current.substring(end);
      setTemplateHtml(next);
      triggerPreview(next, activeBrand?.id);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      setTemplateHtml((prev) => prev + ' ' + tag);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(MASTER_AI_PROMPT);
    setCopiedPrompt(true);
    setStatusMessage({
      type: 'success',
      text: 'AI Master Prompt copied! Paste this prompt along with your screenshot in ChatGPT or Claude.',
    });
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleSaveTemplate = async () => {
    if (!activeBrand) return;
    setSavingTemplate(true);
    setStatusMessage(null);

    try {
      const res = await api.updateBrandTemplate(activeBrand.id, templateHtml, 'Manual update via editor');
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Template saved and published successfully!' });
        triggerPreview(templateHtml, activeBrand.id);
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to save template' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish template';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveBrandSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand) return;
    setSavingBrandSettings(true);
    setStatusMessage(null);

    try {
      const res = await api.updateBrand(activeBrand.id, {
        name: editBrandName,
        logoUrl: editBrandLogo,
        primaryColor: editBrandPrimary,
        secondaryColor: editBrandSecondary,
        buttonColor: editButtonColor,
        buttonText: editButtonText,
        successTitle: editSuccessTitle,
        successMessage: editSuccessMsg,
        pendingTitle: editPendingTitle,
        pendingMessage: editPendingMsg,
        failedTitle: editFailedTitle,
        failedMessage: editFailedMsg,
        supportEmail: editSupportEmail,
        supportPhone: editSupportPhone,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Brand settings updated successfully!' });
        fetchBrands();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setSavingBrandSettings(false);
    }
  };

  const [creatingBrand, setCreatingBrand] = useState(false);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim() || !newBrandSlug.trim()) {
      alert('Brand Name and URL Slug are required.');
      return;
    }
    setCreatingBrand(true);
    try {
      const res = await api.createBrand({
        name: newBrandName.trim(),
        slug: newBrandSlug.trim(),
        primaryColor: newBrandPrimaryColor,
        buttonText: 'PAY NOW',
      });

      if (res.success) {
        setBrandModalOpen(false);
        setNewBrandName('');
        setNewBrandSlug('');
        setStatusMessage({ type: 'success', text: `Brand "${newBrandName}" created successfully!` });
        const refreshed = await api.getBrands();
        if (refreshed.success && refreshed.brands) {
          setBrands(refreshed.brands);
          const found = refreshed.brands.find((b: Brand) => b.id === res.brand?.id || b.slug === newBrandSlug.trim());
          if (found) {
            selectBrandForTemplate(found);
          }
        }
      } else {
        alert(res.error || 'Failed to create brand.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Creation failed';
      alert(msg);
    } finally {
      setCreatingBrand(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Palette className="text-indigo-600" size={26} />
            <span>Brand &amp; Template Studio</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customize checkout screens, upload AI screenshot designs, and configure brand theme colors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Brand Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Active Brand:</span>
            <select
              value={activeBrand?.id || ''}
              onChange={(e) => {
                const b = brands.find((brand) => brand.id === e.target.value);
                if (b) selectBrandForTemplate(b);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent outline-hidden cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (/{b.slug})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setBrandModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
          >
            <Plus size={14} />
            <span>New Brand</span>
          </button>

          {/* Quick AI Prompt Button */}
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-sm transition active:scale-95"
            title="Click to copy prompt for ChatGPT / Claude with your design screenshot"
          >
            <Sparkles size={14} />
            <span>{copiedPrompt ? 'Copied Prompt!' : 'Copy AI Prompt'}</span>
          </button>

          <button
            onClick={() => setAiModalOpen(true)}
            className="p-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 transition"
            title="How to make custom design using AI screenshot"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {/* Status notification toast */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs transition ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'editor'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 size={15} />
          <span>HTML Template Editor</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders size={15} />
          <span>Brand Settings &amp; Colors</span>
        </button>
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-4">
          {/* Quick Presets Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Load Ready Preset:</span>
              <button
                onClick={() => handleApplyPreset(KARYALOAN_PRESET)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
              >
                ★ Loan Card (Photo Matching)
              </button>
              <button
                onClick={() => handleApplyPreset(EMBEDDED_BUTTON_PRESET)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Card with Pay Button
              </button>
              <button
                onClick={() => handleApplyPreset(MINIMAL_PRESET)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Minimal Repayment Slip
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerPreview(templateHtml, activeBrand?.id)}
                disabled={previewLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RefreshCw size={13} className={previewLoading ? 'animate-spin' : ''} />
                <span>Refresh Preview</span>
              </button>

              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <Save size={14} />
                <span>{savingTemplate ? 'Saving...' : 'Save Template'}</span>
              </button>
            </div>
          </div>

          {/* Variable quick-insert chips */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Tag size={12} />
                <span>Click to Insert Placeholders at Cursor:</span>
              </span>
              <span className="text-[11px] text-slate-400">All fields automatically populate per customer &amp; link</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_TAGS.map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => handleInsertTag(t.tag)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 text-xs font-mono font-medium transition shadow-2xs"
                  title={`Insert ${t.tag}`}
                >
                  {t.label} <span className="text-slate-400 text-[10px]">({t.tag})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor & Preview Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Code Editor */}
            <div className="bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-800 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span className="font-mono font-bold text-emerald-400">Template HTML (Tailwind CSS)</span>
                <span className="text-[11px] text-slate-500">Supports pure HTML &amp; standard inline styles</span>
              </div>

              <textarea
                id="template-textarea"
                value={templateHtml}
                onChange={(e) => {
                  setTemplateHtml(e.target.value);
                  triggerPreview(e.target.value, activeBrand?.id);
                }}
                rows={22}
                className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-4 rounded-2xl border border-slate-800 outline-hidden resize-none leading-relaxed focus:border-indigo-500 transition selection:bg-indigo-500 selection:text-white"
                placeholder="Paste your HTML template code here..."
                spellCheck={false}
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {templateHtml.length} characters • {templateHtml.split('\n').length} lines
                </span>
                <button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <Save size={14} />
                  <span>{savingTemplate ? 'Saving...' : 'Save & Publish Template'}</span>
                </button>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div className="bg-slate-100 rounded-3xl p-4 border border-slate-200 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-slate-500" />
                  <span>Live Card Preview ({activeBrand?.name})</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Real-time Render
                </span>
              </div>

              <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 overflow-y-auto max-h-[580px] flex items-center justify-center">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                    <RefreshCw className="animate-spin" size={24} />
                    <span className="text-xs font-semibold">Updating preview...</span>
                  </div>
                ) : previewHtml ? (
                  <div className="w-full" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <div className="text-center py-12 text-xs text-slate-400">
                    No template loaded. Click a preset above to load a card layout.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Brand Settings & Color Form */
        <form onSubmit={handleSaveBrandSettings} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Brand Identity &amp; Colors</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Set brand name, logo, primary gradient colors, and custom status text shown to customers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Brand Name</label>
              <input
                type="text"
                value={editBrandName}
                onChange={(e) => setEditBrandName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Logo Image URL</label>
              <input
                type="text"
                value={editBrandLogo}
                onChange={(e) => setEditBrandLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary Theme Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editBrandPrimary}
                  onChange={(e) => setEditBrandPrimary(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={editBrandPrimary}
                  onChange={(e) => setEditBrandPrimary(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Secondary Gradient Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editBrandSecondary}
                  onChange={(e) => setEditBrandSecondary(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={editBrandSecondary}
                  onChange={(e) => setEditBrandSecondary(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Pay Button Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editButtonColor}
                  onChange={(e) => setEditButtonColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={editButtonColor}
                  onChange={(e) => setEditButtonColor(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Pay Button Text</label>
              <input
                type="text"
                value={editButtonText}
                onChange={(e) => setEditButtonText(e.target.value)}
                placeholder="PAY NOW"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-hidden focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Customer Post-Payment Screens</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Success Screen Title</label>
                <input
                  type="text"
                  value={editSuccessTitle}
                  onChange={(e) => setEditSuccessTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Success Screen Subtitle</label>
                <input
                  type="text"
                  value={editSuccessMsg}
                  onChange={(e) => setEditSuccessMsg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Failed Screen Title</label>
                <input
                  type="text"
                  value={editFailedTitle}
                  onChange={(e) => setEditFailedTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Failed Screen Subtitle</label>
                <input
                  type="text"
                  value={editFailedMsg}
                  onChange={(e) => setEditFailedMsg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingBrandSettings}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
            >
              <Save size={14} />
              <span>{savingBrandSettings ? 'Saving...' : 'Save Brand Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* AI Master Prompt Guide Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-700 font-black">
                <Sparkles size={20} />
                <span className="text-base">Convert Any Screenshot to Template with AI</span>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">Follow these 3 simple steps to create any custom design:</p>
              <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                <li>Take a screenshot or photo of any loan card / payment UI design you want.</li>
                <li>
                  Open <strong>ChatGPT</strong>, <strong>Claude</strong>, or <strong>Gemini</strong>, attach your screenshot, and paste the Master Prompt below.
                </li>
                <li>Copy the AI's generated HTML code and paste it right into this editor, then click <strong>Save Template</strong>!</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Master Prompt (Copy &amp; Paste with Screenshot):</label>
              <textarea
                readOnly
                value={MASTER_AI_PROMPT}
                rows={11}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 outline-hidden resize-none leading-relaxed select-all"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCopyPrompt();
                  setAiModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
              >
                <Copy size={13} />
                <span>Copy Master Prompt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Brand Modal */}
      {brandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Brand</h3>
              <button onClick={() => setBrandModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBrand} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Karya Loan"
                  value={newBrandName}
                  onChange={(e) => {
                    setNewBrandName(e.target.value);
                    if (!newBrandSlug) {
                      setNewBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">URL Slug</label>
                <input
                  type="text"
                  placeholder="e.g. karyaloan"
                  value={newBrandSlug}
                  onChange={(e) => setNewBrandSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newBrandPrimaryColor}
                    onChange={(e) => setNewBrandPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={newBrandPrimaryColor}
                    onChange={(e) => setNewBrandPrimaryColor(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBrandModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBrand}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  {creatingBrand ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Creating Brand...</span>
                    </>
                  ) : (
                    <span>Create Brand</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
