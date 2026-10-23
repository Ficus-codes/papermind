import React from 'react';
import PapermindLogo from './PapermindLogo';

/**
 * AppFooter
 * Professional, architectural dark footer for the Papermind workspace.
 * Strongly differentiated from the light sticky header.
 * Matches the deep dark theme accents (wireframe canvas, citation graph, ask library drawer).
 */
const AppFooter = ({ onNavigate, currentView, currentUser }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { label: 'Research Home', view: 'home', code: '01' },
    { label: 'Manuscript Library', view: 'library', code: '02' },
    { label: 'Synthesis Chat', view: 'chat', code: '03' },
    { label: 'Citation Graph', view: 'graph', code: '04' },
    { label: 'Upload Manuscript', view: 'upload', code: '05' },
  ];

  return (
    <footer className="w-full bg-[#181919] border-t border-white/10 mt-20 pt-12 pb-8 font-sans text-[#e3e2e2] shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-12">
        {/* Main Grid: 3 Distinct Architectural Sections */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-white/10">
          
          {/* Column 1: Archival Brand & Purpose (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <div
              onClick={() => onNavigate && onNavigate('home')}
              className="flex items-center gap-2.5 cursor-pointer group select-none w-fit"
              title="Return to Research Home"
            >
              <PapermindLogo size={24} className="group-hover:scale-105 transition-transform" />
              <div className="flex items-center gap-1.5 font-counter-mono text-counter-mono text-white/60 border border-white/15 px-2 py-0.5 rounded-sm bg-white/5">
                <span>[PM-ARCHIVE]</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
              </div>
              <span className="font-label-nav text-label-nav text-white uppercase tracking-[0.2em] font-bold group-hover:text-primary-container transition-colors">
                PAPERMIND
              </span>
            </div>

            <p className="text-xs text-[#a8a8a8] leading-relaxed max-w-sm">
              Autonomous academic literature synthesis, page-grounded citations, and topological graph analysis for researchers.
            </p>

            {/* System Telemetry Badges */}
            <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono text-white/50">
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                NODE CLUSTER: ZURICH
              </span>
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                1536-DIM VECTOR CORE
              </span>
              <span className="px-2 py-1 rounded bg-white/5 border border-white/10">
                LATENCY: 42MS
              </span>
            </div>
          </div>

          {/* Column 2: Workspace Navigation (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <p className="font-counter-mono text-[10px] text-white/50 tracking-wider uppercase">
              [01] // WORKSPACE MODULES
            </p>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <li key={item.view}>
                    <button
                      onClick={() => onNavigate && onNavigate(item.view)}
                      className={`text-xs font-mono tracking-wide transition-all cursor-pointer flex items-center gap-2 group text-left ${
                        isActive
                          ? 'text-[#FF9A2E] font-semibold translate-x-1'
                          : 'text-[#a8a8a8] hover:text-white hover:translate-x-0.5'
                      }`}
                    >
                      <span className={`text-[9px] font-counter-mono ${isActive ? 'text-[#FF9A2E]' : 'text-white/30 group-hover:text-white/60'}`}>
                        [{item.code}]
                      </span>
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9A2E] ml-1"></span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Column 3: Dedicated System Configuration & Account (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <p className="font-counter-mono text-[10px] text-white/50 tracking-wider uppercase">
              [02] // SYSTEM & PREFERENCES
            </p>

            {/* Researcher Session Pill */}
            {currentUser && (
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono space-y-1">
                <div className="text-[10px] text-white/50 font-counter-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>ACTIVE RESEARCHER</span>
                </div>
                <p className="font-semibold text-white truncate text-[11px]">
                  {currentUser.name || currentUser.email || 'Researcher'}
                </p>
                {currentUser.role && (
                  <p className="text-[10px] text-[#a8a8a8] uppercase truncate">
                    {currentUser.role}
                  </p>
                )}
              </div>
            )}

            {/* Professional Settings & Profile Button */}
            <button
              onClick={() => onNavigate && onNavigate('settings')}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer group text-left ${
                currentView === 'settings'
                  ? 'bg-primary-container/20 border-primary-container shadow-[0_0_12px_rgba(255,154,46,0.25)]'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 hover:border-white/30'
              }`}
              title="Configure Researcher Profile, Models, and Engine Settings"
            >
              <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-[#FF9A2E] text-base group-hover:rotate-90 transition-transform duration-500 shrink-0">
                ⚙
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-counter-mono text-[#FF9A2E] tracking-wider uppercase font-semibold">
                  SYSTEM CONFIG
                </span>
                <span className="font-sans font-semibold text-xs text-white group-hover:text-primary-container transition-colors truncate">
                  Preferences & Profile
                </span>
              </div>
              <span className="text-white/40 text-xs ml-auto group-hover:translate-x-0.5 group-hover:text-white transition-all">
                →
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Editorial Note, and Back to Top */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-white/50">
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start text-[11px]">
            <span>© {new Date().getFullYear()} PAPERMIND ARCHIVAL INC.</span>
            <span>·</span>
            <span>ALL RIGHTS RESERVED</span>
            <span>·</span>
            <span className="text-white/40">EDITORIAL MODERNISM</span>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-white/60 hover:text-primary-container transition-colors cursor-pointer font-bold tracking-wider text-[11px] uppercase group"
            title="Scroll to top of page"
          >
            <span>BACK TO TOP</span>
            <span className="group-hover:-translate-y-0.5 transition-transform text-[#FF9A2E]">↑</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
