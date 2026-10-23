import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/apiClient';
import WireframeMesh from './WireframeMesh';

/**
 * Page 9 — Related Papers (/papers/[id]/related)
 * Matches Stitch prompt:
 * - Top row: "KEYWORDS EXTRACTED" with amber-outlined editable chips + "+ ADD"
 * - Source filter pills: ALL / SEMANTIC SCHOLAR / ARXIV + "REFRESH" outlined pill
 * - Results as hairline-separated rows: mono index, title (20px), authors/year in grey, 2-line abstract, small source badge, "OPEN ↗"
 * - Right small dark panel with amber node-mesh and "CONNECTED WORK" decoration
 */
const RelatedPapers = ({ paperId, paper, onAuthRequired }) => {
  const [keywords, setKeywords] = useState([]);
  const [relatedPapers, setRelatedPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('ALL'); // 'ALL', 'SEMANTIC SCHOLAR', 'ARXIV'
  const [error, setError] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [showAddKeyword, setShowAddKeyword] = useState(false);

  // Combine keywords from paper metadata, summary key terms, and citation discovery
  const combinedKeywords = useMemo(() => {
    const set = new Set();
    // 1. From paper object keywords
    if (paper?.keywords && Array.isArray(paper.keywords)) {
      paper.keywords.forEach((k) => k && set.add(String(k).trim()));
    }
    // 2. From paper summary key terms
    if (paper?.summary?.keyTerms && Array.isArray(paper.summary.keyTerms)) {
      paper.summary.keyTerms.forEach((kt) => {
        const term = typeof kt === 'string' ? kt : kt?.term;
        if (term) set.add(String(term).trim());
      });
    }
    // 3. From locally extracted / added keywords
    if (keywords && Array.isArray(keywords)) {
      keywords.forEach((k) => k && set.add(String(k).trim()));
    }
    // 4. Fallback if empty: significant words from paper title
    if (set.size === 0 && paper?.title) {
      const stopWords = new Set(['with', 'from', 'that', 'this', 'using', 'over', 'into', 'and', 'for', 'the', 'via']);
      paper.title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()))
        .forEach((w) => set.add(w.trim()));
    }
    return Array.from(set);
  }, [paper, keywords]);


  const fetchRelated = useCallback(async (refresh = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get(
        `/api/papers/${paperId}/related${refresh ? '?refresh=true' : ''}`
      );
      setKeywords(response.data.keywords || []);
      setRelatedPapers(response.data.relatedPapers || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach citation discovery APIs.');
    } finally {
      setLoading(false);
    }
  }, [paperId, onAuthRequired]);

  useEffect(() => {
    if (paperId) {
      fetchRelated(false);
    }
  }, [paperId, fetchRelated]);

  const handleAddKeyword = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    if (!keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
    }
    setNewKeyword('');
    setShowAddKeyword(false);
  };

  const filteredPapers = relatedPapers.filter((p) => {
    if (sourceFilter === 'ALL') return true;
    return p.source?.toLowerCase().includes(sourceFilter.toLowerCase());
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column (lg:col-span-8): Keywords & Hairline Rows */}
      <div className="lg:col-span-8 space-y-8">
        {/* Keywords Row */}
        <div className="space-y-3 pb-6 border-b border-outline-variant/30">
          <div className="flex justify-between items-center">
            <span className="font-nav-label text-[10px] text-on-surface-variant tracking-widest">
              KEYWORDS EXTRACTED
            </span>
            <button
              onClick={() => setShowAddKeyword(!showAddKeyword)}
              className="font-nav-label text-[10px] text-primary-container hover:underline cursor-pointer"
            >
              {showAddKeyword ? 'CANCEL' : '+ ADD'}
            </button>
          </div>

          {showAddKeyword && (
            <form onSubmit={handleAddKeyword} className="flex gap-2 pb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add academic keyphrase"
                className="bg-transparent border-b border-outline-variant/50 text-xs py-1 flex-1 focus:outline-none focus:border-primary-container text-on-surface"
              />
              <button type="submit" className="font-nav-label text-[10px] text-on-surface">
                ADD
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            {keywords.map((kw, idx) => (
              <span
                key={idx}
                className="px-3 py-1 border border-primary-container/60 rounded-full text-xs font-nav-label text-on-surface bg-primary-container/10"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Toolbar: Source filters & REFRESH pill */}
        <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
          <div className="flex items-center gap-1.5 font-nav-label text-[10px]">
            {['ALL', 'SEMANTIC SCHOLAR', 'ARXIV'].map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  sourceFilter === src
                    ? 'bg-on-surface text-surface'
                    : 'text-on-surface-variant border border-outline-variant/40 hover:text-on-surface'
                }`}
              >
                {src}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchRelated(true)}
            disabled={loading}
            className="btn-secondary !h-8 !px-4 !text-[10px]"
          >
            REFRESH
          </button>
        </div>

        {error && (
          <div className="p-4 border-l-2 border-error bg-error/5 text-xs text-error flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => fetchRelated(true)} className="underline text-[10px] uppercase font-bold">
              RETRY
            </button>
          </div>
        )}

        {/* Hairline-separated results rows */}
        {loading ? (
          <div className="py-20 text-center space-y-3 font-sans">
            <div className="w-5 h-5 mx-auto border border-primary-container border-t-transparent rounded-full animate-spin"></div>
            <p className="font-nav-label text-xs text-on-surface-variant">
              MINING SEMANTIC SCHOLAR & ARXIV CORPORE…
            </p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="py-16 text-center text-xs text-on-surface-variant">
            No connected literature found. Click REFRESH to query external endpoints.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/30 border-b border-outline-variant/30">
            {filteredPapers.map((paper, idx) => (
              <div
                key={idx}
                className="py-6 flex flex-col md:flex-row justify-between items-start gap-4 hover:bg-surface-container-low px-2 -mx-2 rounded transition-colors group"
              >
                <div className="flex items-start gap-4 flex-1">
                  <span className="font-mono-counter text-xs text-primary-container pt-1">
                    0{idx + 1}
                  </span>
                  <div className="space-y-1.5">
                    <h4 className="font-display text-xl text-on-surface group-hover:text-primary transition-colors leading-tight">
                      {paper.title}
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      {paper.authors?.join(', ')} · {paper.year || 'RECENT'}
                    </p>
                    {paper.abstract && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {paper.abstract}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <span className="font-mono-counter text-[10px] text-on-surface-variant border border-outline-variant/40 px-2 py-0.5 rounded">
                    {paper.source || 'ARXIV'}
                  </span>
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-nav-label text-[10px] text-on-surface hover:text-primary-container underline uppercase"
                    >
                      OPEN ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column (lg:col-span-4): Dark Panel with Mesh & CONNECTED WORK */}
      <div className="lg:col-span-4 bg-inverse-surface border border-outline-variant/20 rounded-2xl h-[440px] relative overflow-hidden flex flex-col justify-between sticky top-24 shadow-2xl">
        <WireframeMesh
          caption="CONNECTED WORK // KNOWLEDGE TOPOLOGY"
          showRing={true}
          showScrollIcon={false}
          showShare={false}
          height="100%"
          keywords={combinedKeywords}
        />
      </div>
    </div>
  );
};

export default RelatedPapers;
