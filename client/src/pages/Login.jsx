import React, { useState } from 'react';
import api from '../api/apiClient';
import WireframeMesh from '../components/WireframeMesh';
import PapermindLogo from '../components/PapermindLogo';

/**
 * Page 3 — Login (/login)
 * Split screen 50/50 matching Stitch prompt:
 * - Left light grey: logo "PAPERMIND", "WELCOME BACK", underlined inputs, black pill LOGIN
 * - Right dark scene with amber node-mesh: "Pick up where you left off."
 */
const Login = ({ onLoginSuccess, onSwitchToRegister, onForgotPassword, onBackToLanding }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', {
        email: email.trim(),
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.setItem('user', JSON.stringify({ email: email.trim() }));
      }
      onLoginSuccess();
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to authentication server. Please check your connection or backend service.');
      } else {
        setError(err.response?.data?.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (type = 'primary') => {
    if (type === 'primary') {
      setEmail('test1@example.com');
      setPassword('12345678');
    } else {
      setEmail('test@example.com');
      setPassword('password123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans">
      {/* Left Column (Light Canvas bg-surface) */}
      <div className="w-full md:w-1/2 p-8 sm:p-14 lg:p-20 flex flex-col justify-between border-r border-outline-variant/30 min-h-[560px]">
        {/* Top Minimal Bar */}
        <div className="flex justify-between items-center mb-8">
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
            onClick={onSwitchToRegister}
            className="font-nav-label text-[11px] text-on-surface hover:text-primary-container transition-colors cursor-pointer"
          >
            CREATE ACCOUNT ↗
          </button>
        </div>

        {/* Center Content */}
        <div className="max-w-md w-full mx-auto my-auto py-6 space-y-8 animate-fade-in">
          <div className="space-y-2">
            <span className="font-nav-label text-[10px] text-on-surface-variant tracking-widest block">
              AUTHENTICATION
            </span>
            <h1 className="font-display text-4xl sm:text-5xl text-on-surface">
              WELCOME BACK
            </h1>
          </div>

          {/* Quick Demo Fill Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-container-low border border-outline-variant/30 rounded-2xl text-xs text-on-surface-variant">
            <span className="font-nav-label text-[10px] text-on-surface-variant font-bold">SAVED CREDENTIALS</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('primary')}
                className="text-[10px] font-bold text-primary-container hover:underline uppercase tracking-wider cursor-pointer"
                title="Account: test1@example.com (saurav)"
              >
                Primary Account ⚡
              </button>
              <span className="text-outline-variant/60">·</span>
              <button
                type="button"
                onClick={() => handleDemoFill('test')}
                className="text-[10px] text-on-surface-variant hover:text-on-surface hover:underline uppercase tracking-wider cursor-pointer"
                title="Account: test@example.com"
              >
                Test User
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-error border-l-2 border-error pl-3 py-1 bg-error/5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-nav-label text-[10px] text-on-surface-variant">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="font-nav-label text-[10px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  FORGOT PASSWORD?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-b border-outline-variant/50 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container transition-colors pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-2 font-nav-label text-[9px] text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'SIGNING IN...' : 'LOGIN'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-nav-label text-[10px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  NEW HERE? CREATE ACCOUNT →
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Bottom Counter */}
        <div className="flex justify-between items-center text-xs font-mono-counter text-on-surface-variant pt-8">
          <span>001 / 002</span>
          <span className="font-nav-label text-[10px]">SESSION GATEWAY</span>
        </div>

        {/* Archival Security Footer */}
        <div className="pt-4 mt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-mono text-on-surface-variant/70">
          <span>AIR-GAPPED VECTOR ARCHIVE</span>
          <span>LOCAL ZERO-TELEMETRY HANDSHAKE</span>
        </div>
      </div>

      {/* Right Column (Dark Scene Panel #1b1c1c) */}
      <div className="w-full md:w-1/2 min-h-[450px] md:min-h-screen">
        <WireframeMesh
          caption="Pick up where you left off."
          showRing={true}
          showScrollIcon={false}
          showShare={false}
        />
      </div>
    </div>
  );
};

export default Login;
