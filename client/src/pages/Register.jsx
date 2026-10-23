import React, { useState } from 'react';
import api from '../api/apiClient';
import WireframeMesh from '../components/WireframeMesh';
import PapermindLogo from '../components/PapermindLogo';

/**
 * Page 2 — Register (/register)
 * Split screen 50/50 matching Stitch prompt:
 * - Left light grey: logo "PAPERMIND", "START YOUR LIBRARY", underlined inputs, strength meter, black pill CREATE ACCOUNT
 * - Right dark scene with amber node-mesh: "Your papers stay private to your account."
 */
const Register = ({ onRegisterSuccess, onSwitchToLogin, onBackToLanding }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!agreeTerms) {
      setError('You must agree to the workspace terms.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setSuccess('Account created successfully. Redirecting to sign in…');
      setTimeout(() => {
        onRegisterSuccess();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = Math.min(4, Math.floor(formData.password.length / 2));
  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans">
      {/* Left Column (Light Canvas bg-surface) */}
      <div className="w-full md:w-1/2 p-8 sm:p-14 lg:p-20 flex flex-col justify-between border-r border-outline-variant/30 min-h-[580px]">
        {/* Top Minimal Bar */}
        <div className="flex justify-between items-center mb-6">
          <div
            onClick={onBackToLanding}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Return to Homepage"
          >
            <PapermindLogo size={24} className="group-hover:scale-105 transition-transform" />
            <span className="font-display text-xl tracking-tight text-on-surface group-hover:text-primary transition-colors">
              PAPERMIND
            </span>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="font-nav-label text-[11px] text-on-surface hover:text-primary-container transition-colors cursor-pointer"
          >
            LOGIN ↗
          </button>
        </div>

        {/* Center Content */}
        <div className="max-w-md w-full mx-auto my-auto py-6 space-y-7 animate-fade-in">
          <div className="space-y-2">
            <span className="font-nav-label text-[10px] text-on-surface-variant tracking-widest block">
              NEW RESEARCHER
            </span>
            <h1 className="font-display text-4xl sm:text-5xl text-on-surface">
              START YOUR LIBRARY
            </h1>
          </div>

          {error && (
            <div className="text-xs text-error border-l-2 border-error pl-3 py-1">
              {error}
            </div>
          )}

          {success && (
            <div className="text-xs text-on-surface border-l-2 border-primary-container pl-3 py-1 bg-primary-container/10">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-nav-label text-[10px] text-on-surface-variant mb-1">
                FULL NAME
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. Jane Doe"
                className="w-full bg-transparent border-b border-outline-variant/50 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                required
              />
            </div>

            <div>
              <label className="block font-nav-label text-[10px] text-on-surface-variant mb-1">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="researcher@university.edu"
                className="w-full bg-transparent border-b border-outline-variant/50 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-nav-label text-[10px] text-on-surface-variant">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="font-nav-label text-[9px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-outline-variant/50 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                required
              />

              {/* 4-segment strength meter */}
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength >= seg ? 'bg-primary-container' : 'bg-outline-variant/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block font-nav-label text-[10px] text-on-surface-variant mb-1">
                CONFIRM PASSWORD
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-outline-variant/50 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="accent-primary-container cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-on-surface-variant cursor-pointer select-none">
                I agree to the privacy policy & document processing terms
              </label>
            </div>

            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-nav-label text-[10px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  ALREADY HAVE AN ACCOUNT? LOGIN →
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Bottom Counter */}
        <div className="flex justify-between items-center text-xs font-mono-counter text-on-surface-variant pt-8">
          <span>001 / 002</span>
          <span className="font-nav-label text-[10px]">INITIAL REGISTRATION</span>
        </div>

        {/* Archival Security Footer */}
        <div className="pt-4 mt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-mono text-on-surface-variant/70">
          <span>PRIVATE LOCAL CLUSTER</span>
          <span>AES-256 ENCRYPTED CREDENTIALS</span>
        </div>
      </div>

      {/* Right Column (Dark Scene Panel #1b1c1c) */}
      <div className="w-full md:w-1/2 min-h-[450px] md:min-h-screen">
        <WireframeMesh
          caption="Your papers stay private to your account."
          showRing={true}
          showScrollIcon={false}
          showShare={false}
        />
      </div>
    </div>
  );
};

export default Register;
