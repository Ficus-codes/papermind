import React, { useState } from 'react';
import PapermindLogo from '../components/PapermindLogo';
import HeroResearchMesh from '../components/HeroResearchMesh';

/**
 * PAPERMIND Architectural Editorial Landing Page
 * Swiss Modernism & Editorial Brutalism
 * High-fidelity implementation based on Stitch Design System
 */
const LandingPage = ({
  onGetStarted,
  onUploadClick,
  onLoginClick,
  onViewChange,
  isAuthenticated = false,
  currentUser = null,
}) => {
  const [citationCopied, setCitationCopied] = useState(false);
  const [showCitationPreview, setShowCitationPreview] = useState(false);
  const [activeNav, setActiveNav] = useState('main');

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'PAPERMIND — Architectural Research Synthesis',
          text: 'Upload research papers and chat with them. Grounded, page-level citation intelligence.',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCitationCopied(true);
        setTimeout(() => setCitationCopied(false), 2500);
      }
    } catch {
      // User cancelled share or clipboard denied
    }
  };

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    setActiveNav(sectionId);
    if (sectionId === 'main') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-primary-container selection:text-on-surface w-full min-h-screen">
      {/* Toast Notification for Share / Copy */}
      {citationCopied && (
        <div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-on-primary font-counter-mono text-counter-mono px-4 py-2.5 rounded shadow-2xl flex items-center gap-2 border border-white/20 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
          <span>LINK COPIED TO CLIPBOARD [PM-ARCHIVE]</span>
        </div>
      )}

      {/* FIXED TOP NAVIGATION HEADER */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30">
        <div className="h-16 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <PapermindLogo size={24} className="hover:scale-105 transition-transform" />
            <span className="hidden sm:inline-block font-counter-mono text-counter-mono text-secondary tracking-widest">[PM-ARCHIVE]</span>
            <a
              onClick={(e) => scrollToSection(e, 'main')}
              className="font-label-nav text-label-nav text-on-surface uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold cursor-pointer hover:text-primary transition-colors text-xs sm:text-sm"
              data-path="main"
              href="#"
            >
              PAPERMIND
            </a>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-space-xl" data-active-classes="text-primary font-bold">
            <a
              onClick={(e) => scrollToSection(e, 'main')}
              className={`transition-colors uppercase text-label-nav font-bold cursor-pointer ${
                activeNav === 'main' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              data-path="main"
              href="#"
            >
              MAIN
            </a>
            <a
              onClick={(e) => scrollToSection(e, 'features')}
              className={`font-label-nav text-label-nav uppercase transition-colors cursor-pointer ${
                activeNav === 'features' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              data-path="features"
              href="#features"
            >
              FEATURES
            </a>
            <a
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className={`font-label-nav text-label-nav uppercase transition-colors cursor-pointer ${
                activeNav === 'how-it-works' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              data-path="how-it-works"
              href="#how-it-works"
            >
              HOW IT WORKS
            </a>
            <a
              onClick={(e) => scrollToSection(e, 'privacy')}
              className={`font-label-nav text-label-nav uppercase transition-colors cursor-pointer ${
                activeNav === 'privacy' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              data-path="privacy"
              href="#privacy"
            >
              PRIVACY
            </a>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-space-lg">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => onViewChange ? onViewChange('library') : onGetStarted && onGetStarted()}
                  className="hidden sm:inline-block font-label-nav text-label-nav text-on-surface-variant hover:text-on-surface transition-colors uppercase cursor-pointer text-xs"
                >
                  MY LIBRARY
                </button>
                <button
                  onClick={() => onUploadClick ? onUploadClick() : onGetStarted && onGetStarted()}
                  className="inline-flex items-center justify-center font-label-nav text-label-nav text-on-primary bg-inverse-surface hover:bg-primary transition-all duration-200 px-3 sm:px-space-lg py-1.5 sm:py-space-sm rounded-full tracking-[0.1em] uppercase cursor-pointer shadow-sm text-xs"
                >
                  UPLOAD
                </button>
                <div
                  onClick={() => onViewChange ? onViewChange('settings') : onGetStarted && onGetStarted()}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                  title={currentUser?.email || 'Active Researcher'}
                >
                  <span className="material-symbols-outlined text-on-primary text-[16px] sm:text-[18px]">person</span>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="font-label-nav text-label-nav text-on-surface-variant hover:text-on-surface transition-colors uppercase cursor-pointer text-xs px-1 sm:px-2"
                  data-path="login"
                >
                  LOGIN
                </button>
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center font-label-nav text-label-nav text-on-primary bg-inverse-surface hover:bg-primary transition-all duration-200 px-3 sm:px-space-lg py-1.5 sm:py-space-sm rounded-full tracking-[0.1em] uppercase cursor-pointer shadow-sm text-xs"
                  data-path="signup"
                >
                  GET STARTED
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT BODY */}
      <main className="w-full pt-16 bg-surface min-h-[calc(100vh-64px)]">
        <div className="flex flex-col w-full">
          {/* SECTION 001: HERO MATRIX */}
          <section className="w-full bg-surface-container-high border-b border-on-surface/20">
            {/* Top Canvas: Editorial Command */}
            <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin pt-space-xl pb-space-2xl min-h-[46vh] flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
                <div className="md:col-span-7">
                  <h1 className="font-display text-[48px] md:text-[80px] lg:text-[104px] leading-[0.88] tracking-[-0.04em] font-medium text-on-surface uppercase">
                    READ LESS.<br />UNDERSTAND MORE.
                  </h1>
                </div>
                <div className="md:col-span-5 flex flex-col justify-between pt-space-xs md:pt-space-sm space-y-space-lg">
                  <p className="font-body-lg text-body-lg text-secondary max-w-md leading-relaxed">
                    Upload research papers and chat with them. Every answer is grounded in your own documents and cited back to the exact page.
                  </p>
                  <div className="flex items-center gap-space-md pt-space-xs flex-wrap">
                    <button
                      onClick={onUploadClick || onGetStarted}
                      className="inline-flex items-center justify-center font-label-nav text-label-nav text-on-primary bg-inverse-surface hover:bg-primary transition-all duration-200 px-7 h-11 rounded-full tracking-[0.1em] uppercase shadow-sm cursor-pointer"
                    >
                      UPLOAD A PAPER
                    </button>
                    <button
                      onClick={(e) => scrollToSection(e, 'how-it-works')}
                      className="inline-flex items-center justify-center font-label-nav text-label-nav text-on-surface hover:bg-surface-variant transition-all duration-200 px-7 h-11 rounded-full tracking-[0.1em] uppercase border border-on-surface/40 cursor-pointer"
                    >
                      SEE HOW IT WORKS
                    </button>
                  </div>
                </div>
              </div>
              <div className="pt-space-xl flex items-center justify-between">
                <span className="font-counter-mono text-counter-mono text-secondary tracking-widest uppercase">
                  001 / 004
                </span>
                <div className="flex items-center gap-space-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                  <span className="font-counter-mono text-counter-mono text-on-surface uppercase">
                    ENGINE_STATE :: READY
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Canvas: Architectural Void & Interactive Research Knowledge Lattice */}
            <div className="w-full bg-[#141515] text-[#f1f0f0] relative min-h-[580px] lg:min-h-[640px] overflow-hidden flex flex-col justify-between m-0 p-0 border-0 border-t border-b border-white/10">
              <HeroResearchMesh
                onExploreClick={(e) => scrollToSection(e, 'how-it-works')}
              />

              {/* Bottom Quick Action Strip */}
              <div className="w-full px-6 md:px-12 py-3 bg-[#111111] border-t border-white/10 relative z-20 flex items-center justify-between font-mono text-[11px] text-neutral-400">
                <p className="hidden sm:block max-w-sm truncate text-[10px]">
                  Guiding researchers from PDF to verified insight with deterministic page citations.
                </p>

                {/* Minimal scroll mouse */}
                <a
                  className="group flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-100 opacity-70 text-[10px]"
                  onClick={(e) => scrollToSection(e, 'how-it-works')}
                  href="#how-it-works"
                >
                  <span>EXPLORE PIPELINE</span>
                  <div className="w-4 h-6 rounded-full border border-neutral-400/80 flex items-start justify-center p-0.5">
                    <span className="w-1 h-1.5 bg-primary-container rounded-full animate-bounce"></span>
                  </div>
                </a>

                <div className="flex items-center gap-space-sm">
                  <button
                    onClick={handleShare}
                    className="font-counter-mono text-[10px] tracking-widest text-neutral-400 hover:text-white uppercase transition-colors cursor-pointer"
                  >
                    SHARE [PM-ARCHIVE] ↗
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 002: HOW IT WORKS */}
          <section className="w-full bg-surface-container-high border-b border-on-surface/20" id="how-it-works">
            <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-2xl">
              {/* Section Header Bar */}
              <div className="flex items-center justify-between pb-space-lg border-b border-on-surface/20">
                <div className="flex items-center gap-space-md">
                  <span className="font-counter-mono text-counter-mono text-secondary tracking-widest">
                    002 / 004
                  </span>
                  <span className="font-label-nav text-label-nav text-on-surface tracking-[0.2em] uppercase font-bold">
                    HOW IT WORKS
                  </span>
                </div>
                <div className="font-counter-mono text-counter-mono text-secondary uppercase">
                  GROUNDING PIPELINE :: REPRODUCIBLE
                </div>
              </div>

              {/* 4 Hairline Columns */}
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-on-surface/20 border-b border-on-surface/20">
                {/* Step 1 */}
                <div className="py-space-xl md:py-space-2xl md:pr-space-lg flex flex-col justify-between space-y-space-xl">
                  <div className="space-y-space-md">
                    <span className="font-counter-mono text-counter-mono text-primary font-bold">01 // SOURCE</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight uppercase">
                      UPLOAD
                    </h3>
                    <p className="font-body-md text-body-md text-secondary">
                      Drop multiple PDFs, arXiv preprints, or entire literature folders directly onto the canvas.
                    </p>
                  </div>
                  <div className="p-space-sm bg-surface-container rounded font-counter-mono text-caption text-secondary border border-on-surface/10">
                    ACCEPTED: .PDF • .TEX • BIBTEX
                  </div>
                </div>

                {/* Step 2 */}
                <div className="py-space-xl md:py-space-2xl md:px-space-lg flex flex-col justify-between space-y-space-xl">
                  <div className="space-y-space-md">
                    <span className="font-counter-mono text-counter-mono text-primary font-bold">02 // TOPOLOGY</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight uppercase">
                      INDEX
                    </h3>
                    <p className="font-body-md text-body-md text-secondary">
                      Vector embeddings map concepts, mathematical equations, figures, tables, and granular footnotes.
                    </p>
                  </div>
                  <div className="p-space-sm bg-surface-container rounded font-counter-mono text-caption text-secondary border border-on-surface/10 flex items-center justify-between">
                    <span>DENSE CHUNKING</span>
                    <span className="text-primary font-bold">512 DIM</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="py-space-xl md:py-space-2xl md:px-space-lg flex flex-col justify-between space-y-space-xl">
                  <div className="space-y-space-md">
                    <span className="font-counter-mono text-counter-mono text-primary font-bold">03 // DIGEST</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight uppercase">
                      SUMMARISE
                    </h3>
                    <p className="font-body-md text-body-md text-secondary">
                      Extract synthesis matrices, core hypotheses, dataset specifications, and methodology trade-offs.
                    </p>
                  </div>
                  <div className="p-space-sm bg-surface-container rounded font-counter-mono text-caption text-secondary border border-on-surface/10">
                    OUTPUT: STRUCTURED MATRIX
                  </div>
                </div>

                {/* Step 4 with interactive chip demo */}
                <div className="py-space-xl md:py-space-2xl md:pl-space-lg flex flex-col justify-between space-y-space-xl relative">
                  <div className="space-y-space-md">
                    <span className="font-counter-mono text-counter-mono text-primary font-bold">04 // VERIFY</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight uppercase">
                      ASK
                    </h3>
                    <p className="font-body-md text-body-md text-secondary">
                      Chat naturally with verified paragraph-level and page-level source citations directly linked to your document.
                    </p>
                  </div>

                  {/* Interactive citation demo badge */}
                  <div>
                    <div
                      onClick={() => setShowCitationPreview(!showCitationPreview)}
                      className="p-space-sm bg-surface border border-primary-container/60 rounded flex items-center justify-between group hover:border-primary transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-space-xs">
                        <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                        <span className="font-counter-mono text-caption font-semibold text-on-surface tracking-wider">
                          [p.4 §2.1] Vaswani et al.
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                        arrow_outward
                      </span>
                    </div>

                    {/* Popover preview on click */}
                    {showCitationPreview && (
                      <div className="mt-2 p-3 bg-surface border border-outline-variant rounded-lg text-xs font-mono shadow-xl animate-fade-in text-on-surface">
                        <div className="text-[10px] text-primary font-bold mb-1">
                          GROUNDED VERBATIM SOURCE [PAGE 4, SEC 2.1]:
                        </div>
                        <p className="text-[11px] leading-relaxed text-secondary italic">
                          "The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder..."
                        </p>
                        <div className="mt-2 pt-1 border-t border-black/10 flex justify-between text-[9px] text-secondary">
                          <span>MATCH FIDELITY: 100%</span>
                          <span>DOC: ATTENTION IS ALL YOU NEED</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 003: ARCHITECTURAL FEATURES MATRIX */}
          <section className="w-full bg-surface" id="features">
            <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-2xl">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-space-lg border-b border-on-surface/20">
                <div className="flex items-center gap-space-md">
                  <span className="font-counter-mono text-counter-mono text-secondary tracking-widest">
                    003 / 004
                  </span>
                  <span className="font-label-nav text-label-nav text-on-surface tracking-[0.2em] uppercase font-bold">
                    SYSTEM CAPABILITIES
                  </span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container/20 border border-primary-container font-counter-mono text-counter-mono text-primary font-bold">
                    [CITED: P.14]
                  </span>
                </div>
              </div>

              {/* Editorial Hairline Rows */}
              <div className="divide-y divide-on-surface/20 border-b border-on-surface/20">
                {/* Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-12 py-space-xl gap-gutter group hover:bg-surface-container-low transition-colors duration-150 px-space-sm">
                  <div className="md:col-span-4 flex items-baseline gap-space-md">
                    <span className="font-counter-mono text-caption text-secondary">01</span>
                    <h4 className="font-headline-md text-headline-md font-medium text-on-surface uppercase group-hover:text-primary transition-colors">
                      Ask this paper
                    </h4>
                  </div>
                  <div className="md:col-span-6 flex items-center">
                    <p className="font-body-lg text-body-lg text-secondary">
                      Deep semantic inquiry constrained strictly to the active manuscript. Mathematical formulations and statistical bounds verified in context.
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-end">
                    <span className="font-counter-mono text-caption text-secondary uppercase tracking-widest">
                      [SINGLE DOC]
                    </span>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-12 py-space-xl gap-gutter group hover:bg-surface-container-low transition-colors duration-150 px-space-sm">
                  <div className="md:col-span-4 flex items-baseline gap-space-md">
                    <span className="font-counter-mono text-caption text-secondary">02</span>
                    <h4 className="font-headline-md text-headline-md font-medium text-on-surface uppercase group-hover:text-primary transition-colors">
                      Ask my library
                    </h4>
                  </div>
                  <div className="md:col-span-6 flex items-center">
                    <p className="font-body-lg text-body-lg text-secondary">
                      Cross-document synthesis across hundreds of related papers, lab notes, and bibliographies. Detect contradictory claims across research teams.
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-end">
                    <span className="font-counter-mono text-caption text-secondary uppercase tracking-widest">
                      [MULTI CORPUS]
                    </span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-12 py-space-xl gap-gutter group hover:bg-surface-container-low transition-colors duration-150 px-space-sm">
                  <div className="md:col-span-4 flex items-baseline gap-space-md">
                    <span className="font-counter-mono text-caption text-secondary">03</span>
                    <h4 className="font-headline-md text-headline-md font-medium text-on-surface uppercase group-hover:text-primary transition-colors">
                      Citation chips
                    </h4>
                  </div>
                  <div className="md:col-span-6 flex items-center">
                    <p className="font-body-lg text-body-lg text-secondary">
                      Every claim references the exact line, equation, and page with hover preview cards. No more opaque, hallucinated assertions.
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-end">
                    <span className="inline-flex items-center gap-1 font-counter-mono text-caption text-primary uppercase font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span> LIVE PREVIEW
                    </span>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-1 md:grid-cols-12 py-space-xl gap-gutter group hover:bg-surface-container-low transition-colors duration-150 px-space-sm">
                  <div className="md:col-span-4 flex items-baseline gap-space-md">
                    <span className="font-counter-mono text-caption text-secondary">04</span>
                    <h4 className="font-headline-md text-headline-md font-medium text-on-surface uppercase group-hover:text-primary transition-colors">
                      Related papers
                    </h4>
                  </div>
                  <div className="md:col-span-6 flex items-center">
                    <p className="font-body-lg text-body-lg text-secondary">
                      Automated citation graph exploration discovering foundational antecedents and downstream replications across major academic archives.
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-end">
                    <span className="font-counter-mono text-caption text-secondary uppercase tracking-widest">
                      [ARXIV / S2]
                    </span>
                  </div>
                </div>

                {/* Row 5 */}
                <div className="grid grid-cols-1 md:grid-cols-12 py-space-xl gap-gutter group hover:bg-surface-container-low transition-colors duration-150 px-space-sm">
                  <div className="md:col-span-4 flex items-baseline gap-space-md">
                    <span className="font-counter-mono text-caption text-secondary">05</span>
                    <h4 className="font-headline-md text-headline-md font-medium text-on-surface uppercase group-hover:text-primary transition-colors">
                      Synthesized Notes
                    </h4>
                  </div>
                  <div className="md:col-span-6 flex items-center">
                    <p className="font-body-lg text-body-lg text-secondary">
                      Export structured literature reviews directly into Markdown, clean LaTeX compilations, and formatted BibTeX citation databases.
                    </p>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-end">
                    <span className="font-counter-mono text-caption text-secondary uppercase tracking-widest">
                      [MD / TEX / BIB]
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 004: TRUST & GROUNDING (ARCHITECTURAL STATEMENT) */}
          <section className="w-full bg-surface-container-low border-b border-on-surface/20" id="privacy">
            <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-2xl">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-space-xl border-b border-on-surface/20">
                <div className="flex items-center gap-space-md">
                  <span className="font-counter-mono text-counter-mono text-secondary tracking-widest">
                    004 / 004
                  </span>
                  <span className="font-label-nav text-label-nav text-on-surface tracking-[0.2em] uppercase font-bold">
                    VERIFIABILITY PROTOCOL
                  </span>
                </div>
                <div className="font-counter-mono text-counter-mono text-secondary uppercase">
                  GUARANTEE :: ZERO-HALLUCINATION
                </div>
              </div>

              {/* Core Monolith Statement */}
              <div className="py-space-2xl grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
                <div className="md:col-span-8">
                  <p className="font-display text-[32px] md:text-[54px] lg:text-[62px] leading-[1.05] tracking-[-0.03em] font-medium text-on-surface">
                    “Answers come only from your documents. If it isn’t in the paper, we say so.”
                  </p>
                </div>
                <div className="md:col-span-4 space-y-space-md pt-2">
                  <p className="font-body-md text-body-md text-secondary leading-relaxed">
                    Standard conversational models invent citations to satisfy conversational momentum. PAPERMIND operates as an evidentiary matrix: any response requires verifiable text tokens, bounding coordinates, and deterministic page matches.
                  </p>
                  <div className="pt-space-md flex flex-col space-y-space-sm border-t border-on-surface/15">
                    <div className="flex items-center justify-between font-counter-mono text-caption">
                      <span className="text-secondary">CITATION FIDELITY</span>
                      <span className="text-on-surface font-semibold">100.0% DETERMINISTIC</span>
                    </div>
                    <div className="flex items-center justify-between font-counter-mono text-caption">
                      <span className="text-secondary">LATENCY PER QUERY</span>
                      <span className="text-on-surface font-semibold">240MS</span>
                    </div>
                    <div className="flex items-center justify-between font-counter-mono text-caption">
                      <span className="text-secondary">CORPUS PRIVACY</span>
                      <span className="text-on-surface font-semibold">LOCAL ENCRYPTED AT REST</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action Banner */}
              <div className="mt-space-xl p-space-xl bg-inverse-surface text-on-primary rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg">
                <div className="space-y-space-xs">
                  <span className="font-counter-mono text-counter-mono text-primary-fixed uppercase tracking-widest">
                    [GET INGESTION ACCESS]
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-primary uppercase font-medium">
                    Ready to query your scientific repository?
                  </h3>
                </div>
                <div className="flex items-center gap-space-md">
                  <button
                    onClick={onGetStarted}
                    className="font-label-nav text-label-nav text-on-surface bg-primary-container hover:bg-tertiary-fixed transition-colors px-8 py-3.5 rounded-full uppercase tracking-wider font-bold cursor-pointer shadow-md hover:shadow-lg"
                  >
                    {isAuthenticated ? 'OPEN RESEARCH WORKSPACE →' : 'START FREE RESEARCH TRIAL'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* REFINED ARCHITECTURAL FOOTER */}
      <footer className="w-full bg-[#181919] border-t border-white/10 font-sans text-[#e3e2e2] shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin pt-space-2xl pb-space-xl">
          {/* Brand Wordmark & Technical Identification Bar */}
          <div className="w-full pb-space-lg border-b border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <PapermindLogo size={24} />
                <span className="font-counter-mono text-counter-mono text-white/60 tracking-widest">[ARCHIVAL CORE]</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
              </div>
              <h2 className="font-display text-[44px] sm:text-[64px] lg:text-[80px] font-bold tracking-tight text-white/20 uppercase select-none leading-none">
                PAPERMIND
              </h2>
            </div>
            <div className="font-counter-mono text-xs text-white/50 space-y-1 pb-1">
              <p>PRECISION SCHOLARLY INGESTION ENGINE</p>
              <p>GROUNDED RETRIEVAL-AUGMENTED GENERATION // VECTOR TOPOLOGY</p>
            </div>
          </div>

          {/* Directory Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter py-space-xl border-b border-white/10">
            {/* Column 1: Core Mission */}
            <div className="space-y-space-sm">
              <p className="font-counter-mono text-counter-mono text-white/50 uppercase">[01] // MISSION</p>
              <p className="font-headline-md text-base text-white font-semibold tracking-tight">Architecture of Thought</p>
              <p className="font-body-md text-xs text-[#a8a8a8] leading-relaxed">
                Autonomous academic literature synthesis, page-grounded citations, and topological analysis for researchers worldwide.
              </p>
            </div>

            {/* Column 2: Platform Sections */}
            <div className="space-y-space-sm">
              <p className="font-counter-mono text-counter-mono text-white/50 uppercase">[02] // PLATFORM</p>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={(e) => scrollToSection(e, 'how-it-works')}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider"
                  >
                    Extraction Workflow
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => scrollToSection(e, 'features')}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider"
                  >
                    Evidentiary Synthesis
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => scrollToSection(e, 'privacy')}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider"
                  >
                    Verifiability Protocol
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => (onViewChange ? onViewChange('graph') : onGetStarted && onGetStarted())}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider"
                  >
                    Citation Graph
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Functional Workspace Navigation */}
            <div className="space-y-space-sm">
              <p className="font-counter-mono text-counter-mono text-white/50 uppercase">[03] // WORKSPACE</p>
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => (onViewChange ? onViewChange(isAuthenticated ? 'home' : 'register') : onGetStarted && onGetStarted())}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider"
                  >
                    {isAuthenticated ? 'Research Dashboard' : 'Get Started Free'}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => (onUploadClick ? onUploadClick() : onGetStarted && onGetStarted())}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider"
                  >
                    Upload Document
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      if (isAuthenticated) {
                        onViewChange && onViewChange('library');
                      } else {
                        onLoginClick && onLoginClick();
                      }
                    }}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider"
                  >
                    {isAuthenticated ? 'Research Library' : 'Sign In To Account'}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      if (isAuthenticated) {
                        onViewChange && onViewChange('settings');
                      } else {
                        onGetStarted && onGetStarted();
                      }
                    }}
                    className="font-label-nav text-xs text-[#a8a8a8] uppercase hover:text-[#FF9A2E] transition-colors cursor-pointer text-left tracking-wider flex items-center gap-1.5 group"
                  >
                    <span className="text-[#FF9A2E] group-hover:rotate-45 transition-transform duration-300">⚙</span>
                    <span>{isAuthenticated ? 'Preferences & Profile' : 'Researcher Account'}</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: System Cluster Telemetry */}
            <div className="space-y-space-sm">
              <p className="font-counter-mono text-counter-mono text-white/50 uppercase">[04] // TELEMETRY</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse"></span>
                <span className="font-counter-mono text-xs text-white uppercase font-medium">
                  SYNTHESIS ENGINE 3.4 ACTIVE
                </span>
              </div>
              <p className="font-counter-mono text-[11px] text-white/60">
                LATENCY: 42MS // NODE CLUSTER: ZURICH
              </p>
              <p className="font-counter-mono text-[11px] text-white/60">
                STORAGE: 1536-DIM COSINE EMBEDDINGS
              </p>
            </div>
          </div>

          {/* Bottom Bar: Copyright, Editorial Note, and Back to Top */}
          <div className="pt-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md text-xs font-mono text-white/50">
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start text-[11px]">
              <span>© {new Date().getFullYear()} PAPERMIND ARCHIVAL INC.</span>
              <span>·</span>
              <span>ALL RIGHTS RESERVED</span>
              <span>·</span>
              <span className="text-white/40">SWISS EDITORIAL ARCHITECTURE</span>
            </div>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors cursor-pointer uppercase font-bold text-[11px] group tracking-wider"
              title="Scroll to top of page"
            >
              <span>BACK TO TOP</span>
              <span className="group-hover:-translate-y-0.5 transition-transform text-[#FF9A2E]">↑</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
