import React, { useState } from 'react';
import api from '../api/apiClient';
import WireframeMesh from '../components/WireframeMesh';
import PapermindLogo from '../components/PapermindLogo';

/**
 * Page 3b — Forgot Password (/forgot-password)
 * Split-screen 50/50 matching Stitch design prompt with 3 states:
 * Frame 1: RESET PASSWORD
 * Frame 2: CHECK YOUR INBOX
 * Frame 3: NEW PASSWORD
 */
const ForgotPassword = ({ onBackToLogin, onResetComplete, onBackToLanding }) => {
  const [frame, setFrame] = useState(1); // 1, 2, 3
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendReset = (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFrame(2);
    }, 500);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        email: email.trim(),
        newPassword,
      });

      alert('Password updated successfully. You can now log in.');
      if (onResetComplete) onResetComplete();
      else onBackToLogin();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password. Verify email address.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = Math.min(4, Math.floor(newPassword.length / 2));
  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans">
      {/* Left Column (Light Canvas bg-surface) */}
      <div className="w-full md:w-1/2 p-5 sm:p-14 lg:p-20 flex flex-col justify-between border-r border-outline-variant/30 min-h-[500px]">
        {/* Top Minimal Bar */}
        <div className="flex justify-between items-center mb-4 sm:mb-8">
          <div
            onClick={onBackToLanding || onBackToLogin}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="Return to Homepage"
          >
            <PapermindLogo size={24} className="group-hover:scale-105 transition-transform" />
            <span className="font-display text-xl tracking-tight text-on-surface group-hover:text-primary transition-colors">
              PAPERMIND
            </span>
          </div>
          <button
            onClick={onBackToLogin}
            className="font-nav-label text-on-surface hover:text-primary-container transition-colors cursor-pointer"
          >
            LOGIN ↗
          </button>
        </div>

        {/* Mobile 3D Amber Sculpture Banner (< md) */}
        <div className="md:hidden w-full h-[180px] xs:h-[210px] mb-5 rounded-2xl overflow-hidden border border-outline-variant/30 relative bg-[#181818] shadow-md">
          <WireframeMesh
            caption="Zero-knowledge cryptographic recovery."
            showRing={true}
            compact={true}
            height="100%"
          />
        </div>

        {/* Center Form Content */}
        <div className="max-w-md w-full mx-auto my-auto py-2 sm:py-8">
          {frame === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="font-display text-4xl sm:text-5xl text-on-surface">
                  RESET PASSWORD
                </h1>
                <p className="text-sm text-on-surface-variant">
                  Enter your email address and we'll dispatch a secure recovery token.
                </p>
              </div>

              {error && (
                <div className="text-xs text-error border-l-2 border-error pl-3 py-1">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendReset} className="space-y-6">
                <div>
                  <label className="block font-nav-label text-[10px] text-on-surface-variant mb-1">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@university.edu"
                    className="w-full bg-transparent border-b border-outline-variant/50 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                    required
                  />
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'SENDING...' : 'SEND RESET LINK'}
                  </button>
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="font-nav-label text-[10px] text-on-surface-variant hover:text-on-surface text-center pt-2 cursor-pointer"
                  >
                    ← BACK TO LOGIN
                  </button>
                </div>
              </form>
            </div>
          )}

          {frame === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="font-display text-4xl sm:text-5xl text-on-surface">
                  CHECK YOUR INBOX
                </h1>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  If an account exists for <span className="font-mono text-xs text-on-surface font-semibold">{email}</span>, a reset link is on its way.
                </p>
              </div>

              <div className="p-5 border border-outline-variant/30 rounded-2xl bg-surface-container-low text-xs text-on-surface-variant space-y-2">
                <p className="font-nav-label text-[10px] text-on-surface font-bold">DEMO PROTOTYPE SHORTCUT</p>
                <p>For instant testing without email delays, continue to set a new password below.</p>
                <button
                  onClick={() => setFrame(3)}
                  className="text-xs font-bold text-primary-container hover:underline uppercase tracking-wider pt-1 block cursor-pointer"
                >
                  Proceed to New Password Frame →
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => alert(`Reset link re-sent to ${email}`)}
                  className="btn-secondary flex-1"
                >
                  RESEND
                </button>
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="btn-primary flex-1"
                >
                  BACK TO LOGIN
                </button>
              </div>
            </div>
          )}

          {frame === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-2">
                <h1 className="font-display text-4xl sm:text-5xl text-on-surface">
                  NEW PASSWORD
                </h1>
                <p className="text-sm text-on-surface-variant">
                  Create a strong password for your account.
                </p>
              </div>

              {error && (
                <div className="text-xs text-error border-l-2 border-error pl-3 py-1">
                  {error}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-nav-label text-[10px] text-on-surface-variant">
                      NEW PASSWORD
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                          passwordStrength >= seg ? 'bg-primary-container' : 'bg-outline-variant/30'
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent border-b border-outline-variant/50 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Counter */}
        <div className="flex justify-between items-center text-xs font-mono-counter text-on-surface-variant pt-8">
          <span>001 / 003</span>
          <span className="font-nav-label text-[10px]">SECURITY DISPATCH</span>
        </div>

        {/* Archival Security Footer */}
        <div className="pt-4 mt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-mono text-on-surface-variant/70">
          <span>CRYPTOGRAPHIC RECOVERY</span>
          <span>DETERMINISTIC TOKEN VERIFICATION</span>
        </div>
      </div>

      {/* Right Column (Dark Scene Panel with Wireframe Mesh) - Desktop */}
      <div className="hidden md:block w-full md:w-1/2 min-h-[450px] md:min-h-screen">
        <WireframeMesh
          caption="Credentials encrypted via bcrypt with 10 salt rounds."
          showRing={true}
          showScrollIcon={false}
          showShare={false}
        />
      </div>
    </div>
  );
};

export default ForgotPassword;
