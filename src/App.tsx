import React, { useEffect, useState } from 'react';
import { api, clearAuthToken, getAuthToken, getCachedUser, setCachedUser } from './services/api.js';
import { AdminUser } from './types/index.js';
import { AdminLayout } from './components/AdminLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { PaymentLinksPage } from './pages/PaymentLinksPage.js';
import { TransactionsPage } from './pages/TransactionsPage.js';
import { BrandsPage } from './pages/BrandsPage.js';
import { GatewayAccountsPage } from './pages/GatewayAccountsPage.js';
import { WebhooksPage } from './pages/WebhooksPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { AuditLogsPage } from './pages/AuditLogsPage.js';
import { TestRunnerPage } from './pages/TestRunnerPage.js';
import { DocumentationPage } from './pages/DocumentationPage.js';
import { CpanelDeploymentPage } from './pages/CpanelDeploymentPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { PublicCheckoutPage } from './pages/PublicCheckoutPage.js';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => getCachedUser());
  const [loadingAuth, setLoadingAuth] = useState(() => !getCachedUser());
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check URL routing: Is this a public branded checkout link?
  // Format: /:brandSlug/:token (e.g. /samvit/PAY8F72K9 or /apex/PAY4B21X8)
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/').filter(Boolean);

  const isPublicCheckout =
    pathParts.length === 2 &&
    !['api', 'webhooks', 'assets', 'static', 'install', 'cron'].includes(pathParts[0]);

  const brandSlug = isPublicCheckout ? pathParts[0] : '';
  const token = isPublicCheckout ? pathParts[1] : '';

  useEffect(() => {
    // If not public checkout, check admin session
    if (!isPublicCheckout) {
      const token = getAuthToken();
      if (!token) {
        setCurrentUser(null);
        setLoadingAuth(false);
        return;
      }

      api
        .getMe()
        .then((res) => {
          if (res.success && res.user) {
            setCurrentUser(res.user);
            setCachedUser(res.user);
          }
        })
        .catch((err) => {
          // If 401 Unauthorized explicitly returned
          if (err && String(err.message).includes('401')) {
            clearAuthToken();
            setCurrentUser(null);
          }
        })
        .finally(() => setLoadingAuth(false));
    } else {
      setLoadingAuth(false);
    }

    const handleExpired = () => {
      clearAuthToken();
      setCurrentUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [isPublicCheckout]);

  // If customer is on a branded checkout link (e.g. /samvit/PAY8F72K9)
  if (isPublicCheckout) {
    return <PublicCheckoutPage brandSlug={brandSlug} token={token} />;
  }

  if (loadingAuth && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw size={28} className="animate-spin text-teal-400" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        onSuccess={(user) => {
          setCurrentUser(user);
          setCachedUser(user);
        }}
      />
    );
  }

  const isFullAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
      case 'customers':
        return <CustomersPage />;
      case 'payment-links':
        return <PaymentLinksPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'brands':
        return <BrandsPage />;
      case 'gateway-accounts':
        return <GatewayAccountsPage />;
      case 'webhooks':
        return <WebhooksPage />;
      case 'reports':
        return <ReportsPage />;
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'tests':
        return <TestRunnerPage />;
      case 'settings':
        return (
          <SettingsPage
            currentUser={currentUser}
            onUpdateCurrentUser={(updated) => {
              setCurrentUser(updated);
              setCachedUser(updated);
            }}
          />
        );
      case 'docs':
        return <DocumentationPage />;
      case 'cpanel':
        if (!isFullAdmin) {
          return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
        }
        return <CpanelDeploymentPage />;
      default:
        return <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <AdminLayout
      user={currentUser}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={() => {
        api.logout().catch(() => {});
        clearAuthToken();
        setCurrentUser(null);
      }}
    >
      {renderActiveTabContent()}
    </AdminLayout>
  );
}
