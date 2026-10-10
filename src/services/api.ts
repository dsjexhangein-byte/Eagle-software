const TOKEN_KEY = 'eaglepay_admin_token';
const USER_KEY = 'eaglepay_admin_user';

export function getAuthToken(): string | null {
  const local = localStorage.getItem(TOKEN_KEY);
  if (local) return local;

  // Check cookie fallback
  const match = document.cookie.match(/(?:^|;\s*)eaglepay_admin_token=([^;]+)/);
  if (match) {
    const cookieToken = decodeURIComponent(match[1]);
    localStorage.setItem(TOKEN_KEY, cookieToken);
    return cookieToken;
  }
  return null;
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  try {
    document.cookie = `eaglepay_admin_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    document.cookie = `eaglepay_token=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
  } catch {}
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  try {
    document.cookie = 'eaglepay_admin_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'eaglepay_token=; path=/; max-age=0; SameSite=Lax';
  } catch {}
}

export function getCachedUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: any): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    clearAuthToken();
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  const data = await response.json().catch(() => ({ success: false, error: 'Non-JSON response' }));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => apiRequest('/api/auth/me'),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),

  // Dashboard
  getDashboardStats: () => apiRequest('/api/dashboard/stats'),

  // Customers
  getCustomers: (search?: string) =>
    apiRequest(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id: string) => apiRequest(`/api/customers/${id}`),
  createCustomer: (data: any) => apiRequest('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) =>
    apiRequest(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Payment Links
  getPaymentLinks: (params: { status?: string; brandId?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.brandId) q.set('brandId', params.brandId);
    if (params.search) q.set('search', params.search);
    return apiRequest(`/api/payment-links?${q.toString()}`);
  },
  getPaymentLink: (id: string) => apiRequest(`/api/payment-links/${id}`),
  createPaymentLink: (data: any) =>
    apiRequest('/api/payment-links', { method: 'POST', body: JSON.stringify(data) }),
  togglePaymentLink: (id: string) =>
    apiRequest(`/api/payment-links/${id}/toggle`, { method: 'PATCH' }),
  recheckPaymentLink: (id: string) =>
    apiRequest(`/api/payment-links/${id}/recheck`, { method: 'POST' }),

  // Brands & Templates
  getBrands: () => apiRequest('/api/brands'),
  createBrand: (data: any) => apiRequest('/api/brands', { method: 'POST', body: JSON.stringify(data) }),
  updateBrand: (id: string, data: any) => apiRequest(`/api/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getBrandTemplate: (brandId: string) => apiRequest(`/api/brands/${brandId}/template`),
  updateBrandTemplate: (brandId: string, htmlContent: string, changeNotes?: string) =>
    apiRequest(`/api/brands/${brandId}/template`, {
      method: 'PUT',
      body: JSON.stringify({ htmlContent, changeNotes }),
    }),
  getTemplateVariables: () => apiRequest('/api/brands/templates/variables'),
  previewTemplate: (htmlContent: string, brandId?: string) =>
    apiRequest('/api/brands/templates/preview', {
      method: 'POST',
      body: JSON.stringify({ htmlContent, brandId }),
    }),

  // Gateway Accounts
  getGatewayAccounts: () => apiRequest('/api/gateway-accounts'),
  createGatewayAccount: (data: any) =>
    apiRequest('/api/gateway-accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateGatewayAccount: (id: string, data: any) =>
    apiRequest(`/api/gateway-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  testGatewayAccount: (id: string) =>
    apiRequest(`/api/gateway-accounts/${id}/test`, { method: 'POST' }),

  // Webhooks
  getWebhookLogs: () => apiRequest('/api/webhooks/logs'),
  simulateWebhook: (data: any) =>
    apiRequest('/api/webhooks/simulate', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReportSummary: () => apiRequest('/api/reports/summary'),

  // Audit Logs
  getAuditLogs: (search?: string) =>
    apiRequest(`/api/audit-logs${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  // Tests
  runTests: () => apiRequest('/api/tests/run', { method: 'POST' }),

  // System & Settings
  getHealth: () => apiRequest('/api/system/health'),
  getSettings: () => apiRequest('/api/system/settings'),
  updateSettings: (data: any) => apiRequest('/api/system/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Auth, Profile & Password
  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    apiRequest('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  updateProfile: (data: { username?: string; email?: string; name?: string }) =>
    apiRequest('/api/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Team Management
  getTeamMembers: () => apiRequest('/api/auth/team'),
  createTeamMember: (data: any) =>
    apiRequest('/api/auth/team', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMember: (id: string, data: any) =>
    apiRequest(`/api/auth/team/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamMember: (id: string) =>
    apiRequest(`/api/auth/team/${id}`, { method: 'DELETE' }),

  // Notice Templates
  getNoticeTemplates: () => apiRequest('/api/notice-templates'),
  createNoticeTemplate: (data: any) =>
    apiRequest('/api/notice-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateNoticeTemplate: (id: string, data: any) =>
    apiRequest(`/api/notice-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNoticeTemplate: (id: string) =>
    apiRequest(`/api/notice-templates/${id}`, { method: 'DELETE' }),
  renderNoticeTemplate: (data: { templateId?: string; customContent?: string; paymentLinkId: string }) =>
    apiRequest('/api/notice-templates/render', { method: 'POST', body: JSON.stringify(data) }),

  // Public Checkout
  getPublicCheckout: (token: string) => apiRequest(`/api/public/checkout/${token}`),
  initiatePublicPay: (token: string) =>
    apiRequest(`/api/public/checkout/${token}/pay`, { method: 'POST' }),
  checkPublicStatus: (token: string) =>
    apiRequest(`/api/public/checkout/${token}/check-status`, { method: 'POST' }),
};
