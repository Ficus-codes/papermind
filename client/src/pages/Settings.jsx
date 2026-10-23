import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/apiClient';
import SettingsGearMechanism from '../components/SettingsGearMechanism';

/**
 * Settings Page
 * Minimalist, editorial, high-precision configuration workspace:
 * - Profile & Researcher Identity
 * - Workflow & Citation Preferences
 * - Cryptographic Security Credentials
 * - Data Archive Export & Local Cache Management
 */
const Settings = ({ currentUser, onLogout, onUpdateProfile, onBack }) => {
  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE' | 'PREFERENCES' | 'SECURITY' | 'DATA'

  // Profile state with strict validation
  const [name, setName] = useState(currentUser?.name || 'Dr. Eleanor Vance');
  const [email] = useState(currentUser?.email || 'researcher@university.edu');
  const [age, setAge] = useState(currentUser?.age !== undefined && currentUser?.age !== null ? String(currentUser.age) : '');
  const [affiliation, setAffiliation] = useState(currentUser?.affiliation || 'Department of Computer Science & AI');
  const [academicRole, setAcademicRole] = useState(currentUser?.academicRole || 'Senior Researcher / Scientist');
  const [researchField, setResearchField] = useState(currentUser?.researchField || 'Artificial Intelligence & Machine Learning');
  const [orcid, setOrcid] = useState(currentUser?.orcid || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences state (lazily loaded from localStorage)
  const [citationStyle, setCitationStyle] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_preferences');
      return saved ? JSON.parse(saved)?.citationStyle || 'APA' : 'APA';
    } catch {
      return 'APA';
    }
  });
  const [autoSummarize, setAutoSummarize] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_preferences');
      const val = saved ? JSON.parse(saved)?.autoSummarize : undefined;
      return typeof val === 'boolean' ? val : true;
    } catch {
      return true;
    }
  });
  const [graphPhysics, setGraphPhysics] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_preferences');
      const val = saved ? JSON.parse(saved)?.graphPhysics : undefined;
      return typeof val === 'boolean' ? val : true;
    } catch {
      return true;
    }
  });
  const [compactView, setCompactView] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_preferences');
      const val = saved ? JSON.parse(saved)?.compactView : undefined;
      return typeof val === 'boolean' ? val : false;
    } catch {
      return false;
    }
  });
  const [synthesisDepth, setSynthesisDepth] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_preferences');
      return saved ? JSON.parse(saved)?.synthesisDepth || 'THREE_PILLAR' : 'THREE_PILLAR';
    } catch {
      return 'THREE_PILLAR';
    }
  });

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState(null); // { type: 'error' | 'success', text: string }

  const allPasswordsShown = showCurrentPass && showNewPass && showConfirmPass;

  const toggleAllPasswords = () => {
    const next = !allPasswordsShown;
    setShowCurrentPass(next);
    setShowNewPass(next);
    setShowConfirmPass(next);
  };

  // Status & Feedback
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'success' | 'error', text: '' }

  // Sync user profile when currentUser prop changes
  useEffect(() => {
    try {
      if (currentUser?.affiliation !== undefined) {
        setAffiliation(currentUser.affiliation || '');
      }
      if (currentUser?.name !== undefined) {
        setName(currentUser.name || '');
      }
      if (currentUser?.age !== undefined && currentUser?.age !== null) {
        setAge(String(currentUser.age));
      }
      if (currentUser?.academicRole !== undefined) {
        setAcademicRole(currentUser.academicRole || 'Senior Researcher / Scientist');
      }
      if (currentUser?.researchField !== undefined) {
        setResearchField(currentUser.researchField || 'Artificial Intelligence & Machine Learning');
      }
      if (currentUser?.orcid !== undefined) {
        setOrcid(currentUser.orcid || '');
      }
      if (currentUser?.phone !== undefined) {
        setPhone(currentUser.phone || '');
      }
      if (currentUser?.bio !== undefined) {
        setBio(currentUser.bio || '');
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const notify = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Strict input handlers
  const handleNameChange = (e) => {
    const val = e.target.value;
    // Strictly letters, spaces, hyphens, periods, and apostrophes only
    if (!/^[a-zA-Z\s.'-]*$/.test(val)) return;
    setName(val);
    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleAgeChange = (e) => {
    const val = e.target.value;
    // Strictly whole number digits only, max 3 digits
    if (!/^\d*$/.test(val)) return;
    if (val.length > 3) return;
    setAge(val);
    if (fieldErrors.age) setFieldErrors((prev) => ({ ...prev, age: undefined }));
  };

  const handleOrcidChange = (e) => {
    let raw = e.target.value.toUpperCase().replace(/[^0-9X]/g, '');
    if (raw.length > 16) raw = raw.slice(0, 16);
    const chunks = [];
    for (let i = 0; i < raw.length; i += 4) {
      chunks.push(raw.slice(i, i + 4));
    }
    setOrcid(chunks.join('-'));
    if (fieldErrors.orcid) setFieldErrors((prev) => ({ ...prev, orcid: undefined }));
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    // Strictly dialing characters: +, numbers, spaces, hyphens, parentheses
    if (!/^[+0-9\s\-()]*$/.test(val)) return;
    if (val.length > 25) return;
    setPhone(val);
    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const handleBioChange = (e) => {
    const val = e.target.value;
    if (val.length > 300) return;
    setBio(val);
    if (fieldErrors.bio) setFieldErrors((prev) => ({ ...prev, bio: undefined }));
  };

  const validateProfileFields = () => {
    const errors = {};

    // 1. Strict Name validation
    if (!name.trim()) {
      errors.name = 'Full name is required.';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(name.trim())) {
      errors.name = 'Name can only contain letters, spaces, hyphens, and periods.';
    }

    // 2. Strict Age validation: integers between 18 and 120
    if (!age || !age.trim()) {
      errors.age = 'Age is required (whole numbers only).';
    } else {
      const numAge = parseInt(age, 10);
      if (isNaN(numAge) || !Number.isInteger(numAge) || numAge < 18 || numAge > 120) {
        errors.age = 'Age must be a valid whole number between 18 and 120.';
      }
    }

    // 3. Strict Affiliation length
    if (affiliation && affiliation.length > 120) {
      errors.affiliation = 'Affiliation cannot exceed 120 characters.';
    }

    // 4. Strict ORCID validation (16 chars with hyphens)
    if (orcid && orcid.trim()) {
      const orcidPattern = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
      if (!orcidPattern.test(orcid.trim())) {
        errors.orcid = 'ORCID iD must match 16-character format: 0000-0000-0000-0000';
      }
    }

    // 5. Strict Phone validation (7 to 15 digits)
    if (phone && phone.trim()) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        errors.phone = 'Phone number must contain between 7 and 15 digits.';
      }
    }

    // 6. Strict Bio length
    if (bio && bio.length > 300) {
      errors.bio = 'Bio statement cannot exceed 300 characters.';
    }

    return errors;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errors = validateProfileFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      notify('error', 'Please resolve the strict validation errors in the highlighted fields.');
      return;
    }

    setFieldErrors({});
    setSavingProfile(true);

    const parsedAge = age ? parseInt(age, 10) : null;
    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      age: parsedAge,
      affiliation: affiliation.trim(),
      academicRole,
      researchField,
      orcid: orcid.trim(),
      phone: phone.trim(),
      bio: bio.trim(),
    };

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await api.put(
          '/api/auth/profile',
          {
            name: name.trim(),
            age: parsedAge,
            affiliation: affiliation.trim(),
            academicRole,
            researchField,
            orcid: orcid.trim(),
            phone: phone.trim(),
            bio: bio.trim(),
          }
        );
        if (response.data?.user) {
          Object.assign(updatedUser, response.data.user);
        }
      }
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (onUpdateProfile) onUpdateProfile(updatedUser);
      notify('success', 'Researcher profile and verified credentials updated.');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Profile saved to local workspace cache.';
      localStorage.setItem('user', JSON.stringify(updatedUser));
      if (onUpdateProfile) onUpdateProfile(updatedUser);
      notify(err.response?.status === 400 ? 'error' : 'success', errMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = (e) => {
    e?.preventDefault();
    const prefs = { citationStyle, autoSummarize, graphPhysics, compactView, synthesisDepth };
    localStorage.setItem('pm_preferences', JSON.stringify(prefs));
    notify('success', 'Research workflow and synthesis preferences saved.');
  };

  const handleResetPreferences = () => {
    setCitationStyle('APA');
    setAutoSummarize(true);
    setGraphPhysics(true);
    setCompactView(false);
    setSynthesisDepth('THREE_PILLAR');
    localStorage.setItem('pm_preferences', JSON.stringify({
      citationStyle: 'APA',
      autoSummarize: true,
      graphPhysics: true,
      compactView: false,
      synthesisDepth: 'THREE_PILLAR',
    }));
    notify('info', 'Preferences reset to system defaults.');
  };

  // Real-time password strength analyzer
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', percent: 0, color: 'bg-outline-variant/30', textClass: 'text-secondary' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^a-zA-Z0-9]/.test(newPassword) || /[A-Z]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'WEAK', percent: 25, color: 'bg-error', textClass: 'text-error' };
      case 2:
        return { score: 2, label: 'MODERATE', percent: 50, color: 'bg-amber-500', textClass: 'text-amber-500' };
      case 3:
        return { score: 3, label: 'STRONG', percent: 75, color: 'bg-emerald-500', textClass: 'text-emerald-500' };
      case 4:
        return { score: 4, label: 'EXCELLENT', percent: 100, color: 'bg-emerald-400', textClass: 'text-emerald-400' };
      default:
        return { score: 0, label: '', percent: 0, color: 'bg-outline-variant/30', textClass: 'text-secondary' };
    }
  }, [newPassword]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSecurityFeedback(null);

    if (!currentPassword) {
      const err = 'Please enter your current password.';
      setSecurityFeedback({ type: 'error', text: err });
      notify('error', err);
      return;
    }
    if (newPassword.length < 6) {
      const err = 'New password must be at least 6 characters long.';
      setSecurityFeedback({ type: 'error', text: err });
      notify('error', err);
      return;
    }
    if (newPassword === currentPassword) {
      const err = 'New password cannot be identical to your current password.';
      setSecurityFeedback({ type: 'error', text: err });
      notify('error', err);
      return;
    }
    if (newPassword !== confirmPassword) {
      const err = 'New password and confirmation do not match.';
      setSecurityFeedback({ type: 'error', text: err });
      notify('error', err);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      const err = 'Authentication session expired. Please log in again.';
      setSecurityFeedback({ type: 'error', text: err });
      notify('error', err);
      return;
    }

    try {
      setUpdatingPassword(true);
      const response = await api.put(
        '/api/auth/change-password',
        {
          currentPassword,
          newPassword,
        }
      );

      const successMsg = response.data?.message || 'Security credentials updated successfully.';
      setSecurityFeedback({ type: 'success', text: successMsg });
      notify('success', successMsg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        (err.response?.status === 401
          ? 'Authentication session expired. Please log in again.'
          : 'Failed to update password. Please check your credentials.');
      setSecurityFeedback({ type: 'error', text: errMsg });
      notify('error', errMsg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleExportData = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              system: 'PAPERMIND Research Assistant // Local Zurich Cluster',
              user: currentUser,
              preferences: { citationStyle, autoSummarize, graphPhysics, compactView },
              version: '2.4.0',
            },
            null,
            2
          )
        );
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `papermind_archive_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      notify('success', 'Corpus archive JSON exported successfully.');
    } catch {
      notify('error', 'Failed to generate archive export.');
    }
  };

  const handleClearCache = () => {
    const keysToKeep = ['token', 'user', 'pm_preferences'];
    const preserved = {};
    keysToKeep.forEach((k) => {
      preserved[k] = localStorage.getItem(k);
    });

    localStorage.clear();
    Object.entries(preserved).forEach(([k, v]) => {
      if (v) localStorage.setItem(k, v);
    });

    notify('success', 'Local workspace cache cleared. Session intact.');
  };

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        'Are you strictly sure you want to delete your account? All indexed papers, vector embeddings, notes, and chat history will be permanently eliminated.'
      )
    ) {
      onLogout();
    }
  };

  // Researcher initials
  const initials = (name || 'Researcher')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const tabs = [
    { id: 'PROFILE', label: 'PROFILE', num: '01' },
    { id: 'PREFERENCES', label: 'PREFERENCES', num: '02' },
    { id: 'SECURITY', label: 'SECURITY', num: '03' },
    { id: 'DATA', label: 'DATA & ARCHIVE', num: '04' },
  ];

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-10 py-6 sm:py-10 font-sans animate-fade-in space-y-6 sm:space-y-8">
      {/* 1. Breadcrumb Lineage */}
      <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant uppercase tracking-wider">
        <button
          onClick={onBack}
          className="hover:text-on-surface hover:underline cursor-pointer transition-colors"
        >
          HOME
        </button>
        <span>/</span>
        <span className="text-on-surface font-semibold">SETTINGS</span>
      </div>

      {/* 2. Top Header with User Identity Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 sm:gap-6 pb-6 border-b border-outline-variant/30">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl text-on-surface font-medium tracking-tight">
            SETTINGS
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-2 max-w-xl">
            Configure your researcher identity, synthesis preferences, and secure data storage.
          </p>
        </div>

        {/* User Identity Chip & Logout */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 bg-surface-container-low border border-outline-variant/30 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-inverse-surface text-surface flex items-center justify-center font-bold text-[9px] sm:text-[10px]">
              {initials}
            </span>
            <span className="text-on-surface font-medium truncate max-w-[130px] sm:max-w-[180px]">
              {email}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="font-mono text-xs text-on-surface-variant hover:text-error transition-colors px-3 py-1.5 rounded-full border border-outline-variant/30 hover:border-error/40 cursor-pointer"
            title="End authenticated session"
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 animate-fade-in ${
            statusMsg.type === 'error'
              ? 'bg-error/10 border-error/30 text-error'
              : 'bg-primary-container/10 border-primary-container/40 text-on-surface'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full ${
                statusMsg.type === 'error' ? 'bg-error' : 'bg-primary-container shadow-[0_0_6px_#ff9a2e]'
              }`}
            />
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-on-surface-variant hover:text-on-surface cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2.5 Minimalist Visual Mechanism Strip (Interlocking Horological Gears) */}
      <SettingsGearMechanism />

      {/* 3. Horizontal Minimalist Tab Bar */}
      <div className="flex border-b border-outline-variant/30 space-x-2 sm:space-x-4 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3 sm:px-4 font-mono text-xs tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap relative flex items-center gap-2 ${
                isActive
                  ? 'text-on-surface font-bold border-b-2 border-primary-container'
                  : 'text-secondary hover:text-on-surface hover:border-b-2 hover:border-outline-variant/50'
              }`}
            >
              <span className={`text-[10px] ${isActive ? 'text-primary-container font-semibold' : 'text-on-surface-variant/60'}`}>
                [{tab.num}]
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content Area */}
      <div className="pt-2">
        {/* ======================= TAB 1: PROFILE ======================= */}
        {activeTab === 'PROFILE' && (
          <form onSubmit={handleSaveProfile} className="space-y-8">
            {/* Identity Card */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-inverse-surface text-surface flex items-center justify-center font-display text-2xl font-bold tracking-tight shadow-sm shrink-0">
                    {initials}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-display text-xl text-on-surface font-semibold">
                        {name || 'Researcher'}
                      </h2>
                      <span className="font-mono text-[10px] bg-primary-container/20 text-primary-container border border-primary-container/40 px-2.5 py-0.5 rounded-full font-semibold">
                        {academicRole}
                      </span>
                      {age && (
                        <span className="font-mono text-[10px] bg-surface-container text-on-surface-variant border border-outline-variant/40 px-2 py-0.5 rounded-full">
                          AGE: {age}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-on-surface-variant">
                      {email} · <span className="text-emerald-500 font-semibold">● VERIFIED NODE</span> · {researchField}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right font-mono text-[11px] text-on-surface-variant/70 border sm:border-0 border-outline-variant/20 rounded-xl p-2 sm:p-0">
                  <span className="text-secondary block font-bold uppercase tracking-wider text-[10px]">
                    NODE CREDENTIALS
                  </span>
                  <span>{affiliation || 'Independent Lab'}</span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 1. Full Name */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <span>FULL NAME / TITLE</span>
                      <span className="text-primary-container font-bold">*</span>
                    </label>
                    <span className="font-mono text-[9px] text-on-surface-variant/70 tracking-wider">
                      LETTERS & TITLES ONLY
                    </span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="e.g. Dr. Eleanor Vance"
                    className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                      fieldErrors.name
                        ? 'border-error ring-1 ring-error text-error'
                        : 'border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                    }`}
                    required
                  />
                  {fieldErrors.name ? (
                    <p className="text-[11px] text-error font-mono mt-1.5 flex items-center gap-1">
                      <span>✕</span> {fieldErrors.name}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                      Displayed on manuscripts, analytical briefs, and annotations.
                    </p>
                  )}
                </div>

                {/* 2. Age (Strict numeric input) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary flex items-center gap-1.5">
                      <span>RESEARCHER AGE</span>
                      <span className="text-primary-container font-bold">*</span>
                    </label>
                    <span className="font-mono text-[9px] bg-primary-container/10 text-primary-container px-2 py-0.5 rounded font-bold tracking-wider">
                      NUMBERS ONLY · 18-120
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      value={age}
                      onChange={handleAgeChange}
                      placeholder="e.g. 34"
                      className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                        fieldErrors.age
                          ? 'border-error ring-1 ring-error text-error'
                          : 'border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                      }`}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-mono text-on-surface-variant/60">
                      YRS
                    </div>
                  </div>
                  {fieldErrors.age ? (
                    <p className="text-[11px] text-error font-mono mt-1.5 flex items-center gap-1">
                      <span>✕</span> {fieldErrors.age}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                      Strict numeric entry. Letters, decimals, and negative values are rejected.
                    </p>
                  )}
                </div>

                {/* 3. Institutional Affiliation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary">
                      INSTITUTIONAL AFFILIATION
                    </label>
                    <span className="font-mono text-[9px] text-on-surface-variant/70 tracking-wider">
                      LAB / UNIVERSITY
                    </span>
                  </div>
                  <input
                    type="text"
                    value={affiliation}
                    onChange={(e) => {
                      setAffiliation(e.target.value);
                      if (fieldErrors.affiliation) setFieldErrors((prev) => ({ ...prev, affiliation: undefined }));
                    }}
                    placeholder="e.g. Oxford Institute of AI & Cognitive Sciences"
                    className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                  />
                  {fieldErrors.affiliation ? (
                    <p className="text-[11px] text-error font-mono mt-1.5 flex items-center gap-1">
                      <span>✕</span> {fieldErrors.affiliation}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                      Primary research facility, department, or academic host node.
                    </p>
                  )}
                </div>

                {/* 4. Academic Role / Position */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary">
                      ACADEMIC ROLE / POSITION
                    </label>
                    <span className="font-mono text-[9px] text-on-surface-variant/70 tracking-wider">
                      STANDARDIZED
                    </span>
                  </div>
                  <select
                    value={academicRole}
                    onChange={(e) => setAcademicRole(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm font-sans text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all cursor-pointer"
                  >
                    <option value="Principal Investigator (PI)">Principal Investigator (PI)</option>
                    <option value="Senior Researcher / Scientist">Senior Researcher / Scientist</option>
                    <option value="Postdoctoral Fellow">Postdoctoral Fellow</option>
                    <option value="PhD Candidate / Researcher">PhD Candidate / Researcher</option>
                    <option value="Research Engineer / ML Scientist">Research Engineer / ML Scientist</option>
                    <option value="Graduate Student">Graduate Student</option>
                    <option value="Independent Scholar">Independent Scholar</option>
                  </select>
                  <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                    Defines authorship tier and telemetry identity in collaboration matrix.
                  </p>
                </div>

                {/* 5. Primary Research Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary">
                      PRIMARY RESEARCH FIELD
                    </label>
                    <span className="font-mono text-[9px] text-on-surface-variant/70 tracking-wider">
                      TAXONOMY
                    </span>
                  </div>
                  <select
                    value={researchField}
                    onChange={(e) => setResearchField(e.target.value)}
                    className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm font-sans text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all cursor-pointer"
                  >
                    <option value="Artificial Intelligence & Machine Learning">Artificial Intelligence & Machine Learning</option>
                    <option value="Natural Language Processing (NLP)">Natural Language Processing (NLP)</option>
                    <option value="Computer Vision & Multimodal Systems">Computer Vision & Multimodal Systems</option>
                    <option value="Computational Neuroscience & CogSci">Computational Neuroscience & CogSci</option>
                    <option value="Robotics & Autonomous Systems">Robotics & Autonomous Systems</option>
                    <option value="Bioinformatics & Genomics">Bioinformatics & Genomics</option>
                    <option value="Quantum Computing & Information">Quantum Computing & Information</option>
                    <option value="Other / Interdisciplinary AI">Other / Interdisciplinary AI</option>
                  </select>
                  <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                    Informs semantic clustering and citation relevance ranking.
                  </p>
                </div>

                {/* 6. ORCID iD (Strict Format) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary">
                      ORCID iD
                    </label>
                    <span className="font-mono text-[9px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded tracking-wider border border-outline-variant/30">
                      0000-0000-0000-0000
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={19}
                    value={orcid}
                    onChange={handleOrcidChange}
                    placeholder="0000-0002-1825-0097"
                    className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                      fieldErrors.orcid
                        ? 'border-error ring-1 ring-error text-error'
                        : 'border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                    }`}
                  />
                  {fieldErrors.orcid ? (
                    <p className="text-[11px] text-error font-mono mt-1.5 flex items-center gap-1">
                      <span>✕</span> {fieldErrors.orcid}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                      16-digit Open Researcher Contributor ID. Automatically formats hyphens.
                    </p>
                  )}
                </div>

                {/* 7. Contact Phone (Strict dialing characters) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary">
                      CONTACT PHONE / EXTENSION
                    </label>
                    <span className="font-mono text-[9px] text-on-surface-variant/70 tracking-wider">
                      7-15 DIGITS
                    </span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+1 (555) 234-5678"
                    className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all ${
                      fieldErrors.phone
                        ? 'border-error ring-1 ring-error text-error'
                        : 'border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                    }`}
                  />
                  {fieldErrors.phone ? (
                    <p className="text-[11px] text-error font-mono mt-1.5 flex items-center gap-1">
                      <span>✕</span> {fieldErrors.phone}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                      Only numbers and international dialing characters (+, -, parentheses) accepted.
                    </p>
                  )}
                </div>

                {/* 8. Authenticated Email Address (Read-Only) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-secondary">
                      AUTHENTICATED EMAIL ADDRESS (READ-ONLY)
                    </label>
                    <span className="text-[9px] font-mono text-primary-container bg-primary-container/10 px-2 py-0.5 rounded font-bold">
                      PRIMARY KEY
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="flex-1 bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm font-mono text-on-surface-variant opacity-80 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                    Cryptographic node identifier. Contact cluster administrator to change.
                  </p>
                </div>
              </div>

              {/* 9. Bio / Statement (with character counter) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-secondary">
                    RESEARCH STATEMENT / BIO
                  </label>
                  <span className={`font-mono text-[10px] ${
                    bio.length >= 280 ? 'text-amber-500 font-bold' : 'text-on-surface-variant/70'
                  }`}>
                    {bio.length} / 300 CHARACTERS
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={bio}
                  onChange={handleBioChange}
                  placeholder="Summarize your primary scientific focus, current hypotheses, and analytical methodologies..."
                  className={`w-full bg-surface border rounded-xl p-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all resize-none ${
                    fieldErrors.bio
                      ? 'border-error ring-1 ring-error text-error'
                      : 'border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                  }`}
                />
                {fieldErrors.bio ? (
                  <p className="text-[11px] text-error font-mono mt-1.5 flex items-center gap-1">
                    <span>✕</span> {fieldErrors.bio}
                  </p>
                ) : (
                  <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                    Concise academic summary shared in institutional exports and collaboration packets.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setName(currentUser?.name || '');
                  setAge(currentUser?.age !== undefined && currentUser?.age !== null ? String(currentUser.age) : '');
                  setAffiliation(currentUser?.affiliation || '');
                  setAcademicRole(currentUser?.academicRole || 'Senior Researcher / Scientist');
                  setResearchField(currentUser?.researchField || 'Artificial Intelligence & Machine Learning');
                  setOrcid(currentUser?.orcid || '');
                  setPhone(currentUser?.phone || '');
                  setBio(currentUser?.bio || '');
                  setFieldErrors({});
                  notify('info', 'Form reverted to currently saved credentials.');
                }}
                className="btn-ghost !h-11 !px-5 !text-xs cursor-pointer border border-outline-variant/40"
              >
                RESET VALUES
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary !h-11 !px-8 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingProfile ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                    <span>SAVING CREDENTIALS...</span>
                  </>
                ) : (
                  <span>SAVE PROFILE CHANGES</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ======================= TAB 2: PREFERENCES ======================= */}
        {activeTab === 'PREFERENCES' && (
          <div className="space-y-6">
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="font-display text-xl text-on-surface font-semibold">
                  RESEARCH WORKFLOW DEFAULTS
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Customize citation formats, AI synthesis pipelines, and interface responsiveness.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-outline-variant/20 pt-2">
                {/* Setting 1: Citation Standard */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-medium text-sm text-on-surface block">
                      Default Citation Format
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      Bibliographic reference standard applied across exports and paper detail views.
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <select
                      value={citationStyle}
                      onChange={(e) => setCitationStyle(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container cursor-pointer transition-all"
                    >
                      <option value="APA">APA 7th Edition</option>
                      <option value="IEEE">IEEE Reference Style</option>
                      <option value="NATURE">Nature / Science Style</option>
                      <option value="CHICAGO">Chicago Manual of Style</option>
                      <option value="BIBTEX">Raw BibTeX Format</option>
                    </select>
                  </div>
                </div>

                {/* Setting 2: Analytical Synthesis Depth */}
                <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <span className="font-medium text-sm text-on-surface block">
                      Synthesis Briefing Profile
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      Defines structural detail and reasoning granularity for automatic paper briefings.
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <select
                      value={synthesisDepth}
                      onChange={(e) => setSynthesisDepth(e.target.value)}
                      className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container cursor-pointer transition-all"
                    >
                      <option value="THREE_PILLAR">3-Pillar Analysis (Problem, Solution, Impact)</option>
                      <option value="EXECUTIVE">Executive Abstract (High-Speed Summary)</option>
                      <option value="TECHNICAL">Technical Deep-Dive (Methodology & Bounds)</option>
                    </select>
                  </div>
                </div>

                {/* Setting 3: Auto Summarization */}
                <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-on-surface block">
                        Automatic Ingestion Briefing
                      </span>
                      {autoSummarize && (
                        <span className="font-mono text-[9px] bg-primary-container/20 text-primary-container px-2 py-0.5 rounded font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Generate structured scientific briefings immediately after chunking and vectorizing manuscripts.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSummarize}
                    onClick={() => setAutoSummarize(!autoSummarize)}
                    className={`w-14 h-7 rounded-full transition-colors duration-200 p-0.5 flex items-center cursor-pointer shadow-inner ${
                      autoSummarize ? 'bg-primary-container justify-end' : 'bg-surface-container-high justify-start'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-surface shadow-md transition-transform" />
                  </button>
                </div>

                {/* Setting 4: Citation Graph Physics */}
                <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-on-surface block">
                        Hardware Verlet Spring Physics
                      </span>
                      {graphPhysics && (
                        <span className="font-mono text-[9px] bg-primary-container/20 text-primary-container px-2 py-0.5 rounded font-bold">
                          60 FPS
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Enable real-time spring relaxation and smooth kinetic orbiting in the Citation Topology Graph.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={graphPhysics}
                    onClick={() => setGraphPhysics(!graphPhysics)}
                    className={`w-14 h-7 rounded-full transition-colors duration-200 p-0.5 flex items-center cursor-pointer shadow-inner ${
                      graphPhysics ? 'bg-primary-container justify-end' : 'bg-surface-container-high justify-start'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-surface shadow-md transition-transform" />
                  </button>
                </div>

                {/* Setting 5: Compact Document List */}
                <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <span className="font-medium text-sm text-on-surface block">
                      High-Density Library Grid
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      Display manuscript records with reduced whitespace padding for dense archive browsing.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={compactView}
                    onClick={() => setCompactView(!compactView)}
                    className={`w-14 h-7 rounded-full transition-colors duration-200 p-0.5 flex items-center cursor-pointer shadow-inner ${
                      compactView ? 'bg-primary-container justify-end' : 'bg-surface-container-high justify-start'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-surface shadow-md transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetPreferences}
                className="btn-ghost !h-11 !px-5 !text-xs cursor-pointer border border-outline-variant/40"
              >
                RESET TO DEFAULTS
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="btn-primary !h-11 !px-8 cursor-pointer shadow-sm"
              >
                SAVE PREFERENCES
              </button>
            </div>
          </div>
        )}

        {/* ======================= TAB 3: SECURITY ======================= */}
        {activeTab === 'SECURITY' && (
          <div className="space-y-8">
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="font-display text-xl text-on-surface font-semibold">
                    AUTHENTICATION CREDENTIALS
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Update your account password. Strong passwords contain at least 8 characters with numbers or symbols.
                  </p>
                </div>

                {/* Inline Security Feedback Banner */}
                {securityFeedback && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 animate-fade-in ${
                      securityFeedback.type === 'error'
                        ? 'bg-error/10 border-error/30 text-error'
                        : 'bg-primary-container/10 border-primary-container/40 text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          securityFeedback.type === 'error' ? 'bg-error animate-pulse' : 'bg-primary-container shadow-[0_0_6px_#ff9a2e]'
                        }`}
                      />
                      <span>{securityFeedback.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSecurityFeedback(null)}
                      className="text-on-surface-variant hover:text-on-surface cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                  {/* Current Password Field */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-secondary">
                        CURRENT PASSWORD
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="font-mono text-[10px] text-on-surface-variant hover:text-on-surface cursor-pointer select-none transition-colors"
                      >
                        {showCurrentPass ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (securityFeedback) setSecurityFeedback(null);
                        }}
                        placeholder={showCurrentPass ? 'Enter current password' : '••••••••'}
                        className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all pr-10 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface p-1 cursor-pointer transition-colors"
                        title={showCurrentPass ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPass ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password Field */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-secondary">
                        NEW PASSWORD
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="font-mono text-[10px] text-on-surface-variant hover:text-on-surface cursor-pointer select-none transition-colors"
                      >
                        {showNewPass ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (securityFeedback) setSecurityFeedback(null);
                        }}
                        placeholder={showNewPass ? 'Enter new password' : '••••••••'}
                        className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all pr-10 font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface p-1 cursor-pointer transition-colors"
                        title={showNewPass ? 'Hide password' : 'Show password'}
                      >
                        {showNewPass ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="mt-2 space-y-1 animate-fade-in">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-on-surface-variant">STRENGTH:</span>
                          <span className={`font-bold ${passwordStrength.textClass}`}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1.5 w-full">
                          <div className={`rounded-full transition-colors ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-outline-variant/30'}`} />
                          <div className={`rounded-full transition-colors ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-outline-variant/30'}`} />
                          <div className={`rounded-full transition-colors ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-outline-variant/30'}`} />
                          <div className={`rounded-full transition-colors ${passwordStrength.score >= 4 ? passwordStrength.color : 'bg-outline-variant/30'}`} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password Field */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-secondary">
                        CONFIRM NEW PASSWORD
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="font-mono text-[10px] text-on-surface-variant hover:text-on-surface cursor-pointer select-none transition-colors"
                      >
                        {showConfirmPass ? 'HIDE' : 'SHOW'}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (securityFeedback) setSecurityFeedback(null);
                        }}
                        placeholder={showConfirmPass ? 'Confirm new password' : '••••••••'}
                        className={`w-full bg-surface border rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none transition-all pr-10 font-mono ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-amber-500/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                            : confirmPassword && confirmPassword === newPassword
                            ? 'border-emerald-500/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                            : 'border-outline-variant/40 focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface p-1 cursor-pointer transition-colors"
                        title={showConfirmPass ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPass ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Live Match Status */}
                    {confirmPassword && (
                      <div className="mt-2 text-[10px] font-mono animate-fade-in">
                        {confirmPassword === newPassword ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1">
                            <span>✓</span> Passwords match
                          </span>
                        ) : (
                          <span className="text-amber-500 font-semibold flex items-center gap-1">
                            <span>✕</span> Passwords do not match yet
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label
                    htmlFor="toggle-show-all-passwords"
                    className="flex items-center gap-2.5 text-xs font-mono text-on-surface-variant cursor-pointer select-none"
                  >
                    <input
                      id="toggle-show-all-passwords"
                      type="checkbox"
                      checked={allPasswordsShown}
                      onChange={toggleAllPasswords}
                      className="w-4 h-4 accent-primary-container rounded cursor-pointer"
                    />
                    <span>Show password characters across all fields</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="btn-primary !h-11 !px-8 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {updatingPassword ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin inline-block" />
                      <span>VERIFYING & UPDATING...</span>
                    </>
                  ) : (
                    'UPDATE PASSWORD'
                  )}
                </button>
              </div>
            </form>

            {/* Session Security Overview */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 sm:p-8 space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-on-surface">
                SESSION SECURITY TELEMETRY
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 bg-surface rounded-xl border border-outline-variant/20 space-y-1">
                  <span className="text-secondary text-[10px] block">AUTHENTICATION</span>
                  <p className="font-semibold text-on-surface">JWT Session Bearer</p>
                  <p className="text-[10px] text-on-surface-variant">Active & Verified</p>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-outline-variant/20 space-y-1">
                  <span className="text-secondary text-[10px] block">PASSWORD HASHER</span>
                  <p className="font-semibold text-on-surface">bcrypt (10 rounds)</p>
                  <p className="text-[10px] text-on-surface-variant">Cryptographic Salt</p>
                </div>
                <div className="p-4 bg-surface rounded-xl border border-outline-variant/20 space-y-1">
                  <span className="text-secondary text-[10px] block">ISOLATION</span>
                  <p className="font-semibold text-on-surface">Air-Gapped Node</p>
                  <p className="text-[10px] text-on-surface-variant">Zero Cloud Telemetry</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 4: DATA & ARCHIVE ======================= */}
        {activeTab === 'DATA' && (
          <div className="space-y-8">
            {/* Archive Export Card */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-6 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display text-xl text-on-surface font-semibold">
                  RESEARCH ARCHIVE EXPORT
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Download your complete research memory as a structured, machine-readable JSON backup.
                </p>
              </div>

              <div className="p-4 bg-surface rounded-xl border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-bold text-on-surface block">
                    Full Scientific Corpus Snapshot
                  </span>
                  <p className="text-xs text-on-surface-variant">
                    Includes manuscript metadata, problem statements, key takeaways, and system preferences.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="btn-secondary !h-10 !px-5 !text-xs shrink-0 cursor-pointer"
                >
                  DOWNLOAD JSON ARCHIVE ↗
                </button>
              </div>

              {/* Cache Management */}
              <div className="p-4 bg-surface rounded-xl border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-mono text-xs font-bold text-on-surface block">
                    Local Query & Document Cache
                  </span>
                  <p className="text-xs text-on-surface-variant">
                    Clear local browser cache if experiencing stale search indexes or UI latency.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="font-mono text-xs px-4 py-2 border border-outline-variant/40 rounded-full hover:bg-surface-container cursor-pointer transition-colors shrink-0"
                >
                  CLEAR CACHE
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-error/30 bg-error/[0.02] rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-error">
                <span className="w-2 h-2 rounded-full bg-error" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold">
                  DANGER ZONE // PERMANENT DELETION
                </h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed max-w-2xl">
                Erasing your account permanently removes your vector embeddings, scientific summaries, research notes, and conversation sessions from the Zurich cluster. This action cannot be reversed.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="inline-flex items-center justify-center h-10 px-6 border border-error text-error rounded-full font-mono text-xs hover:bg-error hover:text-white transition-all cursor-pointer font-bold tracking-wider"
                >
                  DELETE RESEARCHER ACCOUNT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
