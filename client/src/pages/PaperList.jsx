import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/apiClient';
import CorpusTopologyStrip from '../components/CorpusTopologyStrip';

/**
 * SCREEN: "Papermind — Your Library" (ID: e3f78804b00b4b17a4e158f0b0f3ee55)
 * & "Papermind — Empty Library" (ID: 7e61147d5df64a1c89353873fca6aaa8)
 *
 * Swiss editorial modernism, architectural typography:
 * - Headline row: "YOUR LIBRARY" (72px, weight 500) + Right telemetry counts
 * - Toolbar: Hairline-bounded search, filter pills, tag & sort pills, view toggle, "+ UPLOAD PAPER"
 * - Editorial Table: Clean hairline rows, monospace numbering (001...), amber glowing ready dots
 * - Grid mode: 3-column architectural matrix cells
 * - Footer: Corpus storage telemetry + pagination "001 / 003" + BibTeX export
 */
const PaperList = ({ onSelectPaper, onAskPaper, onUploadClick, onAuthRequired, showNotification }) => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, READY, PROCESSING, ERROR
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [viewMode, setViewMode] = useState('list'); // 'list' (editorial table) or 'grid' (matrix cards)
  const [activeMenuPaperId, setActiveMenuPaperId] = useState(null);
  const [paperToDelete, setPaperToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    let isMounted = true;
    const fetchPapers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (onAuthRequired) onAuthRequired();
        return;
      }

      try {
        setLoading(true);
        const res = await api.get('/api/papers');
        if (isMounted) {
          setPapers(res.data || []);
        }
      } catch (err) {
        console.error('Error fetching papers:', err);
        if (showNotification) {
          showNotification('error', '[API // FAULT]', err.response?.data?.message || 'Failed to fetch paper repository.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPapers();
    return () => {
      isMounted = false;
    };
  }, [onAuthRequired, showNotification]);

  // Derived counts
  const readyCount = papers.filter((p) => p.status === 'ready').length;
  const processingCount = papers.filter((p) => p.status === 'processing').length;
  const errorCount = papers.filter((p) => p.status === 'failed').length;

  // Extract all unique tags
  const allTags = useMemo(() => {
    const map = new Map();
    papers.forEach((p) => {
      if (Array.isArray(p.keywords)) {
        p.keywords.forEach((k) => map.set(k.trim().toUpperCase(), (map.get(k.trim().toUpperCase()) || 0) + 1));
      }
      if (Array.isArray(p.summary?.keyTerms)) {
        p.summary.keyTerms.forEach((kt) => {
          if (kt.term) map.set(kt.term.trim().toUpperCase(), (map.get(kt.term.trim().toUpperCase()) || 0) + 1);
        });
      }
    });
    return Array.from(map.keys()).slice(0, 10);
  }, [papers]);

  // Filtering & Sorting
  const filteredPapers = useMemo(() => {
    return papers
      .filter((p) => {
        const matchesSearch =
          (p.title && p.title.toLowerCase().includes(searchFilter.toLowerCase())) ||
          (Array.isArray(p.authors) && p.authors.some((a) => a.toLowerCase().includes(searchFilter.toLowerCase()))) ||
          (typeof p.authors === 'string' && p.authors.toLowerCase().includes(searchFilter.toLowerCase())) ||
          (p.doi && p.doi.toLowerCase().includes(searchFilter.toLowerCase()));
        if (!matchesSearch) return false;

        if (statusFilter === 'READY' && p.status !== 'ready') return false;
        if (statusFilter === 'PROCESSING' && p.status !== 'processing') return false;
        if (statusFilter === 'ERROR' && p.status !== 'failed') return false;

        if (selectedTag !== 'ALL') {
          const hasKeyword =
            Array.isArray(p.keywords) &&
            p.keywords.some((k) => k.trim().toUpperCase() === selectedTag.toUpperCase());
          const hasKeyTerm =
            Array.isArray(p.summary?.keyTerms) &&
            p.summary.keyTerms.some((t) => t.term?.trim().toUpperCase() === selectedTag.toUpperCase());
          if (!hasKeyword && !hasKeyTerm) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') return new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0);
        if (sortBy === 'OLDEST') return new Date(a.uploadDate || 0) - new Date(b.uploadDate || 0);
        if (sortBy === 'TITLE') return (a.title || '').localeCompare(b.title || '');
        return 0;
      });
  }, [papers, searchFilter, statusFilter, selectedTag, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredPapers.length / itemsPerPage));
  const paginatedPapers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPapers.slice(start, start + itemsPerPage);
  }, [filteredPapers, currentPage]);

  const handleDeletePaper = async () => {
    if (!paperToDelete) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setDeleting(true);
      await api.delete(`/api/papers/${paperToDelete._id}`);
      setPapers((prev) => prev.filter((p) => p._id !== paperToDelete._id));
      setPaperToDelete(null);
      if (showNotification) {
        showNotification('success', '[PURGE // OK]', `Paper "${paperToDelete.title}" erased from corpus.`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      if (showNotification) {
        showNotification('error', '[PURGE // FAULT]', err.response?.data?.message || 'Failed to delete paper.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const exportBibtex = (paper) => {
    const bib = `@article{${paper._id},
  title = {${paper.title}},
  author = {${Array.isArray(paper.authors) ? paper.authors.join(' and ') : paper.authors || 'Unknown'}},
  year = {${new Date(paper.uploadDate).getFullYear()}},
  doi = {${paper.doi || 'arXiv:1706.03762'}}
}`;
    navigator.clipboard.writeText(bib);
    if (showNotification) {
      showNotification('success', '[BIBTEX // COPIED]', 'Citation record copied to clipboard.');
    }
  };

  const padNum = (n) => String(n).padStart(3, '0');

  return (
    <div className="max-w-[1440px] mx-auto px-6 sm:px-12 py-10 animate-fade-in font-sans">
      {/* 1. Headline Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline-variant/30">
        <div>
          <span className="font-counter-mono text-[10px] tracking-[0.2em] text-secondary uppercase block mb-1">
            RESEARCH CORPUS // PERSISTENT REPOSITORY
          </span>
          <h1 className="font-display text-5xl sm:text-7xl text-on-surface leading-[0.92] tracking-tight">
            YOUR LIBRARY
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-right font-counter-mono text-xs text-secondary shrink-0">
          <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/40 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_6px_#ff9a2e]"></span>
            <span className="font-semibold text-on-surface">
              {padNum(papers.length)} PAPERS · {padNum(processingCount)} PROCESSING
            </span>
          </div>
          <span className="text-[10px] text-secondary whitespace-nowrap">
            INDEX :: SYNCED {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
          </span>
        </div>
      </div>

      {/* 1.5 Minimalist Graphic Manifold Strip (Corpus Vector Topology) */}
      <CorpusTopologyStrip paperCount={papers.length} tags={allTags} />

      {/* 2. Toolbar Row (Enclosed by hairlines) */}
      <div className="py-4 border-b border-outline-variant/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 max-w-md relative">
          <span className="font-counter-mono text-xs text-secondary">⌕</span>
          <input
            id="papers-search-input"
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="SEARCH PAPERS // TITLE, AUTHOR, DOI... [⌘K]"
            className="w-full bg-transparent border-b border-outline-variant/40 focus:border-primary-container py-1 pr-6 text-xs font-mono placeholder:text-secondary text-on-surface outline-none transition-colors"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface font-mono text-xs cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Center: Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 font-counter-mono text-[10px]">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
              statusFilter === 'ALL'
                ? 'bg-inverse-surface text-on-primary shadow-sm'
                : 'border border-outline-variant/40 text-secondary hover:bg-surface-container'
            }`}
          >
            ALL ({padNum(papers.length)})
          </button>
          <button
            onClick={() => setStatusFilter('READY')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
              statusFilter === 'READY'
                ? 'bg-inverse-surface text-on-primary shadow-sm'
                : 'border border-outline-variant/40 text-secondary hover:bg-surface-container'
            }`}
          >
            READY ({padNum(readyCount)})
          </button>
          <button
            onClick={() => setStatusFilter('PROCESSING')}
            className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
              statusFilter === 'PROCESSING'
                ? 'bg-inverse-surface text-on-primary shadow-sm'
                : 'border border-outline-variant/40 text-secondary hover:bg-surface-container'
            }`}
          >
            PROCESSING ({padNum(processingCount)})
          </button>
          {errorCount > 0 && (
            <button
              onClick={() => setStatusFilter('ERROR')}
              className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                statusFilter === 'ERROR'
                  ? 'bg-error text-white shadow-sm'
                  : 'border border-error/40 text-error hover:bg-error/10'
              }`}
            >
              ERROR ({padNum(errorCount)})
            </button>
          )}
        </div>

        {/* Right: Dropdowns + View Switcher + Upload */}
        <div className="flex items-center gap-3 justify-between lg:justify-end">
          {/* Tag Dropdown */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-transparent border border-outline-variant/40 rounded-full px-3 py-1 font-counter-mono text-[10px] text-on-surface outline-none cursor-pointer"
            >
              <option value="ALL">TAG: ALL</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  TAG: {tag}
                </option>
              ))}
            </select>
          )}

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent border border-outline-variant/40 rounded-full px-3 py-1 font-counter-mono text-[10px] text-on-surface outline-none cursor-pointer"
          >
            <option value="NEWEST">SORT: NEWEST ▾</option>
            <option value="OLDEST">SORT: OLDEST ▾</option>
            <option value="TITLE">SORT: TITLE ▾</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center border border-outline-variant/40 rounded-full p-0.5 font-counter-mono text-[10px]">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-inverse-surface text-on-primary' : 'text-secondary'
              }`}
            >
              LIST
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-inverse-surface text-on-primary' : 'text-secondary'
              }`}
            >
              GRID
            </button>
          </div>

          {/* Upload Pill */}
          <button
            onClick={onUploadClick}
            className="inline-flex items-center justify-center font-label-nav text-label-nav text-on-primary bg-inverse-surface hover:bg-primary transition-all duration-200 px-4 py-1.5 rounded-full tracking-[0.1em] uppercase cursor-pointer shadow-sm"
          >
            + UPLOAD PAPER
          </button>
        </div>
      </div>

      {/* 3. Main Papers Container */}
      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-[#FF9A2E] animate-spin mx-auto" />
          <p className="font-mono text-xs uppercase tracking-widest text-[#444444]">
            SYNCHRONIZING CORPUS VECTORS...
          </p>
        </div>
      ) : filteredPapers.length === 0 ? (
        /* Zero State / Empty Library (Screen 7e61147d5df64a1c89353873fca6aaa8) */
        <div className="my-12 p-12 bg-[#1b1c1c] text-[#f1f0f0] rounded-2xl border border-outline-variant/30 text-center space-y-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-4 left-6 font-counter-mono text-[10px] text-neutral-400">
            CORPUS: 000 PAPERS · 0 VECTORS · LOCAL NODE READY
          </div>

          <div className="py-6">
            <div className="w-20 h-20 mx-auto rounded-full border border-primary-container/40 flex items-center justify-center relative mb-6">
              <span className="w-4 h-4 rounded-full bg-primary-container shadow-[0_0_20px_#ff9a2e] animate-ping" />
              <div className="absolute inset-2 rounded-full border border-white/10" />
            </div>

            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-tight uppercase">
              NO PAPERS YET
            </h2>
            <p className="text-sm text-neutral-400 max-w-md mx-auto mt-2 leading-relaxed font-body-md">
              Your personal synthesis corpus is currently empty. Ingest your first academic PDF to extract embeddings and start exploring.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onUploadClick}
              className="inline-flex items-center justify-center font-label-nav text-label-nav text-on-surface bg-primary-container hover:bg-tertiary-fixed transition-colors px-7 h-11 rounded-full uppercase tracking-wider font-bold cursor-pointer shadow-md"
            >
              UPLOAD YOUR FIRST PAPER
            </button>
            <button
              onClick={() => {
                setSearchFilter('');
                setStatusFilter('ALL');
                setSelectedTag('ALL');
              }}
              className="inline-flex items-center justify-center font-label-nav text-label-nav text-white border border-white/25 hover:bg-white/10 transition-colors px-6 h-11 rounded-full uppercase tracking-wider cursor-pointer"
            >
              CLEAR FILTERS
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* Editorial Table Rows */
        <div className="divide-y divide-outline-variant/20">
          {/* Table Headers */}
          <div className="grid grid-cols-12 py-3 font-counter-mono text-[10px] uppercase text-secondary tracking-wider gap-3 items-center">
            <div className="col-span-1">NO.</div>
            <div className="col-span-7 md:col-span-6 lg:col-span-5">TITLE & AUTHORS</div>
            <div className="col-span-2 hidden md:block">STATUS</div>
            <div className="col-span-2 hidden lg:block">INGESTED</div>
            <div className="col-span-4 md:col-span-3 lg:col-span-2 text-right">ACTIONS</div>
          </div>

          {/* Rows */}
          {paginatedPapers.map((paper, idx) => {
            const paperIndex = (currentPage - 1) * itemsPerPage + idx + 1;
            const authorsStr = Array.isArray(paper.authors)
              ? paper.authors.join(', ')
              : paper.authors || 'Unknown Authors';
            const tags = paper.keywords || paper.summary?.keyTerms?.map((k) => k.term) || [];

            return (
              <div
                key={paper._id}
                className="grid grid-cols-12 py-4 items-center gap-3 group hover:bg-surface-container-low transition-colors px-2 -mx-2 rounded-sm"
              >
                {/* No. */}
                <div className="col-span-1 font-counter-mono text-xs text-secondary">
                  {padNum(paperIndex)}
                </div>

                {/* Title & Authors */}
                <div className="col-span-7 md:col-span-6 lg:col-span-5 pr-2 min-w-0">
                  <div
                    onClick={() => onSelectPaper(paper._id)}
                    className="font-display text-base sm:text-lg font-semibold text-on-surface hover:text-primary cursor-pointer transition-colors leading-snug line-clamp-2"
                  >
                    {paper.title || 'Untitled Manuscript'}
                  </div>
                  <div className="text-xs text-secondary font-mono mt-0.5 truncate flex items-center gap-2">
                    <span className="truncate">{authorsStr}</span>
                    {paper.fileType === 'tex' && (
                      <span className="font-counter-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-[#FF9A2E]/50 text-[#8E4F00] bg-[#FF9A2E]/10 shrink-0">
                        TEX
                      </span>
                    )}
                    {paper.fileType === 'docx' && (
                      <span className="font-counter-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10 shrink-0">
                        DOCX
                      </span>
                    )}
                    {paper.fileType === 'md' && (
                      <span className="font-counter-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0">
                        MD
                      </span>
                    )}
                    {tags.length > 0 && (
                      <span className="font-counter-mono text-[9px] uppercase px-1.5 py-0.5 rounded border border-outline-variant/40 text-on-surface-variant bg-surface-container shrink-0">
                        [{tags[0]}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-2 hidden md:block">
                  {paper.status === 'ready' && (
                    <div className="inline-flex items-center gap-1.5 font-counter-mono text-[10px] text-on-surface bg-surface-container-low border border-outline-variant/40 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_6px_#ff9a2e]" />
                      <span>• READY</span>
                    </div>
                  )}
                  {paper.status === 'processing' && (
                    <div className="inline-flex items-center gap-1.5 font-counter-mono text-[10px] text-secondary bg-surface-container-low border border-outline-variant/40 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      <span>◌ PROCESSING</span>
                    </div>
                  )}
                  {paper.status === 'failed' && (
                    <div className="inline-flex items-center gap-1.5 font-counter-mono text-[10px] text-error bg-error/10 border border-error/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <span>! PARSE_ERROR</span>
                    </div>
                  )}
                </div>

                {/* Ingested (Date) */}
                <div className="col-span-2 hidden lg:flex items-center font-counter-mono text-[11px] text-secondary whitespace-nowrap">
                  {paper.uploadDate
                    ? new Date(paper.uploadDate).toLocaleDateString([], {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </div>

                {/* Actions */}
                <div className="col-span-4 md:col-span-3 lg:col-span-2 flex items-center justify-end gap-2 relative">
                  <button
                    onClick={() => onSelectPaper(paper._id)}
                    className="btn-ghost !h-7 !px-2.5 !text-[10px] hidden sm:inline-flex"
                  >
                    OPEN
                  </button>
                  <button
                    onClick={() => onSelectPaper(paper._id, 'related')}
                    className="btn-ghost !h-7 !px-2.5 !text-[10px] hidden md:inline-flex hover:border-primary-container"
                    title="Related research & 3D knowledge topology"
                  >
                    RELATED
                  </button>
                  <button
                    onClick={() => onAskPaper(paper._id)}
                    className="font-mono text-[11px] font-bold text-[#111111] hover:text-[#FF9A2E] cursor-pointer"
                    title="Ask this paper"
                  >
                    ASK →
                  </button>

                  <button
                    onClick={() =>
                      setActiveMenuPaperId(activeMenuPaperId === paper._id ? null : paper._id)
                    }
                    className="text-sm text-[#444444] hover:text-[#111111] px-1 cursor-pointer"
                  >
                    ⋯
                  </button>

                  {/* Context Menu */}
                  {activeMenuPaperId === paper._id && (
                    <div className="absolute right-0 top-8 w-44 bg-inverse-surface text-on-primary rounded-xl border border-white/15 p-2 shadow-2xl z-30 font-mono text-xs animate-fade-in">
                      <button
                        onClick={() => {
                          setActiveMenuPaperId(null);
                          exportBibtex(paper);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-md cursor-pointer text-[11px]"
                      >
                        COPY BIBTEX
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenuPaperId(null);
                          onSelectPaper(paper._id);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-md cursor-pointer text-[11px]"
                      >
                        VIEW SUMMARY
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenuPaperId(null);
                          onSelectPaper(paper._id, 'related');
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded-md cursor-pointer text-[11px] text-primary-container"
                      >
                        VIEW RELATED WORK
                      </button>
                      <div className="border-t border-white/10 my-1"></div>
                      <button
                        onClick={() => {
                          setActiveMenuPaperId(null);
                          setPaperToDelete(paper);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[#ff8080] hover:bg-red-500/10 rounded-md cursor-pointer text-[11px]"
                      >
                        DELETE PAPER
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Matrix Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
          {paginatedPapers.map((paper, idx) => {
            const paperIndex = (currentPage - 1) * itemsPerPage + idx + 1;
            const authorsStr = Array.isArray(paper.authors)
              ? paper.authors.join(', ')
              : paper.authors || 'Unknown Authors';

            return (
              <div
                key={paper._id}
                className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 flex flex-col justify-between hover:border-primary-container/60 hover:bg-surface-container transition-all hover:-translate-y-0.5 shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start font-counter-mono text-[10px] text-secondary mb-2">
                    <span>INDEX // {padNum(paperIndex)}</span>
                    {paper.status === 'ready' && (
                      <span className="flex items-center gap-1 text-on-surface">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                        READY
                      </span>
                    )}
                  </div>

                  <h3
                    onClick={() => onSelectPaper(paper._id)}
                    className="font-display text-lg font-bold text-on-surface hover:text-primary cursor-pointer line-clamp-2"
                  >
                    {paper.title || 'Untitled Manuscript'}
                  </h3>

                  <p className="font-mono text-xs text-secondary mt-1 line-clamp-1">
                    {authorsStr}
                  </p>

                  {paper.summary?.tldr && (
                    <p className="text-xs text-on-surface-variant mt-3 line-clamp-3 leading-relaxed border-t border-outline-variant/20 pt-2 font-serif italic">
                      "{paper.summary.tldr}"
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-outline-variant/30 flex items-center justify-between">
                  <button
                    onClick={() => onSelectPaper(paper._id)}
                    className="btn-ghost !h-7 !px-3 !text-[10px]"
                  >
                    OPEN
                  </button>
                  <button
                    onClick={() => onAskPaper(paper._id)}
                    className="font-counter-mono text-[11px] font-bold text-on-surface hover:text-primary cursor-pointer"
                  >
                    ASK →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Bottom Telemetry & Pagination Strip */}
      <div className="mt-8 pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-counter-mono text-[11px] text-secondary">
        <div>
          CORPUS STORAGE: {(papers.length * 2.1).toFixed(1)} MB / 5.0 GB · LOCAL ZERO-TELEMETRY
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              const bibs = papers
                .map(
                  (p, i) =>
                    `@article{paper_${i + 1},\n  title = {${p.title}},\n  author = {${
                      Array.isArray(p.authors) ? p.authors.join(' and ') : p.authors || 'Unknown'
                    }}\n}`
                )
                .join('\n\n');
              navigator.clipboard.writeText(bibs);
              if (showNotification) {
                showNotification('success', '[BIBTEX // BULK]', 'Complete corpus BibTeX copied.');
              }
            }}
            className="hover:text-[#111111] underline cursor-pointer text-[10px]"
          >
            EXPORT CITATIONS [BIBTEX]
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="hover:text-[#111111] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              ← PREV
            </button>
            <span className="font-bold text-[#111111]">
              {padNum(currentPage)} / {padNum(totalPages)}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="hover:text-[#111111] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              NEXT →
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {paperToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2B2B2B] text-[#F2F2F2] max-w-md w-full rounded-2xl border border-white/20 p-6 shadow-2xl space-y-4">
            <div className="font-mono text-[10px] text-[#BA1A1A] uppercase tracking-widest">
              [DELETION_CONFIRMATION // IRREVERSIBLE]
            </div>
            <h3 className="font-display text-xl text-white">
              Delete paper from repository?
            </h3>
            <p className="text-xs text-[#CFCFCF] leading-relaxed">
              "{paperToDelete.title}" will be purged along with all associated vector embeddings, generated synthesis summaries, and linked chat memory.
            </p>
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setPaperToDelete(null)}
                className="btn-ghost !border-white/30 !text-white hover:!bg-white/10"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeletePaper}
                disabled={deleting}
                className="btn-primary !bg-[#BA1A1A] !text-white hover:!bg-[#991515]"
              >
                {deleting ? 'PURGING...' : 'PURGE PAPER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperList;
