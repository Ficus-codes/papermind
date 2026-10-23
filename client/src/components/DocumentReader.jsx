import React, { useState, useEffect, useRef, useMemo } from 'react';
import MathRenderer from './MathRenderer';

/**
 * DocumentReader Component
 * Publication-Grade Side-by-Side Manuscript Reader with:
 * - Single Page vs Continuous Scroll view modes
 * - Real-time Amber Citation Highlighting & Smooth Auto-Scroll with .animate-citation-glow
 * - In-document text search with live query highlighting across math & text
 * - Interactive Text-Selection Floating Popover ("Ask AI about selection", "Copy Quote")
 * - Document Outline / Table of Contents drawer with 1-click section jumps
 * - Font scaling & line-height controls
 * - Quick "Citations in Conversation" navigation rail
 * - Interactive passage actions: "Ask AI about this", "Copy Quote"
 * - KaTeX mathematical rendering for equations inside manuscript text
 */
const DocumentReader = ({
  paper,
  chunks = [],
  activeCitation = null,
  onCitationSelect,
  onAskPassage,
  citationsList = [],
  isSplit = true,
  onToggleExpand,
  isExpanded = false,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState('continuous'); // 'continuous' | 'single'
  const [currentPage, setCurrentPage] = useState(activeCitation?.pageNumber || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [fontSize, setFontSize] = useState('base'); // 'sm' | 'base' | 'lg'
  const [showChunkBoundaries, setShowChunkBoundaries] = useState(true);
  const [showOutline, setShowOutline] = useState(false);
  const [copiedChunkId, setCopiedChunkId] = useState(null);
  const [textSelection, setTextSelection] = useState(null); // { text, x, y, pageNum }

  const readerContainerRef = useRef(null);
  const chunkRefs = useRef({});

  // Compute total pages from paper.pages or chunks
  const totalPages = useMemo(() => {
    if (paper?.pages && paper.pages.length > 0) {
      return paper.pages.length;
    }
    if (chunks.length > 0) {
      const maxPage = Math.max(...chunks.map((c) => c.pageNumber || 1));
      return Math.max(maxPage, 1);
    }
    return 1;
  }, [paper, chunks]);

  // Group chunks by pageNumber for structured rendering
  const pageMap = useMemo(() => {
    const map = {};
    for (let p = 1; p <= totalPages; p++) {
      map[p] = [];
    }

    if (chunks.length > 0) {
      chunks.forEach((chunk) => {
        const pageNum = chunk.pageNumber || 1;
        if (!map[pageNum]) map[pageNum] = [];
        map[pageNum].push(chunk);
      });
      // Sort chunks in each page by chunkIndex
      Object.keys(map).forEach((p) => {
        map[p].sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
      });
    } else if (paper?.pages && paper.pages.length > 0) {
      // Fallback segments from paper.pages
      paper.pages.forEach((pageItem) => {
        const pNum = pageItem.pageNumber || 1;
        const paragraphs = (pageItem.text || '')
          .split(/\n\s*\n/)
          .map((t) => t.trim())
          .filter(Boolean);

        map[pNum] = paragraphs.map((para, idx) => ({
          _id: `fallback-${pNum}-${idx}`,
          pageNumber: pNum,
          chunkIndex: idx + 1,
          text: para,
        }));
      });
    } else if (paper?.rawText) {
      // Fallback from rawText
      const paragraphs = paper.rawText
        .split(/\n\s*\n/)
        .map((t) => t.trim())
        .filter(Boolean);

      map[1] = paragraphs.map((para, idx) => ({
        _id: `fallback-1-${idx}`,
        pageNumber: 1,
        chunkIndex: idx + 1,
        text: para,
      }));
    }

    return map;
  }, [chunks, paper, totalPages]);

  // Extract document outline / sections for quick navigation
  const outline = useMemo(() => {
    const list = [];
    const seenTitles = new Set();

    chunks.forEach((chunk) => {
      if (!chunk.text) return;
      const lines = chunk.text.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        let title = null;

        const secMatch = trimmed.match(/^===\s*SECTION:\s*(.+?)\s*===/i);
        if (secMatch) {
          title = secMatch[1];
        } else if (/^#{1,3}\s+(.+)/.test(trimmed)) {
          title = trimmed.replace(/^#{1,3}\s+/, '');
        } else if (/^\d+\.?\s+[A-Z][A-Za-z0-9\s]{3,40}$/.test(trimmed) && trimmed.length < 50) {
          title = trimmed;
        }

        if (title && !seenTitles.has(title.toLowerCase())) {
          seenTitles.add(title.toLowerCase());
          list.push({
            title,
            pageNumber: chunk.pageNumber || 1,
            chunkIndex: chunk.chunkIndex,
            chunkId: chunk._id,
          });
        }
      });
    });

    return list;
  }, [chunks]);

  // Handle active citation changes: auto-navigate to page and scroll to chunk
  useEffect(() => {
    if (!activeCitation) return;

    const targetPage = activeCitation.pageNumber || 1;
    if (viewMode === 'single' && currentPage !== targetPage) {
      setCurrentPage(targetPage);
    }

    // Scroll to the cited chunk after brief DOM paint
    const timer = setTimeout(() => {
      let targetElement = null;

      if (activeCitation.chunkId && chunkRefs.current[activeCitation.chunkId]) {
        targetElement = chunkRefs.current[activeCitation.chunkId];
      } else {
        const key = `${targetPage}-${activeCitation.chunkIndex ?? 1}`;
        targetElement = chunkRefs.current[key];
      }

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [activeCitation, viewMode, currentPage]);

  // Handle in-manuscript text search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results = [];

    Object.entries(pageMap).forEach(([pageNum, pageChunks]) => {
      pageChunks.forEach((chunk) => {
        if (chunk.text && chunk.text.toLowerCase().includes(query)) {
          results.push({
            pageNumber: parseInt(pageNum, 10),
            chunkId: chunk._id,
            chunkIndex: chunk.chunkIndex,
          });
        }
      });
    });

    return results;
  }, [searchQuery, pageMap]);

  // Reset active search index when query changes
  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchQuery]);

  // Listen for user text selections inside reader container
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setTextSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length > 5) {
        try {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (readerContainerRef.current?.contains(range.commonAncestorContainer)) {
            setTextSelection({
              text,
              x: Math.max(rect.left + rect.width / 2, 80),
              y: Math.max(rect.top - 8, 10),
            });
            return;
          }
        } catch {
          // ignore selection range errors
        }
      }
      setTextSelection(null);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Navigate through search matches
  const handleNextSearch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeSearchIndex + 1) % searchResults.length;
    setActiveSearchIndex(nextIdx);
    scrollToSearchResult(searchResults[nextIdx]);
  };

  const handlePrevSearch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveSearchIndex(prevIdx);
    scrollToSearchResult(searchResults[prevIdx]);
  };

  const scrollToSearchResult = (result) => {
    if (!result) return;
    if (viewMode === 'single' && currentPage !== result.pageNumber) {
      setCurrentPage(result.pageNumber);
    }

    setTimeout(() => {
      const el = chunkRefs.current[result.chunkId] || chunkRefs.current[`${result.pageNumber}-${result.chunkIndex}`];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  // Jump to specific outline section
  const handleJumpToSection = (item) => {
    if (viewMode === 'single' && currentPage !== item.pageNumber) {
      setCurrentPage(item.pageNumber);
    }

    setShowOutline(false);

    setTimeout(() => {
      const key = item.chunkId || `${item.pageNumber}-${item.chunkIndex ?? 1}`;
      const el = chunkRefs.current[key];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  // Copy chunk text
  const handleCopyChunk = (chunk) => {
    if (!chunk?.text) return;
    const textToCopy = `[Excerpt from "${paper?.title || 'Document'}", Page ${chunk.pageNumber || 1}, Chunk #${chunk.chunkIndex ?? 1}]\n\n${chunk.text}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedChunkId(chunk._id || `${chunk.pageNumber}-${chunk.chunkIndex}`);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  // Determine font size CSS class
  const fontSizeClass = {
    sm: 'text-xs leading-relaxed',
    base: 'text-sm leading-relaxed',
    lg: 'text-base leading-loose',
  }[fontSize];

  // Helper to check if a chunk is the actively cited one
  const isChunkActive = (chunk) => {
    if (!activeCitation) return false;
    if (activeCitation.chunkId && chunk._id && activeCitation.chunkId === chunk._id) {
      return true;
    }
    const citePage = activeCitation.pageNumber || 1;
    const citeIndex = activeCitation.chunkIndex ?? 1;
    return chunk.pageNumber === citePage && (chunk.chunkIndex === citeIndex || chunk.chunkIndex == null);
  };

  // Format file extension badge
  const fileTypeLabel = {
    pdf: 'PDF MANUSCRIPT',
    tex: 'LATEX SOURCE (.TEX)',
    docx: 'WORD DOCX',
    md: 'MARKDOWN (.MD)',
  }[paper?.fileType || 'pdf'];

  return (
    <div
      className={`relative flex flex-col bg-surface border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 font-sans ${isExpanded ? 'fixed inset-4 z-50 shadow-2xl bg-surface' : 'h-full min-h-[640px]'
        }`}
    >
      {/* 1. Header Toolbar */}
      <div className="bg-surface-container-low border-b border-outline-variant/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container shadow-[0_0_8px_#FF9A2E] animate-pulse"></span>
            <span className="font-nav-label text-xs font-bold text-on-surface tracking-wider">
              MANUSCRIPT READER
            </span>
          </div>

          <span className="font-mono text-[10px] text-primary-container bg-primary-container/10 border border-primary-container/30 px-2 py-0.5 rounded uppercase font-semibold">
            {fileTypeLabel}
          </span>

          <span className="font-mono text-[10px] text-on-surface-variant hidden sm:inline">
            · {totalPages} {totalPages === 1 ? 'PAGE' : 'PAGES'}
          </span>
        </div>

        {/* View Mode & Utility Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Outline / Table of Contents toggle */}
          {outline.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOutline((prev) => !prev)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${showOutline
                  ? 'bg-primary-container text-on-primary-fixed border-primary-container font-bold shadow-xs'
                  : 'bg-surface border-outline-variant/40 text-on-surface hover:border-primary-container'
                }`}
              title="Table of Contents / Section Outline"
            >
              <span>📑</span>
              <span>Outline ({outline.length})</span>
            </button>
          )}

          {/* View Mode Toggle: Single Page vs Continuous */}
          <div className="inline-flex rounded-lg border border-outline-variant/40 bg-surface p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setViewMode('continuous')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${viewMode === 'continuous'
                  ? 'bg-on-surface text-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`}
              title="Continuous Scroll through all pages"
            >
              📜 Continuous
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${viewMode === 'single'
                  ? 'bg-on-surface text-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`}
              title="Focus on single page with pagination"
            >
              📄 Single Page
            </button>
          </div>

          {/* Font Scaling */}
          <div className="inline-flex rounded-lg border border-outline-variant/40 bg-surface p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded cursor-pointer ${fontSize === 'sm' ? 'bg-primary-container text-on-primary-fixed font-bold' : 'text-on-surface-variant'}`}
              title="Compact font"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setFontSize('base')}
              className={`px-2 py-1 rounded cursor-pointer ${fontSize === 'base' ? 'bg-primary-container text-on-primary-fixed font-bold' : 'text-on-surface-variant'}`}
              title="Standard font"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded cursor-pointer ${fontSize === 'lg' ? 'bg-primary-container text-on-primary-fixed font-bold' : 'text-on-surface-variant'}`}
              title="Large font"
            >
              A+
            </button>
          </div>

          {/* Toggle Chunk Boundary Indicators */}
          <button
            type="button"
            onClick={() => setShowChunkBoundaries((prev) => !prev)}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${showChunkBoundaries
                ? 'border-outline-variant/50 bg-surface text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            title="Toggle vector chunk boundary labels"
          >
            🧩 Chunks
          </button>

          {/* Fullscreen / Expand button */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg border border-outline-variant/40 bg-surface text-on-surface hover:border-primary-container transition-colors cursor-pointer text-xs"
              title={isExpanded ? 'Minimize reader' : 'Expand full workstation'}
            >
              {isExpanded ? '🗗' : '⛶'}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-outline-variant/40 bg-surface text-on-surface hover:text-error hover:border-error transition-colors cursor-pointer text-xs"
              title="Close reader"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Secondary Sub-Bar: Search & Page Selector */}
      <div className="bg-surface-container/60 border-b border-outline-variant/20 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        {/* Page Navigator */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {viewMode === 'single' ? (
            <>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="px-2 py-0.5 rounded border border-outline-variant/40 disabled:opacity-30 hover:border-primary-container cursor-pointer transition-colors"
                title="Previous page"
              >
                ←
              </button>
              <span className="font-semibold text-on-surface">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-2 py-0.5 rounded border border-outline-variant/40 disabled:opacity-30 hover:border-primary-container cursor-pointer transition-colors"
                title="Next page"
              >
                →
              </button>
            </>
          ) : (
            <span className="text-on-surface-variant">
              Showing All {totalPages} Pages
            </span>
          )}

          {/* Quick Page Jump Pills */}
          {totalPages > 1 && totalPages <= 10 && (
            <div className="hidden md:flex items-center gap-1 ml-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => {
                    if (viewMode === 'single') {
                      setCurrentPage(pNum);
                    } else {
                      const div = document.getElementById(`page-divider-${pNum}`);
                      div?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] cursor-pointer transition-colors ${(viewMode === 'single' ? currentPage === pNum : activeCitation?.pageNumber === pNum)
                      ? 'bg-primary-container text-on-primary-fixed font-bold'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  title={`Jump to Page ${pNum}`}
                >
                  {pNum}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Find / Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find in manuscript…"
              className="w-full bg-surface border border-outline-variant/40 rounded-full pl-7 pr-16 py-1 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container"
            />
            <span className="absolute left-2.5 top-1.5 text-on-surface-variant text-[11px]">
              🔍
            </span>
            {searchResults.length > 0 && (
              <span className="absolute right-2.5 top-1.5 font-mono text-[10px] text-primary-container font-bold">
                {activeSearchIndex + 1}/{searchResults.length}
              </span>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevSearch}
                className="w-6 h-6 rounded border border-outline-variant/40 flex items-center justify-center text-xs hover:border-primary-container cursor-pointer"
                title="Previous match"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={handleNextSearch}
                className="w-6 h-6 rounded border border-outline-variant/40 flex items-center justify-center text-xs hover:border-primary-container cursor-pointer"
                title="Next match"
              >
                ↓
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Citations in Conversation Quick-Rail (If Any) */}
      {citationsList.length > 0 && (
        <div className="bg-primary-container/10 border-b border-primary-container/20 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 text-xs font-mono">
          <span className="text-[10px] font-bold text-primary-container uppercase shrink-0 flex items-center gap-1">
            <span>📖</span>
            <span>CITED IN DISCUSSION:</span>
          </span>
          <div className="flex items-center gap-1.5">
            {citationsList.map((cite, idx) => {
              const pNum = cite.pageNumber || 1;
              const chIdx = cite.chunkIndex ?? 1;
              const isSelected =
                activeCitation &&
                (activeCitation.chunkId === cite.chunkId ||
                  (activeCitation.pageNumber === pNum && activeCitation.chunkIndex === chIdx));

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (onCitationSelect) onCitationSelect(cite);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${isSelected
                      ? 'bg-primary-container text-on-primary-fixed border border-primary-container font-bold shadow-[0_0_8px_#FF9A2E]'
                      : 'bg-surface border border-outline-variant/40 text-on-surface hover:border-primary-container'
                    }`}
                  title={`Jump to Page ${pNum}, Chunk #${chIdx}`}
                >
                  <span>p.{pNum}</span>
                  <span className="opacity-70">#{chIdx}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Active Citation Sticky Banner */}
      {activeCitation && (
        <div className="bg-primary-container/15 border-b border-primary-container/30 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 text-xs animate-fade-in">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse shrink-0"></span>
            <span className="font-mono text-[11px] font-bold text-on-surface truncate">
              ACTIVE CITATION: PAGE {activeCitation.pageNumber || 1} · CHUNK #{activeCitation.chunkIndex ?? 1}
            </span>
            {activeCitation.score && (
              <span className="font-mono text-[10px] text-primary-container bg-surface border border-primary-container/30 px-1.5 py-0.2 rounded shrink-0">
                {(activeCitation.score * 100).toFixed(0)}% MATCH
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const key = activeCitation.chunkId || `${activeCitation.pageNumber || 1}-${activeCitation.chunkIndex ?? 1}`;
                const el = chunkRefs.current[key];
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-[10px] font-mono text-primary underline cursor-pointer hover:text-on-surface font-bold"
            >
              FOCUS IN VIEW ↗
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Content Area with Optional Outline Slide-Over */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Table of Contents Drawer */}
        {showOutline && (
          <div className="w-64 border-r border-outline-variant/30 bg-surface-container-low/95 backdrop-blur-md p-4 overflow-y-auto z-20 shrink-0 space-y-3 animate-fade-in text-xs font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <span className="font-bold text-on-surface uppercase text-[11px]">
                MANUSCRIPT OUTLINE
              </span>
              <button
                type="button"
                onClick={() => setShowOutline(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {outline.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleJumpToSection(item)}
                  className="w-full text-left p-2 rounded-lg hover:bg-surface-container hover:border-primary-container border border-transparent transition-all cursor-pointer flex items-start justify-between gap-2"
                >
                  <span className="truncate text-on-surface font-sans text-xs">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-primary-container shrink-0">
                    p.{item.pageNumber}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manuscript Body Scroll Area */}
        <div
          ref={readerContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-surface-container-lowest text-on-surface relative"
        >
          {/* Render pages according to viewMode */}
          {(viewMode === 'single' ? [currentPage] : Object.keys(pageMap).map(Number)).map((pageNum) => {
            const pageChunks = pageMap[pageNum] || [];

            return (
              <div
                key={pageNum}
                id={`page-divider-${pageNum}`}
                className="space-y-4 max-w-3xl mx-auto"
              >
                {/* Page Header / Divider in Continuous Mode */}
                <div className="flex items-center gap-3 pt-4 pb-2 border-b border-outline-variant/30 sticky top-0 bg-surface-container-lowest/95 backdrop-blur-xs z-10">
                  <span className="font-mono text-[10px] font-bold text-primary-container tracking-wider uppercase bg-primary-container/10 border border-primary-container/30 px-2 py-0.5 rounded">
                    MANUSCRIPT PAGE {pageNum} OF {totalPages}
                  </span>
                  <div className="h-px bg-outline-variant/30 flex-1"></div>
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    {pageChunks.length} {pageChunks.length === 1 ? 'CHUNK' : 'CHUNKS'}
                  </span>
                </div>

                {/* Chunks / Paragraphs on this page */}
                {pageChunks.length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-on-surface-variant italic">
                    [Blank page or non-textual layout content]
                  </div>
                ) : (
                  pageChunks.map((chunk, cIdx) => {
                    const isActive = isChunkActive(chunk);
                    const chunkKey = chunk._id || `${pageNum}-${chunk.chunkIndex ?? cIdx + 1}`;
                    const isCopied = copiedChunkId === chunkKey;

                    return (
                      <div
                        key={chunkKey}
                        ref={(el) => {
                          if (el) {
                            chunkRefs.current[chunkKey] = el;
                            if (chunk._id) chunkRefs.current[chunk._id] = el;
                          }
                        }}
                        className={`group relative rounded-xl transition-all duration-300 p-4 border ${isActive
                            ? 'border-primary-container bg-primary-container/15 ring-2 ring-primary-container/40 shadow-md animate-citation-glow'
                            : 'border-outline-variant/20 bg-surface hover:border-outline-variant/50 hover:bg-surface-container-low/40'
                          }`}
                      >
                        {/* Active Citation Badge Anchor */}
                        {isActive && (
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-primary-container/30 font-mono text-[10px] text-primary-container font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                              <span>📌 GROUNDED EVIDENCE CHUNK #{chunk.chunkIndex ?? cIdx + 1}</span>
                            </span>
                            <span>REFERENCED IN ANSWER</span>
                          </div>
                        )}

                        {/* Header bar with Chunk boundary info & hover actions */}
                        <div className="flex justify-between items-center pb-1 text-[10px] font-mono text-on-surface-variant">
                          {showChunkBoundaries && (
                            <span className="text-[9px] tracking-wide uppercase opacity-70">
                              SEGMENT #{chunk.chunkIndex ?? cIdx + 1} · {chunk.tokenCount ? `${chunk.tokenCount} TKN` : `PAGE ${pageNum}`}
                            </span>
                          )}

                          {/* Interactive Passage Action Toolbar */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                            {onAskPassage && (
                              <button
                                type="button"
                                onClick={() => onAskPassage(chunk.text, pageNum)}
                                className="px-2 py-0.5 rounded bg-on-surface text-surface hover:bg-primary-container hover:text-on-primary-fixed transition-colors text-[10px] font-mono font-semibold cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Ask AI to analyze or explain this passage"
                              >
                                <span>💬 Ask AI</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyChunk(chunk)}
                              className="px-2 py-0.5 rounded border border-outline-variant/40 hover:border-on-surface bg-surface text-on-surface text-[10px] font-mono cursor-pointer transition-colors"
                              title="Copy passage to clipboard"
                            >
                              {isCopied ? '✓ Copied' : '📋 Copy'}
                            </button>
                          </div>
                        </div>

                        {/* Math & Content Typography with live searchQuery highlighting */}
                        <div className={`${fontSizeClass} font-sans leading-relaxed text-on-surface pt-1`}>
                          <MathRenderer
                            content={chunk.text}
                            searchQuery={searchQuery}
                            displayBlockMathCentered={false}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Floating Text-Selection Popover */}
      {textSelection && (
        <div
          style={{
            position: 'fixed',
            left: `${textSelection.x}px`,
            top: `${textSelection.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-50 bg-[#1E2021] text-white border border-[#FF9A2E]/50 rounded-xl px-2 py-1.5 shadow-2xl flex items-center gap-2 text-xs font-mono animate-fade-in"
        >
          {onAskPassage && (
            <button
              type="button"
              onClick={() => {
                onAskPassage(textSelection.text, currentPage);
                setTextSelection(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="px-2 py-0.5 rounded bg-primary-container text-on-primary-fixed font-bold hover:brightness-110 cursor-pointer flex items-center gap-1"
            >
              <span>💬</span>
              <span>Ask AI about selection</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const textToCopy = `[Selected quote from "${paper?.title || 'Document'}", Page ${currentPage}]\n"${textSelection.text}"`;
              navigator.clipboard.writeText(textToCopy);
              setTextSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="px-2 py-0.5 rounded border border-white/20 hover:border-white text-white/80 hover:text-white cursor-pointer"
          >
            📋 Copy Quote
          </button>

          <button
            type="button"
            onClick={() => setTextSelection(null)}
            className="text-white/50 hover:text-white px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 7. Footer Status Bar */}
      <div className="bg-surface-container-low border-t border-outline-variant/30 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-on-surface-variant shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>GROUNDED MANUSCRIPT ATLAS</span>
        </div>
        <div>
          <span>{chunks.length} VECTOR SEGMENTS INDEXED</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
