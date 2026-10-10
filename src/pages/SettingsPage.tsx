import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  MessageSquare,
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  Sparkles,
  Save,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock,
  Mail,
  User,
  Sliders,
  HelpCircle,
  X,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.js';
import { AdminUser, NoticeTemplate, UserRole } from '../types/index.js';

interface SettingsPageProps {
  currentUser: AdminUser;
  onUpdateCurrentUser?: (updated: AdminUser) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onUpdateCurrentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'notices' | 'team' | 'security' | 'system'>('notices');

  // --- NOTICE TEMPLATES STATE ---
  const [templates, setTemplates] = useState<NoticeTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<NoticeTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateIsDefault, setTemplateIsDefault] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSuccessMsg, setTemplateSuccessMsg] = useState<string | null>(null);
  const [templateErrorMsg, setTemplateErrorMsg] = useState<string | null>(null);
  const [showAiNoticeModal, setShowAiNoticeModal] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);

  // --- TEAM MANAGEMENT STATE ---
  const [team, setTeam] = useState<AdminUser[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('link_creator');
  const [teamActionLoading, setTeamActionLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);
  const [editMemberModal, setEditMemberModal] = useState<AdminUser | null>(null);
  const [editMemberRole, setEditMemberRole] = useState<UserRole>('link_creator');
  const [editMemberPassword, setEditMemberPassword] = useState('');

  // --- SECURITY & PASSWORD STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile update
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profileName, setProfileName] = useState(currentUser.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- SYSTEM SETTINGS STATE ---
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  // Load Templates
  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await api.getNoticeTemplates();
      if (res.success && res.templates) {
        setTemplates(res.templates);
        if (!selectedTemplate && res.templates.length > 0) {
          selectTemplateForEdit(res.templates[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load Team
  const loadTeam = async () => {
    try {
      setLoadingTeam(true);
      const res = await api.getTeamMembers();
      if (res.success && res.team) {
        setTeam(res.team);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Load System Settings
  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setSystemSettings(res.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadTeam();
    loadSettings();
  }, []);

  const selectTemplateForEdit = (tpl: NoticeTemplate) => {
    setSelectedTemplate(tpl);
    setTemplateName(tpl.name);
    setTemplateDesc(tpl.description || '');
    setTemplateContent(tpl.content);
    setTemplateIsDefault(tpl.isDefault);
    setIsEditingTemplate(true);
    setTemplateSuccessMsg(null);
    setTemplateErrorMsg(null);
  };

  const handleNewTemplateClick = () => {
    setSelectedTemplate(null);
    setTemplateName('New Collection Template');
    setTemplateDesc('Custom loan recovery message');
    setTemplateContent(`Dear {{customer.name}},

Your settlement offer of INR {{payment.amount}}/- for order {{payment.loan_order_number}} is valid today.
Pay now: {{payment.link}}

Recovery Dept, {{brand.name}}`);
    setTemplateIsDefault(false);
    setIsEditingTemplate(true);
    setTemplateSuccessMsg(null);
    setTemplateErrorMsg(null);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) {
      setTemplateErrorMsg('Template Name and Content are required.');
      return;
    }

    try {
      setSavingTemplate(true);
      setTemplateErrorMsg(null);
      setTemplateSuccessMsg(null);

      if (selectedTemplate) {
        // Update
        const res = await api.updateNoticeTemplate(selectedTemplate.id, {
          name: templateName,
          description: templateDesc,
          content: templateContent,
          isDefault: templateIsDefault,
        });

        if (res.success) {
          setTemplateSuccessMsg('Template updated successfully!');
          await loadTemplates();
          setSelectedTemplate(res.template);
        }
      } else {
        // Create
        const res = await api.createNoticeTemplate({
          name: templateName,
          description: templateDesc,
          content: templateContent,
          isDefault: templateIsDefault,
        });

        if (res.success) {
          setTemplateSuccessMsg('New template created successfully!');
          await loadTemplates();
          setSelectedTemplate(res.template);
        }
      }
    } catch (err: any) {
      setTemplateErrorMsg(err.message || 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice template?')) return;
    try {
      await api.deleteNoticeTemplate(id);
      await loadTemplates();
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setIsEditingTemplate(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const insertVariable = (variable: string) => {
    setTemplateContent((prev) => prev + variable);
  };

  // Live preview rendered text
  const previewText = templateContent
    .replaceAll('{{customer.name}}', 'BAIJAYANTI CHHURA')
    .replaceAll('{{payment.amount}}', '1,338')
    .replaceAll('{{payment.link}}', 'https://domain.com/apex/PAY9821X4')
    .replaceAll('{{payment.url}}', 'https://domain.com/apex/PAY9821X4')
    .replaceAll('{{brand.name}}', 'ArspLoan')
    .replaceAll('{{payment.loan_order_number}}', '2181993')
    .replaceAll('{{customer.pan}}', 'DOJPC3710R')
    .replaceAll('{{customer.bank_account}}', 'XX9912')
    .replaceAll('{{customer.executive_name}}', 'R. Sharma')
    .replaceAll('{{payment.repayment_date}}', 'Today Only')
    .replaceAll('{{customer.masked_mobile}}', '98****3210')
    .replaceAll('{{brand.support_phone}}', '+91 800-444-0000');

  // AI Prompt for generating notice templates
  const aiNoticePromptText = `Act as an expert banking collections and recovery communication specialist for a digital NBFC loan app.
Create a high-impact, professional collection notice message template that will be sent via SMS / WhatsApp to customers with overdue loans.

Use the following exact placeholders:
- {{customer.name}} -> Customer full name (e.g. BAIJAYANTI CHHURA)
- {{payment.amount}} -> Approved settlement amount (e.g. 1,338)
- {{payment.link}} -> Unique payment link URL
- {{brand.name}} -> NBFC / Loan company name (e.g. ArspLoan)
- {{payment.loan_order_number}} -> Loan account / Order number (e.g. 2181993)
- {{customer.pan}} -> PAN Number (e.g. DOJPC3710R)
- {{customer.masked_mobile}} -> Masked mobile number
- {{customer.executive_name}} -> Field / Recovery officer name

Requirements:
1. Tone options: Urgent Legal Warning / One-Time Discount Settlement / Formal Repayment Reminder.
2. Must clearly highlight that clearing via {{payment.link}} stops field visits and CIBIL reporting.
3. Clean formatting with emojis and bullet points suitable for WhatsApp and SMS.
4. Output ready-to-use template text without markdown code blocks.`;

  // Team Actions
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamActionLoading(true);
    setTeamError(null);
    setTeamSuccess(null);

    try {
      const res = await api.createTeamMember({
        username: newUsername,
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });

      if (res.success) {
        setTeamSuccess(`Team member "${newUsername}" added successfully!`);
        setShowAddTeamModal(false);
        setNewUsername('');
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('link_creator');
        await loadTeam();
      }
    } catch (err: any) {
      setTeamError(err.message || 'Failed to add team member.');
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleUpdateMemberRoleOrPassword = async () => {
    if (!editMemberModal) return;
    try {
      setTeamActionLoading(true);
      const payload: any = { role: editMemberRole };
      if (editMemberPassword.trim()) {
        payload.newPassword = editMemberPassword.trim();
      }

      const res = await api.updateTeamMember(editMemberModal.id, payload);
      if (res.success) {
        setEditMemberModal(null);
        setEditMemberPassword('');
        await loadTeam();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update member');
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleToggleMemberStatus = async (member: AdminUser) => {
    try {
      await api.updateTeamMember(member.id, { isActive: !member.isActive });
      await loadTeam();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDeleteMember = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete team member "${username}"?`)) return;
    try {
      await api.deleteTeamMember(id);
      await loadTeam();
    } catch (err: any) {
      alert(err.message || 'Failed to delete member');
    }
  };

  // Password & Profile
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newAdminPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.changePassword({
        currentPassword,
        newPassword: newAdminPassword,
      });

      if (res.success) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewAdminPassword('');
        setConfirmAdminPassword('');
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    try {
      setProfileLoading(true);
      const res = await api.updateProfile({
        username: profileUsername,
        name: profileName,
        email: profileEmail,
      });

      if (res.success && res.user) {
        setProfileMsg({ type: 'success', text: 'Profile details saved!' });
        if (onUpdateCurrentUser) onUpdateCurrentUser(res.user);
      }
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">Super Admin</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">Admin</span>;
      case 'manager':
        return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">Manager</span>;
      case 'link_creator':
        return <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">Link Creator</span>;
      case 'template_designer':
        return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Template Designer</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Settings & Team</h1>
          <p className="text-xs text-slate-500">
            Customize notice templates, manage team permissions, and configure security
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'notices'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageSquare size={14} />
            <span>Notice Templates</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'team'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users size={14} />
            <span>Team & Permissions</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'security'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <KeyRound size={14} />
            <span>Admin Password</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: NOTICE TEMPLATES CUSTOMIZER */}
      {/* ============================================================== */}
      {activeTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Template List (Left 4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Notice Templates ({templates.length})
                </span>
                <button
                  onClick={handleNewTemplateClick}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold transition"
                >
                  <Plus size={13} />
                  <span>New Template</span>
                </button>
              </div>

              {loadingTemplates ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-teal-600" />
                  Loading templates...
                </div>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => selectTemplateForEdit(tpl)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                        selectedTemplate?.id === tpl.id
                          ? 'bg-teal-50/70 border-teal-500 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {tpl.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {tpl.description || 'No description'}
                          </div>
                        </div>
                        {tpl.isDefault && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Generator CTA Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-indigo-800/50 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-300" />
                <span className="text-xs font-bold tracking-tight text-white">
                  AI Recovery Prompt Generator
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Feed this structured prompt with ready placeholders to ChatGPT / Claude / Gemini to generate aggressive, legal, or polite recovery notice templates in any language.
              </p>
              <button
                type="button"
                onClick={() => setShowAiNoticeModal(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition"
              >
                <span>View & Copy AI Prompt</span>
              </button>
            </div>
          </div>

          {/* Template Editor & Live Preview (Right 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedTemplate ? `Edit Template: ${selectedTemplate.name}` : 'Create Notice Template'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Use tags like <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{'{{customer.name}}'}</code> to automatically populate customer data
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTemplate && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition text-xs"
                      title="Delete Template"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition"
                  >
                    {savingTemplate ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Save Template</span>
                  </button>
                </div>
              </div>

              {templateSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>{templateSuccessMsg}</span>
                </div>
              )}

              {templateErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{templateErrorMsg}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Urgent One-Time Settlement"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Sent for final settlement clearance"
                  />
                </div>
              </div>

              {/* Default Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultTplCheck"
                  checked={templateIsDefault}
                  onChange={(e) => setTemplateIsDefault(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="defaultTplCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Set as Primary Default Template (Auto-selected when copying link)
                </label>
              </div>

              {/* Placeholders Quick Insertion Pills */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Click to Insert Dynamic Placeholders:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{{customer.name}}', label: 'Customer Name' },
                    { tag: '{{payment.amount}}', label: 'Amount' },
                    { tag: '{{payment.link}}', label: 'Payment Link URL' },
                    { tag: '{{brand.name}}', label: 'Brand Name' },
                    { tag: '{{payment.loan_order_number}}', label: 'Loan Order NO' },
                    { tag: '{{customer.pan}}', label: 'PAN Card' },
                    { tag: '{{customer.bank_account}}', label: 'Bank Account' },
                    { tag: '{{customer.executive_name}}', label: 'Executive' },
                    { tag: '{{customer.masked_mobile}}', label: 'Masked Mobile' },
                    { tag: '{{payment.repayment_date}}', label: 'Repayment Date' },
                    { tag: '{{brand.support_phone}}', label: 'Support Phone' },
                  ].map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => insertVariable(item.tag)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 text-slate-700 text-[11px] font-mono transition"
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Content Editor */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Message Content (Raw Template)
                </label>
                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  rows={9}
                  className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="Type your message template here..."
                />
              </div>

              {/* Live Preview Section */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye size={13} className="text-teal-600" />
                    <span>Real-Time Customer Preview (Populated Sample)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {previewText.length} characters
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all shadow-inner border border-slate-800">
                  {previewText}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TEAM MANAGEMENT & PERMISSIONS */}
      {/* ============================================================== */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Team Members & Role Access Control</h3>
                <p className="text-xs text-slate-500">
                  Add staff with restricted permissions (e.g. only link creations, template design, or management)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddTeamModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition"
              >
                <Plus size={14} />
                <span>Add Team Member</span>
              </button>
            </div>

            {teamSuccess && (
              <div className="p-3 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{teamSuccess}</span>
              </div>
            )}

            {/* Team Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {team.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] uppercase">
                            {member.username.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{member.name || member.username}</span>
                            <span className="text-[11px] text-slate-400 font-mono">@{member.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {member.email}
                      </td>

                      <td className="py-3 px-4">
                        {getRoleBadge(member.role)}
                      </td>

                      <td className="py-3 px-4">
                        {member.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Disabled
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditMemberModal(member);
                              setEditMemberRole(member.role);
                              setEditMemberPassword('');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition"
                            title="Edit Role or Reset Password"
                          >
                            <Edit2 size={13} />
                          </button>

                          {member.id !== currentUser.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleMemberStatus(member)}
                                className={`p-1.5 rounded-lg transition ${
                                  member.isActive !== false
                                    ? 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={member.isActive !== false ? 'Deactivate Member' : 'Activate Member'}
                              >
                                {member.isActive !== false ? <UserX size={13} /> : <UserCheck size={13} />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member.id, member.username)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
                                title="Delete Member"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role Permissions Matrix Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Permission Role Definitions:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-teal-800 block">1. link_creator</span>
                <p className="text-slate-600 text-[11px]">
                  Can ONLY generate payment links, copy notice templates, and view customer directory. Cannot edit HTML or gateways.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-amber-800 block">2. template_designer</span>
                <p className="text-slate-600 text-[11px]">
                  Can ONLY design checkout HTML templates and customize recovery SMS/WhatsApp notice templates.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-blue-800 block">3. manager</span>
                <p className="text-slate-600 text-[11px]">
                  Can view transactions, payment links, export financial reports, and recheck gateway status.
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-indigo-800 block">4. admin</span>
                <p className="text-slate-600 text-[11px]">
                  Full administrative access to manage gateways, audit logs, team members, and system configurations.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ADMIN SECURITY & PASSWORD */}
      {/* ============================================================== */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Change Password Card */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Change Admin Password</h3>
                <p className="text-xs text-slate-500">Update your account login password with PBKDF2 encryption</p>
              </div>
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {passwordMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  placeholder="Re-type new password"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition"
              >
                {passwordLoading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Update Password</span>
              </button>
            </form>
          </div>

          {/* Profile Details Card */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Admin Account Profile</h3>
                <p className="text-xs text-slate-500">Update display name, username, and contact email</p>
              </div>
            </div>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {profileMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Username (Login Identifier)
                </label>
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-1">
                <span className="text-[11px] text-slate-500 block">
                  Current Role: <span className="font-bold text-slate-800 uppercase">{currentUser.role}</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition"
              >
                {profileLoading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                <span>Save Profile Details</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD TEAM MEMBER */}
      {/* ============================================================== */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-teal-600" />
                <span>Add Team Member</span>
              </h3>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {teamError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{teamError}</span>
              </div>
            )}

            <form onSubmit={handleAddTeamMember} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  placeholder="e.g. rohit_links"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="rohit@example.com"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Min 6 characters"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Permission Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-teal-500"
                >
                  <option value="link_creator">Only Link Creations (link_creator)</option>
                  <option value="template_designer">Only Template Designer (template_designer)</option>
                  <option value="manager">Manager (manager)</option>
                  <option value="admin">Admin (admin)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={teamActionLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition"
                >
                  {teamActionLoading ? 'Creating...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT TEAM MEMBER */}
      {/* ============================================================== */}
      {editMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Member: {editMemberModal.username}
              </h3>
              <button
                onClick={() => setEditMemberModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Change Role
                </label>
                <select
                  value={editMemberRole}
                  onChange={(e) => setEditMemberRole(e.target.value as UserRole)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-teal-500"
                >
                  <option value="link_creator">Only Link Creations (link_creator)</option>
                  <option value="template_designer">Only Template Designer (template_designer)</option>
                  <option value="manager">Manager (manager)</option>
                  <option value="admin">Admin (admin)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Reset Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  value={editMemberPassword}
                  onChange={(e) => setEditMemberPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditMemberModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateMemberRoleOrPassword}
                  disabled={teamActionLoading}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition"
                >
                  {teamActionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: AI PROMPT GENERATOR FOR NOTICE TEMPLATES */}
      {/* ============================================================== */}
      {showAiNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Prompt for Notice Templates</h3>
                  <p className="text-[11px] text-slate-500">Copy & paste into ChatGPT, Gemini, or Claude</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiNoticeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all max-h-[300px] overflow-y-auto border border-slate-800">
                {aiNoticePromptText}
              </pre>
            </div>

            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-teal-800 text-xs">
              💡 <b>Tip:</b> Tell AI the language (English, Hindi, Hinglish) and severity (Legal Notice, Polite Reminder, or Instant Settlement) to get tailor-made templates.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAiNoticeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(aiNoticePromptText);
                  setCopiedAiPrompt(true);
                  setTimeout(() => setCopiedAiPrompt(false), 2000);
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-xs"
              >
                {copiedAiPrompt ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedAiPrompt ? 'Prompt Copied!' : 'Copy AI Prompt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
