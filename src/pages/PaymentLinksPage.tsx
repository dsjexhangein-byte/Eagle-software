import React, { useEffect, useState } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Search,
  Download,
  Copy,
  Check,
  QrCode,
  Share2,
  ExternalLink,
  Power,
  RefreshCw,
  X,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Brand, Customer, GatewayAccount, PaymentLink } from '../types/index.js';
import { QRCodeModal } from '../components/QRCodeModal.js';
import { ShareNoticeModal } from '../components/ShareNoticeModal.js';

export const PaymentLinksPage: React.FC = () => {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [gateways, setGateways] = useState<GatewayAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedNoticeLink, setSelectedNoticeLink] = useState<PaymentLink | null>(null);
  const [qrModalData, setQrModalData] = useState<{ url: string; title: string; amount: string; token: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  // Form states
  const [customerMode, setCustomerMode] = useState<'inline' | 'existing'>('inline');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // KYC & Loan details (matching screenshot)
  const [loanOrderNumber, setLoanOrderNumber] = useState('');
  const [repaymentDate, setRepaymentDate] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [executiveName, setExecutiveName] = useState('');

  // Link & Gateway settings
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [selectedGatewayId, setSelectedGatewayId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('72');
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [linksRes, brandsRes, custRes, gwRes] = await Promise.all([
        api.getPaymentLinks({ status: statusFilter, brandId: brandFilter, search }),
        api.getBrands(),
        api.getCustomers(),
        api.getGatewayAccounts(),
      ]);

      if (linksRes.success) setLinks(linksRes.links);
      if (brandsRes.success) {
        setBrands(brandsRes.brands);
        if (!selectedBrandId && brandsRes.brands.length > 0) {
          setSelectedBrandId(brandsRes.brands[0].id);
        }
      }
      if (custRes.success) {
        setCustomers(custRes.customers);
        if (!selectedCustomerId && custRes.customers.length > 0) {
          setSelectedCustomerId(custRes.customers[0].id);
        }
      }
      if (gwRes.success) {
        setGateways(gwRes.accounts);
        if (!selectedGatewayId && gwRes.accounts.length > 0) {
          setSelectedGatewayId(gwRes.accounts[0].id);
        }
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, brandFilter, search]);

  const handleCopyLink = (token: string, publicUrl: string) => {
    const full = window.location.origin + publicUrl;
    navigator.clipboard.writeText(full);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleShareWhatsApp = (l: PaymentLink) => {
    const full = window.location.origin + (l.publicUrl || `/${l.brandSlug || 'pay'}/${l.token}`);
    const text = encodeURIComponent(
      `Hello ${l.customerName || ''}, please complete your payment of ₹${l.amountFormatted} using this secure link: ${full}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleToggle = async (linkId: string) => {
    try {
      const res = await api.togglePaymentLink(linkId);
      if (res.success) {
        setLinks((prev) =>
          prev.map((l) => (l.id === linkId ? { ...l, isEnabled: res.isEnabled } : l))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecheck = async (linkId: string) => {
    try {
      setRecheckingId(linkId);
      const res = await api.recheckPaymentLink(linkId);
      if (res.success) {
        setLinks((prev) =>
          prev.map((l) => (l.id === linkId ? { ...l, status: res.status } : l))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecheckingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);

    try {
      const payload: any = {
        brandId: selectedBrandId,
        gatewayAccountId: selectedGatewayId,
        amount: parseFloat(amount),
        description: description || 'Payment Link',
        externalReference,
        expiresInHours: parseInt(expiresInHours, 10),
        loanOrderNumber: loanOrderNumber.trim() || undefined,
        repaymentDate: repaymentDate.trim() || undefined,
        panNumber: panNumber.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined,
        executiveName: executiveName.trim() || undefined,
      };

      if (customerMode === 'existing' && selectedCustomerId) {
        payload.customerId = selectedCustomerId;
      } else {
        if (!customerName.trim() || !customerMobile.trim()) {
          setFormError('Customer Full Name and Mobile Number are required.');
          setCreating(false);
          return;
        }
        payload.customerName = customerName.trim();
        payload.customerMobile = customerMobile.trim();
        if (customerEmail.trim()) {
          payload.customerEmail = customerEmail.trim();
        }
      }

      const res = await api.createPaymentLink(payload);

      if (res.success) {
        setCreateModalOpen(false);
        const createdLink = res.link;
        const selectedBrand = brands.find((b) => b.id === selectedBrandId);
        setCustomerName('');
        setCustomerMobile('');
        setCustomerEmail('');
        setLoanOrderNumber('');
        setRepaymentDate('');
        setPanNumber('');
        setBankAccount('');
        setExecutiveName('');
        setAmount('');
        setDescription('');
        setExternalReference('');
        fetchData();

        if (createdLink) {
          const enriched: PaymentLink = {
            ...createdLink,
            customerName: payload.customerName || customers.find((c) => c.id === selectedCustomerId)?.fullName || 'Customer',
            customerMobile: payload.customerMobile || customers.find((c) => c.id === selectedCustomerId)?.mobile || '',
            brandName: selectedBrand?.name || 'Loan Services',
            brandSlug: selectedBrand?.slug || 'pay',
            publicUrl: `/${selectedBrand?.slug || 'pay'}/${createdLink.token}`,
          };
          setSelectedNoticeLink(enriched);
        }
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Link creation failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payment Links</h1>
          <p className="text-xs text-slate-500">
            Generate secure public payment tokens with branded customer checkout portals
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/payment-links/export/csv"
            download="payment_links.csv"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition"
          >
            <Plus size={15} />
            <span>New Payment Link</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative max-w-xs w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search token, ref, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-teal-500 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:bg-white focus:outline-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="CREATED">CREATED</option>
            <option value="PENDING">PENDING</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:bg-white focus:outline-teal-500"
          >
            <option value="ALL">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (/{b.slug})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Payment Links Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Token &amp; Order Ref</th>
                <th className="py-3.5 px-4">Brand</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Expires</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading payment links...
                  </td>
                </tr>
              ) : links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No payment links found matching current filter.
                  </td>
                </tr>
              ) : (
                links.map((link) => {
                  const isSuccess = link.status === 'SUCCESS';
                  return (
                    <tr
                      key={link.id}
                      className={`hover:bg-slate-50/80 transition ${
                        !link.isEnabled ? 'opacity-60 bg-slate-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                            {link.token}
                          </span>
                          {!link.isEnabled && (
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {link.merchantOrderNo}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{link.brandName}</div>
                        <div className="text-[10px] text-teal-600 font-mono">/{link.brandSlug}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">{link.customerName}</div>
                        <div className="text-slate-400 text-[11px]">{link.customerMobile}</div>
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

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(link.expiresAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* QR Code */}
                          <button
                            onClick={() =>
                              setQrModalData({
                                url: link.publicUrl || `/${link.brandSlug}/${link.token}`,
                                title: `${link.brandName} Payment`,
                                amount: link.amountFormatted,
                                token: link.token,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="Generate QR Code"
                          >
                            <QrCode size={14} />
                          </button>

                          {/* Copy Link */}
                          <button
                            onClick={() =>
                              handleCopyLink(
                                link.token,
                                link.publicUrl || `/${link.brandSlug}/${link.token}`
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition"
                            title="Copy Payment Link"
                          >
                            {copiedToken === link.token ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>

                          {/* Copy with Notice Template */}
                          <button
                            onClick={() => setSelectedNoticeLink(link)}
                            className="p-1.5 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition"
                            title="Copy with Recovery Notice Template (Auto-filled)"
                          >
                            <MessageSquare size={14} />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => handleShareWhatsApp(link)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition"
                            title="Share via WhatsApp"
                          >
                            <Share2 size={14} />
                          </button>

                          {/* Recheck Gateway Status */}
                          <button
                            onClick={() => handleRecheck(link.id)}
                            disabled={recheckingId === link.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                            title="Query Gateway Status"
                          >
                            <RefreshCw
                              size={14}
                              className={recheckingId === link.id ? 'animate-spin text-indigo-600' : ''}
                            />
                          </button>

                          {/* Enable / Disable Toggle */}
                          <button
                            onClick={() => handleToggle(link.id)}
                            className={`p-1.5 rounded-lg transition ${
                              link.isEnabled
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                                : 'text-rose-500 hover:text-emerald-600 hover:bg-slate-100'
                            }`}
                            title={link.isEnabled ? 'Disable Link' : 'Enable Link'}
                          >
                            <Power size={14} />
                          </button>

                          {/* Open Public Page */}
                          <a
                            href={link.publicUrl || `/${link.brandSlug}/${link.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Open Customer Checkout Page"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalData && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrModalData(null)}
          url={qrModalData.url}
          title={qrModalData.title}
          amount={qrModalData.amount}
          token={qrModalData.token}
        />
      )}

      {/* Create Payment Link Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Create Branded Payment Link</h3>
            <p className="text-xs text-slate-500 mb-4">
              A secure, unpredictable public token will be generated (no sequential IDs).
            </p>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Customer Mode Selection */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Customer Details *</span>
                  <div className="flex gap-1 bg-white p-0.5 rounded-xl border border-slate-200 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCustomerMode('inline')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        customerMode === 'inline' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Instant Inline
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMode('existing')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        customerMode === 'existing' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Pick Saved
                    </button>
                  </div>
                </div>

                {customerMode === 'inline' ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Customer Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. PARVEEN"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-teal-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9201234695"
                          value={customerMobile}
                          onChange={(e) => setCustomerMobile(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="customer@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-teal-500 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select Existing Customer *</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-teal-500 bg-white"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.mobile}) - {c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* KYC & Loan Details (Matching user's screenshot - all optional) */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">KYC &amp; Loan Details (Optional)</span>
                  <span className="text-[10px] text-slate-400">Shows on customer checkout</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Order / Loan Order NO
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6307137 (auto if empty)"
                      value={loanOrderNumber}
                      onChange={(e) => setLoanOrderNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Repayment Date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10/10/2026"
                      value={repaymentDate}
                      onChange={(e) => setRepaymentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-teal-500 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-teal-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Bank Account / UPI
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9201234695@ybl"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-teal-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Executive / Loan Officer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={executiveName}
                    onChange={(e) => setExecutiveName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Brand & Gateway Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Theme *</label>
                  <select
                    required
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-teal-500"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (/{b.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gateway Account *</label>
                  <select
                    required
                    value={selectedGatewayId}
                    onChange={(e) => setSelectedGatewayId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-teal-500"
                  >
                    {gateways.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.isSandbox ? '[SANDBOX]' : '[LIVE]'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payable Amount & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payable Amount (INR) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="500.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold font-mono focus:outline-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Validity (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Bill Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Loan Repayment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">External Invoice / Ref</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-8801"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-teal-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition"
                >
                  {creating ? 'Generating Token...' : 'Generate Secure Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Share with Notice Template Modal */}
      {selectedNoticeLink && (
        <ShareNoticeModal
          link={selectedNoticeLink}
          onClose={() => setSelectedNoticeLink(null)}
        />
      )}
    </div>
  );
};
