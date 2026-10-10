import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lock,
  Phone,
  Mail,
  QrCode,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.js';
import { QRCodeModal } from '../components/QRCodeModal.js';

interface PublicCheckoutProps {
  token: string;
  brandSlug: string;
}

export const PublicCheckoutPage: React.FC<PublicCheckoutProps> = ({ token, brandSlug }) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [activePayUrl, setActivePayUrl] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPublicCheckout(token);
      if (res.success) {
        setData(res.data);
        if (res.data.link?.gatewayPayUrl) {
          setActivePayUrl(res.data.link.gatewayPayUrl);
        }
        if (res.data.brand?.name) {
          document.title = `${res.data.brand.name} - Official Payment Portal`;
        }
      } else {
        setError(res.error || 'Payment link not found.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load payment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [token]);

  // Expose global callback for templates embedding custom {{payment.button}}
  useEffect(() => {
    (window as any).__initiatePay = () => {
      handlePayNow();
    };
    return () => {
      delete (window as any).__initiatePay;
    };
  });

  // Auto-poll status continuously when waiting for payment confirmation
  useEffect(() => {
    if (!data || data.link.status === 'SUCCESS' || data.link.status === 'EXPIRED') return;

    // Check status every 3.5 seconds
    const interval = setInterval(() => {
      api.checkPublicStatus(token)
        .then((res) => {
          if (res.status === 'SUCCESS' || (res.link && res.link.status === 'SUCCESS')) {
            fetchDetails();
          }
        })
        .catch(() => {});
    }, 3500);

    return () => clearInterval(interval);
  }, [token, data]);

  const handlePayNow = async () => {
    setPaying(true);
    setError(null);
    try {
      const res = await api.initiatePublicPay(token);
      if (res.success && res.payUrl) {
        setActivePayUrl(res.payUrl);

        // Try opening in new window/tab first (prevents iframe sandbox block)
        let opened = false;
        try {
          const win = window.open(res.payUrl, '_blank');
          if (win && !win.closed) {
            opened = true;
          }
        } catch {
          opened = false;
        }

        // If popup was blocked or failed, attempt top-window redirect
        if (!opened) {
          if (window.top && window.top !== window) {
            try {
              window.top.location.href = res.payUrl;
              return;
            } catch {
              window.location.href = res.payUrl;
            }
          } else {
            window.location.href = res.payUrl;
          }
        }
      } else if (res.success && !res.payUrl) {
        // Order initialized on gateway
        setActivePayUrl(data?.link?.gatewayPayUrl || null);
      } else {
        setError(res.error || 'Payment initialization failed. Please try again.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout initiation failed');
    } finally {
      setPaying(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await api.checkPublicStatus(token);
      await fetchDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-3xl shadow-xl">
          <RefreshCw className="animate-spin text-slate-700" size={32} />
          <p className="text-xs font-semibold text-slate-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center space-y-3 border border-slate-200">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Payment Link Unavailable</h2>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const { link, customer, brand, renderedHtml } = data;
  const isPaid = link.status === 'SUCCESS';
  const isExpired = link.status === 'EXPIRED';
  const isFailed = link.status === 'FAILED';
  const isDisabled = !link.isEnabled;

  const primaryColor = brand?.primaryColor || '#6366f1';
  const secondaryColor = brand?.secondaryColor || '#818cf8';
  const buttonColor = brand?.buttonColor || primaryColor;
  const buttonText = brand?.buttonText || 'PAY NOW';

  // Helper to mask mobile: "9201234695" -> "920****695"
  const rawMobile = customer?.mobile || '';
  const digits = rawMobile.replace(/[^0-9]/g, '');
  const maskedMobile = digits.length >= 10 ? `${digits.slice(-10, -7)}****${digits.slice(-3)}` : rawMobile;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between p-4 antialiased font-sans"
      style={{ backgroundColor: brand?.backgroundColor || '#f3f4f6' }}
    >
      <div className="max-w-md w-full my-3 space-y-4">
        {/* ========================================================================= */}
        {/* 1. SUCCESS STATE - Clean & verified, zero download receipt clutter       */}
        {/* ========================================================================= */}
        {isPaid ? (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div
              className="p-8 text-white text-center"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-sm">
                <CheckCircle2 size={38} className="text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">{brand?.successTitle || 'Payment Successful'}</h2>
              <p className="text-xs text-white/90 mt-1.5 max-w-xs mx-auto leading-relaxed">
                {brand?.successMessage || 'Your payment has been received and verified successfully.'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2.5 border border-slate-100">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Amount Paid:</span>
                  <span className="font-extrabold font-mono text-base" style={{ color: primaryColor }}>
                    ₹ {link.amountFormatted}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Reference Order:</span>
                  <span className="font-mono font-bold text-slate-800">{link.loanOrderNumber || link.merchantOrderNo}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Customer Name:</span>
                  <span className="font-bold text-slate-900 uppercase">{customer.name}</span>
                </div>
                {link.paidAt && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Payment Time:</span>
                    <span className="font-mono text-slate-700">{new Date(link.paidAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/70">
                  <span>Status:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Verified &amp; Settled</span>
                  </span>
                </div>
              </div>

              <div className="text-center text-xs text-slate-400 py-1">
                Thank you for choosing {brand.name}. Your account records have been updated.
              </div>
            </div>
          </div>
        ) : isFailed ? (
          /* ========================================================================= */
          /* 2. FAILED STATE                                                           */
          /* ========================================================================= */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 bg-rose-600 text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <XCircle size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">{brand?.failedTitle || 'Payment Unsuccessful'}</h2>
              <p className="text-xs text-white/90 mt-1 max-w-xs mx-auto leading-relaxed">
                {brand?.failedMessage || 'Transaction could not be completed. Please try again.'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-50 rounded-2xl p-4 text-xs space-y-2 border border-rose-100">
                <div className="flex justify-between text-slate-600">
                  <span>Amount:</span>
                  <span className="font-bold font-mono text-slate-900">₹ {link.amountFormatted}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Order Ref:</span>
                  <span className="font-mono text-slate-800">{link.loanOrderNumber || link.merchantOrderNo}</span>
                </div>
              </div>

              <button
                onClick={handlePayNow}
                disabled={paying}
                className="flex items-center justify-center gap-2 w-full py-4 px-4 rounded-2xl text-white font-extrabold text-sm shadow-lg transition active:scale-98"
                style={{ backgroundColor: buttonColor }}
              >
                <span>{paying ? 'Connecting...' : 'Try Again'}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : isExpired ? (
          /* ========================================================================= */
          /* 3. EXPIRED STATE                                                          */
          /* ========================================================================= */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Clock size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Payment Link Expired</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              This payment link expired past its validity window. Please contact {brand.name} to receive an updated link.
            </p>
          </div>
        ) : isDisabled ? (
          /* ========================================================================= */
          /* 4. DISABLED STATE                                                         */
          /* ========================================================================= */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Link Inactive</h2>
            <p className="text-xs text-slate-500">This payment link has been deactivated.</p>
          </div>
        ) : (
          /* ========================================================================= */
          /* 5. ACTIVE CHECKOUT CARD (Matches user screenshot perfectly)              */
          /* ========================================================================= */
          <div className="space-y-3">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Custom Template or Native Whitelabel Card */}
            {renderedHtml ? (
              <div
                className="w-full"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            ) : (
              /* Fallback Native Layout matching user's photo */
              <div className="space-y-3">
                {/* Top Card: Brand Gradient Header with Amounts & Due Date */}
                <div className="rounded-3xl shadow-lg overflow-hidden border border-slate-100 bg-white">
                  <div
                    className="px-6 py-5 text-white text-center rounded-t-3xl relative"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  >
                    <div className="inline-flex items-center justify-center gap-2 mb-1 bg-white/10 px-3 py-1 rounded-2xl backdrop-blur-sm">
                      {brand.logoUrl && (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="w-6 h-6 rounded-md object-contain bg-white p-0.5"
                          onError={(e: any) => (e.target.style.display = 'none')}
                        />
                      )}
                      <span className="text-xl font-bold tracking-tight text-white">{brand.name}</span>
                    </div>
                    <div className="text-xs text-white/90 font-medium">
                      Mobile Number: <span className="font-mono">{maskedMobile}</span>
                    </div>

                    <button
                      onClick={() => setQrOpen(true)}
                      className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-xs"
                      title="Show Payment QR"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4 pb-4">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400">Total Payable Amount</span>
                        <div className="text-2xl font-extrabold font-mono mt-1" style={{ color: primaryColor }}>
                          ₹ {link.amountFormatted}
                        </div>
                      </div>
                      <div className="border-l border-slate-100 pl-4">
                        <span className="text-[11px] font-semibold text-slate-400">Repayment Date</span>
                        <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                          {link.repaymentDate || new Date(link.expiresAt).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        Order NO. <span className="font-mono font-medium text-slate-700 ml-1">{link.loanOrderNumber || link.merchantOrderNo}</span>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        Link Pending
                      </span>
                    </div>
                  </div>
                </div>

                {/* Second Card: KYC & Loan Details */}
                <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-5 space-y-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-1">
                    KYC &amp; Loan Details
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Customer Name</span>
                      <span className="font-bold text-slate-900 uppercase">{customer.name}</span>
                    </div>

                    {link.panNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">PAN Number</span>
                        <span className="font-mono font-bold text-slate-900">{link.panNumber}</span>
                      </div>
                    )}

                    {link.bankAccount && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Bank Account</span>
                        <span className="font-medium text-slate-900 font-mono text-right text-[11px]">{link.bankAccount}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-dashed border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-medium">{brand.name} ({link.loanOrderNumber || link.merchantOrderNo})</span>
                      <span className="font-mono font-bold">₹ {link.amountFormatted}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Total Payable</span>
                      <span className="text-sm font-extrabold font-mono" style={{ color: primaryColor }}>
                        ₹ {link.amountFormatted}
                      </span>
                    </div>

                    {link.executiveName && (
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Executive Name</span>
                        <span className="font-medium text-slate-800">{link.executiveName}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-400 text-center pt-2 leading-relaxed">
                    I have read and agreed to {brand.name}'s <span className="underline" style={{ color: primaryColor }}>Sanction Letter</span> and <span className="underline" style={{ color: primaryColor }}>Loan Service Contract</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Pay Action Button (PAY NOW / PROCEED TO PAY) */}
            <div className="pt-2">
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="w-full py-4 px-6 rounded-2xl text-white font-extrabold text-sm shadow-xl transition transform active:scale-98 flex items-center justify-center gap-2"
                style={{ backgroundColor: buttonColor }}
              >
                {paying ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Connecting to Payment Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>{buttonText}</span>
                    <span>•</span>
                    <span className="font-mono">₹ {link.amountFormatted}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Brand Support & Encrypted Footer - Zero Gateway/Eagle Pay Mentions */}
        <div className="text-center pt-3 pb-6 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Lock size={12} className="text-slate-500" />
            <span>256-bit Encrypted Official Checkout • {brand.name}</span>
          </div>

          {(brand.supportEmail || brand.supportPhone) && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
              {brand.supportEmail && (
                <span className="flex items-center gap-1">
                  <Mail size={11} />
                  {brand.supportEmail}
                </span>
              )}
              {brand.supportPhone && (
                <span className="flex items-center gap-1">
                  <Phone size={11} />
                  {brand.supportPhone}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrOpen && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrOpen(false)}
          url={`/${brand.slug}/${link.token}`}
          title={`${brand.name} Payment`}
          amount={link.amountFormatted}
          token={link.token}
        />
      )}
    </div>
  );
};
