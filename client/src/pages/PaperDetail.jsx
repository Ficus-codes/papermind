import React, { useState, useEffect } from 'react';
import api from '../api/apiClient';
import PaperChat from '../components/PaperChat';
import NotesManager from '../components/NotesManager';
import RelatedPapers from '../components/RelatedPapers';
import MathRenderer from '../components/MathRenderer';

/**
 * Page 6 — Paper Detail / Summary (/papers/[id])
 * Matches Stitch prompt:
 * - Breadcrumb: "LIBRARY / [TITLE]"
 * - Headline uppercase 56px
 * - Metadata: authors, date, pages, amber READY chip
 * - Underlined tab bar: SUMMARY · ASK THIS PAPER · RELATED · NOTES
 * - Left (8 cols): TL;DR block (20px), hairline sections OVERVIEW, KEY CONTRIBUTIONS (01-04), METHOD, RESULTS, LIMITATIONS, KEY TERMS amber-outlined chips
 * - Right (4 cols sticky): metadata card, tags with "+ ADD TAG", black pill "ASK THIS PAPER", outlined pill "REGENERATE SUMMARY", red text link "DELETE PAPER"
 */
const PaperDetail = ({ paperId, initialTab = 'summary', onBack, onAuthRequired, showNotification }) => {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab === 'ask' ? 'chat' : (initialTab || 'summary'));
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  // Chunks state
  const [chunks, setChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchPaper = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        onAuthRequired();
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/api/papers/${paperId}`);
        if (isMounted) {
          setPaper(response.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load paper details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (paperId) {
      fetchPaper();
    }
    return () => {
      isMounted = false;
    };
  }, [paperId, onAuthRequired]);

  const handleGenerateSummary = async (regenerate = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      onAuthRequired();
      return;
    }

    setSummarizing(true);
    setError('');
    try {
      const response = await api.post(
        `/api/papers/${paperId}/summarize`,
        { regenerate }
      );
      setPaper((prev) => ({ ...prev, summary: response.data.summary }));
      showNotification?.('Summary regenerated successfully', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate summary';
      setError(msg);
      showNotification?.(msg, 'error');
    } finally {
      setSummarizing(false);
    }
  };

  const handleAddTag = async (e) => {
    e?.preventDefault();
    if (!newTagInput.trim()) return;
    const currentTags = paper.keywords || [];
    if (currentTags.includes(newTagInput.trim())) return;

    const updatedTags = [...currentTags, newTagInput.trim()];
    setPaper((prev) => ({ ...prev, keywords: updatedTags }));
    showNotification?.(`Added tag [${newTagInput.trim()}]`, 'success');
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleDeletePaper = async () => {
    if (!window.confirm(`Delete "${paper.title}"? This permanently eliminates all associated chunks, notes, and chat citations.`)) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await api.delete(`/api/papers/${paperId}`);
      showNotification?.('Paper eliminated from library', 'info');
      onBack();
    } catch (err) {
      showNotification?.(err.response?.data?.message || 'Failed to delete paper', 'error');
    }
  };

  const handleCopyBriefing = () => {
    if (!paper?.summary) return;
    const s = paper.summary;
    const pText = s.problemStatement || s.sections?.find((sec) => /problem|context|background/i.test(sec.heading))?.content || s.overview || 'N/A';
    const aText = s.coreAnalysis || s.sections?.find((sec) => /analysis|method|architect|result|evidence/i.test(sec.heading))?.content || 'N/A';
    const cText = s.conclusions || s.sections?.find((sec) => /conclu|implicat|limitat/i.test(sec.heading))?.content || 'N/A';

    const text = `# ${paper.title} — Executive Scientific Briefing
Authors: ${paper.authors?.join(', ') || 'Unknown'}

## TL;DR Executive Takeaway
${s.tldr || ''}

## Key Contributions
${s.keyTakeaways?.map((k, i) => `0${i + 1}. ${k}`).join('\n') || ''}

## 1. Precise Problem Statement & Context
${pText}

## 2. Core Analysis & Synthesis
${aText}

## 3. Conclusions & Implications
${cText}
`;
    navigator.clipboard.writeText(text);
    setCopiedBriefing(true);
    showNotification?.('Executive scientific briefing copied to clipboard', 'success');
    setTimeout(() => setCopiedBriefing(false), 2200);
  };

  const fetchChunks = async () => {
    if (chunks.length > 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingChunks(true);
    try {
      const response = await api.get(`/api/papers/${paperId}/chunks`);
      setChunks(response.data.chunks || []);
    } catch (err) {
      console.error('Error fetching chunks:', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-28 text-center space-y-3 font-sans">
        <div className="w-6 h-6 mx-auto border border-primary-container border-t-transparent rounded-full animate-spin"></div>
        <p className="font-nav-label text-xs text-on-surface-variant">LOADING MANUSCRIPT RECORD…</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center space-y-4 font-sans">
        <p className="text-xs text-error">{error || 'Paper not found in repository.'}</p>
        <button onClick={onBack} className="btn-secondary">
          ← BACK TO LIBRARY
        </button>
      </div>
    );
  }

  const summary = paper.summary;
  const pageCount = paper.pages?.length || 1;

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-12 py-8 animate-fade-in font-sans space-y-8">
      {/* 1. Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono-counter text-on-surface-variant">
        <button onClick={onBack} className="hover:text-on-surface cursor-pointer">
          LIBRARY
        </button>
        <span>/</span>
        <span className="text-on-surface font-semibold uppercase truncate max-w-lg">
          {paper.title}
        </span>
      </div>

      {/* 2. Headline & Metadata */}
      <div className="space-y-3 pb-6 border-b border-outline-variant/30">
        <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] text-on-surface leading-[0.95] tracking-tight">
          {paper.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-counter text-on-surface-variant pt-1">
          {paper.authors && paper.authors.length > 0 && (
            <span>BY {paper.authors.join(', ')}</span>
          )}
          <span>·</span>
          <span>UPLOADED {new Date(paper.uploadDate).toLocaleDateString()}</span>
          <span>·</span>
          <span>{pageCount} PAGES</span>
          <span>·</span>
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] text-on-surface bg-surface-container border border-outline-variant/40 px-2.5 py-0.5 rounded-full">
            <span className={`w-2 h-2 rounded-full ${paper.status === 'ready' ? 'bg-primary-container shadow-[0_0_6px_#FF9A2E]' : 'bg-outline-variant animate-pulse'}`} />
            <span>{paper.status === 'ready' ? '• READY' : '◌ PROCESSING'}</span>
          </div>
          {paper.fileType === 'tex' && (
            <span className="font-counter-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-[#FF9A2E]/50 text-[#8E4F00] bg-[#FF9A2E]/10">
              LATEX (.TEX) SOURCE
            </span>
          )}
          {paper.fileType === 'docx' && (
            <span className="font-counter-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10">
              WORD (.DOCX) MANUSCRIPT
            </span>
          )}
          {paper.fileType === 'md' && (
            <span className="font-counter-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              MARKDOWN (.MD) DOCUMENT
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 border-l-2 border-error bg-error/5 text-xs text-error">
          {error}
        </div>
      )}

      {/* 3. Underlined Tab Bar: SUMMARY · SPLIT READER · ASK THIS PAPER · RELATED · NOTES */}
      <div className="flex border-b border-outline-variant/30 space-x-8 overflow-x-auto">
        {[
          { id: 'summary', label: 'SUMMARY' },
          { id: 'reader', label: '📖 SPLIT READER' },
          { id: 'chat', label: 'ASK THIS PAPER' },
          { id: 'related', label: 'RELATED' },
          { id: 'notes', label: 'NOTES' },
          { id: 'chunks', label: `CHUNKS (${paper.chunkCount || 0})` },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'chunks') fetchChunks();
              }}
              className={`pb-3 font-nav-label text-xs transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-primary-container text-on-surface font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Summary Sections */}
          <div className="lg:col-span-8 space-y-8">
            {summarizing ? (
              <div className="card-hairline p-10 space-y-4 text-center bg-surface-container-low animate-pulse">
                <div className="w-5 h-5 mx-auto border border-primary-container border-t-transparent rounded-full animate-spin"></div>
                <p className="font-nav-label text-xs text-on-surface">
                  SUMMARISING VIA CLAUDE / GROQ / GPT-4o…
                </p>
                <div className="space-y-2 max-w-md mx-auto pt-4">
                  <div className="h-2 bg-outline-variant/30 rounded"></div>
                  <div className="h-2 bg-outline-variant/30 rounded w-5/6"></div>
                  <div className="h-2 bg-outline-variant/30 rounded w-4/6"></div>
                </div>
              </div>
            ) : !summary?.tldr ? (
              /* Summary Not Generated Yet */
              <div className="card-hairline p-12 text-center space-y-4 bg-surface-container-low">
                <span className="font-mono-counter text-xs text-primary-container">
                  AI SYNTHESIS PENDING
                </span>
                <h3 className="font-display text-2xl text-on-surface">
                  NO SUMMARY GENERATED YET
                </h3>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  Synthesize an executive TL;DR, section-by-section breakdown, and domain vocabulary glossary from the indexed text chunks.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => handleGenerateSummary(false)}
                    className="btn-primary"
                  >
                    GENERATE SUMMARY
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. TL;DR Hero Block */}
                <div className="p-6 border border-outline-variant/40 rounded-2xl bg-surface-container-low space-y-3 shadow-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                    <span className="font-nav-label text-[10px] text-primary-container font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                      EXECUTIVE SCIENTIFIC BRIEFING // TL;DR
                    </span>
                    {summary.generatedAt && (
                      <span className="font-mono-counter text-[10px] text-on-surface-variant">
                        SYNTHESIZED {new Date(summary.generatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="font-display text-xl sm:text-2xl text-on-surface leading-snug">
                    {summary.tldr}
                  </p>
                </div>

                {/* 2. Key Contributions (Numbered 01-04 in Constructivist Grid) */}
                {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
                  <div className="p-6 border border-outline-variant/40 rounded-2xl bg-surface-container-low space-y-4">
                    <span className="font-nav-label text-xs text-on-surface font-bold uppercase tracking-wider block pb-2 border-b border-outline-variant/30">
                      KEY TECHNICAL CONTRIBUTIONS & NOVELTIES
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summary.keyTakeaways.map((takeaway, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface flex items-start gap-3">
                          <span className="font-mono-counter text-xs text-primary-container font-bold shrink-0 pt-0.5">
                            0{idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                            {takeaway}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. The Three Core Academic Analytical Pillars */}
                {(() => {
                  const pText =
                    summary.problemStatement ||
                    summary.sections?.find((sec) => /problem|context|background/i.test(sec.heading))?.content ||
                    summary.overview;

                  const aText =
                    summary.coreAnalysis ||
                    summary.sections?.find((sec) => /analysis|method|architect|result|evidence/i.test(sec.heading))?.content;

                  const cText =
                    summary.conclusions ||
                    summary.sections?.find((sec) => /conclu|implicat|limitat/i.test(sec.heading))?.content;

                  const extraSections =
                    summary.sections?.filter(
                      (sec) =>
                        !/problem|context|background/i.test(sec.heading) &&
                        !/analysis|method|architect|result|evidence/i.test(sec.heading) &&
                        !/conclu|implicat/i.test(sec.heading)
                    ) || [];

                  return (
                    <div className="space-y-6">
                      {/* Pillar 1: Precise Problem Statement & Context */}
                      {pText && (
                        <div className="p-6 sm:p-7 border border-outline-variant/40 rounded-2xl bg-surface-container-low border-l-4 border-l-primary-container space-y-3 shadow-xs">
                          <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                            <span className="font-mono-counter text-[10px] text-primary-container font-bold tracking-widest flex items-center gap-1.5">
                              <span>01</span>
                              <span>//</span>
                              <span>SCIENTIFIC BOTTLENECK & MOTIVATION</span>
                            </span>
                            <span className="font-nav-label text-[10px] text-on-surface-variant font-semibold">
                              CONTEXT & PRIOR ART
                            </span>
                          </div>
                          <h3 className="font-display text-lg sm:text-xl text-on-surface font-bold uppercase tracking-tight">
                            PRECISE PROBLEM STATEMENT & CONTEXT
                          </h3>
                          <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-sans">
                            <MathRenderer content={pText} />
                          </div>
                        </div>
                      )}

                      {/* Pillar 2: Core Analysis & Synthesis */}
                      {aText && (
                        <div className="p-6 sm:p-7 border border-outline-variant/40 rounded-2xl bg-surface-container-low border-l-4 border-l-on-surface space-y-3 shadow-xs">
                          <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                            <span className="font-mono-counter text-[10px] text-primary font-bold tracking-widest flex items-center gap-1.5">
                              <span>02</span>
                              <span>//</span>
                              <span>TECHNICAL MECHANICS & EMPIRICAL EVIDENCE</span>
                            </span>
                            <span className="font-nav-label text-[10px] text-on-surface-variant font-semibold">
                              SYNTHESIS
                            </span>
                          </div>
                          <h3 className="font-display text-lg sm:text-xl text-on-surface font-bold uppercase tracking-tight">
                            CORE ANALYSIS & SYNTHESIS
                          </h3>
                          <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-sans">
                            <MathRenderer content={aText} />
                          </div>
                        </div>
                      )}

                      {/* Pillar 3: Conclusions & Implications */}
                      {cText && (
                        <div className="p-6 sm:p-7 border border-outline-variant/40 rounded-2xl bg-surface-container-low border-l-4 border-l-primary space-y-3 shadow-xs">
                          <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                            <span className="font-mono-counter text-[10px] text-primary-container font-bold tracking-widest flex items-center gap-1.5">
                              <span>03</span>
                              <span>//</span>
                              <span>DISCIPLINARY IMPACT & OPEN HORIZONS</span>
                            </span>
                            <span className="font-nav-label text-[10px] text-on-surface-variant font-semibold">
                              IMPLICATIONS
                            </span>
                          </div>
                          <h3 className="font-display text-lg sm:text-xl text-on-surface font-bold uppercase tracking-tight">
                            CONCLUSIONS & IMPLICATIONS
                          </h3>
                          <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-sans">
                            <MathRenderer content={cText} />
                          </div>
                        </div>
                      )}

                      {/* Supplementary Section Cards if present */}
                      {extraSections.map((sec, idx) => (
                        <div key={idx} className="p-5 border border-outline-variant/30 rounded-2xl bg-surface-container-low space-y-2">
                          <span className="font-nav-label text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                            {sec.heading}
                          </span>
                          <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed font-sans">
                            <MathRenderer content={sec.content} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 4. KEY TERMS & CONCEPTS Domain Vocabulary Chips */}
                {summary.keyTerms && summary.keyTerms.length > 0 && (
                  <div className="p-6 border border-outline-variant/40 rounded-2xl bg-surface-container-low space-y-3">
                    <span className="font-nav-label text-xs text-on-surface font-bold uppercase tracking-wider block pb-2 border-b border-outline-variant/30">
                      DOMAIN VOCABULARY & KEY CONCEPTS
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {summary.keyTerms.map((kt, idx) => (
                        <div
                          key={idx}
                          className="p-3 border border-primary-container/40 rounded-xl bg-surface space-y-1 hover:border-primary-container transition-colors"
                        >
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
                            <span>●</span>
                            <span>{kt.term}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            {kt.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification label */}
                <div className="pt-2 text-center font-mono-counter text-[10px] text-on-surface-variant">
                  AI-GROUNDED SYNTHESIS — VERIFIED DETERMINISTICALLY AGAINST PDF TOKENS
                </div>
              </div>
            )}
          </div>

          {/* Right Column (4 cols, sticky): Metadata Card & Actions */}
          <div className="lg:col-span-4 card-hairline p-6 space-y-6 bg-surface-container-low sticky top-24">
            <span className="font-nav-label text-xs text-on-surface block pb-2 border-b border-outline-variant/30">
              DOCUMENT ACTIONS
            </span>

            <div className="space-y-3">
              <button
                onClick={() => setActiveTab('reader')}
                className="btn-ignition w-full flex items-center justify-center gap-2"
              >
                <span>📖</span>
                <span>OPEN SPLIT-SCREEN READER →</span>
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                className="btn-primary w-full"
              >
                ASK THIS PAPER →
              </button>

              <button
                onClick={() => handleGenerateSummary(true)}
                disabled={summarizing}
                className="btn-secondary w-full"
              >
                {summarizing ? 'SYNTHESIZING PILLARS…' : 'REGENERATE STRUCTURED SUMMARY'}
              </button>

              {summary?.tldr && (
                <button
                  onClick={handleCopyBriefing}
                  className="btn-ghost w-full !border-outline-variant/50 hover:!border-on-surface text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>📋</span>
                  <span>{copiedBriefing ? 'BRIEFING COPIED!' : 'COPY BRIEFING TO CLIPBOARD'}</span>
                </button>
              )}
            </div>

            {/* Tags Editor */}
            <div className="pt-4 border-t border-outline-variant/30 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-nav-label text-[10px] text-on-surface-variant">
                  TOPIC TAGS
                </span>
                <button
                  onClick={() => setShowTagInput(!showTagInput)}
                  className="font-nav-label text-[10px] text-primary-container hover:underline cursor-pointer"
                >
                  {showTagInput ? 'CANCEL' : '+ ADD TAG'}
                </button>
              </div>

              {showTagInput && (
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="New topic"
                    className="flex-1 bg-transparent border-b border-outline-variant/50 text-xs py-1 focus:outline-none focus:border-primary-container text-on-surface"
                  />
                  <button type="submit" className="text-xs font-bold text-on-surface">
                    ADD
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-1.5">
                {(paper.keywords || []).map((tag, idx) => (
                  <span
                    key={idx}
                    className="font-mono-counter text-[10px] text-on-surface-variant border border-outline-variant/40 px-2.5 py-0.5 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Document stats */}
            <div className="pt-4 border-t border-outline-variant/30 text-xs font-mono-counter text-on-surface-variant space-y-1.5">
              <div className="flex justify-between">
                <span>CHUNKS:</span>
                <span className="text-on-surface font-semibold">{paper.chunkCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>EMBEDDING MODEL:</span>
                <span className="text-on-surface">text-embedding-3-small</span>
              </div>
              <div className="flex justify-between">
                <span>VECTOR DIMS:</span>
                <span className="text-on-surface">1536</span>
              </div>
            </div>

            {/* Delete link */}
            <div className="pt-4 border-t border-outline-variant/30 text-center">
              <button
                onClick={handleDeletePaper}
                className="font-nav-label text-[10px] text-error hover:underline cursor-pointer"
              >
                DELETE PAPER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: SPLIT READER */}
      {activeTab === 'reader' && (
        <PaperChat
          paperId={paperId}
          paperTitle={paper.title}
          paper={paper}
          initialViewMode="reader"
          onAuthRequired={onAuthRequired}
          initialScope="paper"
        />
      )}

      {/* Tab: ASK THIS PAPER */}
      {activeTab === 'chat' && (
        <PaperChat
          paperId={paperId}
          paperTitle={paper.title}
          paper={paper}
          initialViewMode="evidence"
          onAuthRequired={onAuthRequired}
          initialScope="paper"
        />
      )}

      {/* Tab: RELATED */}
      {activeTab === 'related' && (
        <RelatedPapers
          paperId={paperId}
          paper={paper}
          onAuthRequired={onAuthRequired}
        />
      )}

      {/* Tab: NOTES */}
      {activeTab === 'notes' && (
        <NotesManager
          paperId={paperId}
          onAuthRequired={onAuthRequired}
        />
      )}

      {/* Tab: CHUNKS */}
      {activeTab === 'chunks' && (
        <div className="space-y-4">
          <span className="font-nav-label text-xs text-on-surface">
            INDEXED VECTOR SEGMENTS (~500 TOKENS EACH)
          </span>

          {loadingChunks ? (
            <div className="py-12 text-center text-xs font-mono-counter text-on-surface-variant">
              FETCHING ATLAS CHUNK STORE…
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chunks.map((ch, idx) => (
                <div key={idx} className="card-hairline p-4 space-y-2 bg-surface-container-low text-xs">
                  <div className="flex justify-between items-center font-mono-counter text-[10px] text-primary-container">
                    <span>CHUNK {ch.chunkIndex ?? idx + 1}</span>
                    <span>PAGE {ch.pageNumber || 1}</span>
                  </div>
                  <div className="text-xs text-on-surface-variant font-mono leading-relaxed line-clamp-4 overflow-hidden">
                    <MathRenderer content={ch.text} displayBlockMathCentered={false} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaperDetail;
