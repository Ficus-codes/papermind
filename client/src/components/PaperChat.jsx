import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/apiClient';
import MathRenderer from './MathRenderer';
import DocumentReader from './DocumentReader';

const getCurrentTimestamp = () => Date.now();

/**
 * Page 7 — Ask This Paper (/papers/[id]/chat)
 * Interactive Grounded RAG Chat with:
 * - Dual Mode: Split-Screen Document Reader vs Focused Evidence Card
 * - In-text clickable page numbers: [Page X], [p.X], Page X
 * - Real-time Amber Citation Highlighting & Smooth Auto-Scroll in Manuscript
 * - In-document search, font scaling, and continuous/single page views
 * - Bi-directional interaction: "Ask AI about this passage" from manuscript to chat
 * - Verbatim Section Context Drawer / Modal fallback
 */
const PaperChat = ({
  paperId,
  paperTitle = 'Paper',
  paper = null,
  initialViewMode = 'reader',
  onAuthRequired,
  onSwitchToLibrary,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paperChunks, setPaperChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [error, setError] = useState('');
  const [highlightPulse, setHighlightPulse] = useState(false);

  // Split-Screen Reader states
  const [viewMode, setViewMode] = useState(initialViewMode); // 'reader' | 'evidence'
  const [splitRatio, setSplitRatio] = useState('40-60'); // '50-50' | '40-60' | '60-40'
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [paperData, setPaperData] = useState(paper || null);

  const messagesEndRef = useRef(null);
  const rightPaneRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Sync or Fetch Paper Metadata
  useEffect(() => {
    if (paper) {
      setPaperData(paper);
      return;
    }

    let isMounted = true;
    const fetchPaper = async () => {
      const token = localStorage.getItem('token');
      if (!token || !paperId) return;

      try {
        const response = await api.get(`/api/papers/${paperId}`);
        if (isMounted) {
          setPaperData(response.data);
        }
      } catch (err) {
        console.error('Failed to load paper details for reader:', err);
      }
    };

    fetchPaper();
    return () => {
      isMounted = false;
    };
  }, [paper, paperId]);

  // 2. Fetch Chat History
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await api.get(`/api/chat/paper/${paperId}`);

        if (!isMounted) return;

        if (response.data.messages && response.data.messages.length > 0) {
          setMessages(response.data.messages);
          setSessionId(response.data.sessionId);
          // Set first citation as active preview if available
          const firstWithCite = response.data.messages.find(
            (m) => m.citations && m.citations.length > 0
          );
          if (firstWithCite && firstWithCite.citations[0]) {
            setSelectedCitation(firstWithCite.citations[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    if (paperId) {
      fetchHistory();
    }

    return () => {
      isMounted = false;
    };
  }, [paperId]);

  // 3. Fetch Paper Chunks in Background for Instant Verbatim Context Lookup
  useEffect(() => {
    let isMounted = true;

    const fetchChunks = async () => {
      const token = localStorage.getItem('token');
      if (!token || !paperId) return;

      try {
        setLoadingChunks(true);
        const res = await api.get(`/api/papers/${paperId}/chunks`);
        if (isMounted && res.data.chunks) {
          setPaperChunks(res.data.chunks);
        }
      } catch (err) {
        console.error('Failed to load paper chunks:', err);
      } finally {
        if (isMounted) setLoadingChunks(false);
      }
    };

    fetchChunks();

    return () => {
      isMounted = false;
    };
  }, [paperId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        if (isReaderExpanded) setIsReaderExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isReaderExpanded]);

  // Extract all citations from conversation for reader quick-jump rail
  const allCitations = useMemo(() => {
    const list = [];
    const seen = new Set();
    messages.forEach((msg) => {
      if (msg.citations && msg.citations.length > 0) {
        msg.citations.forEach((c) => {
          const key = `${c.pageNumber || 1}-${c.chunkIndex ?? 1}-${c.chunkId || ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push(c);
          }
        });
      }
    });
    return list;
  }, [messages]);

  // 4. Send Message
  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend : inputMessage;
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    const tempUserMsg = {
      role: 'user',
      content: trimmed,
      timestamp: getCurrentTimestamp(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage('');
    setLoading(true);
    setError('');

    try {
      const response = await api.post(
        `/api/chat/paper/${paperId}`,
        { message: trimmed, sessionId }
      );

      if (response.data.sessionId) {
        setSessionId(response.data.sessionId);
      }

      const citations = response.data.citations || [];
      const assistantMsg = {
        role: 'assistant',
        content: response.data.assistantMessage,
        citations: citations,
        timestamp: getCurrentTimestamp(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (citations.length > 0) {
        setSelectedCitation(citations[0]);
        triggerHighlightPulse();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while retrieving literature.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await api.delete(`/api/chat/paper/${paperId}`);
      setMessages([]);
      setSessionId(null);
      setSelectedCitation(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  const triggerHighlightPulse = () => {
    setHighlightPulse(true);
    setTimeout(() => setHighlightPulse(false), 1400);
  };

  // 5. Citation Click Handler: Resolves Full Section Text & Activates Context Viewer / Reader
  const handleSelectCitation = (citation, forceOpenModal = false) => {
    if (!citation) return;

    // Enhance citation with full text from paperChunks if citation text is truncated or missing
    let fullText = citation.text || citation.snippet || citation.excerpt || '';
    let matchedChunk = null;

    if (paperChunks.length > 0) {
      if (citation.chunkId) {
        matchedChunk = paperChunks.find((ch) => ch._id === citation.chunkId);
      }
      if (!matchedChunk && citation.pageNumber) {
        matchedChunk = paperChunks.find(
          (ch) =>
            ch.pageNumber === citation.pageNumber &&
            (citation.chunkIndex == null || ch.chunkIndex === citation.chunkIndex)
        );
        if (!matchedChunk) {
          matchedChunk = paperChunks.find((ch) => ch.pageNumber === citation.pageNumber);
        }
      }
    }

    if (matchedChunk && matchedChunk.text) {
      fullText = matchedChunk.text;
    }

    const enhanced = {
      ...citation,
      text: fullText,
      chunkIndex: citation.chunkIndex ?? matchedChunk?.chunkIndex ?? 1,
      pageNumber: citation.pageNumber ?? matchedChunk?.pageNumber ?? 1,
      paperTitle: citation.paperTitle || paperTitle,
      chunkId: citation.chunkId || matchedChunk?._id,
    };

    setSelectedCitation(enhanced);
    triggerHighlightPulse();

    // If modal is explicitly requested (e.g. from modal button), open modal.
    // If in Split Reader mode, no need to obstruct with modal since the reader is right there!
    if (forceOpenModal) {
      setIsModalOpen(true);
    }
  };

  // 6. In-Text Page Number Click Handler: Finds Matching Citation or Looks Up Page Chunk
  const handlePageClick = (pageNumber, chunkIndex = null, messageCitations = []) => {
    const pNum = parseInt(pageNumber, 10);
    if (isNaN(pNum)) return;

    // First try message-specific citations
    let match = null;
    if (messageCitations && messageCitations.length > 0) {
      match = messageCitations.find(
        (c) =>
          c.pageNumber === pNum &&
          (chunkIndex == null || c.chunkIndex === parseInt(chunkIndex, 10))
      );
      if (!match) {
        match = messageCitations.find((c) => c.pageNumber === pNum);
      }
    }

    // Next try looking up from paperChunks
    if (!match && paperChunks.length > 0) {
      const chunkMatch =
        paperChunks.find(
          (ch) =>
            ch.pageNumber === pNum &&
            (chunkIndex == null || ch.chunkIndex === parseInt(chunkIndex, 10))
        ) || paperChunks.find((ch) => ch.pageNumber === pNum);

      if (chunkMatch) {
        match = {
          chunkId: chunkMatch._id,
          pageNumber: chunkMatch.pageNumber,
          chunkIndex: chunkMatch.chunkIndex,
          text: chunkMatch.text,
          snippet: chunkMatch.text.slice(0, 280),
          paperTitle: paperTitle,
        };
      }
    }

    // Fallback if no chunk loaded yet
    if (!match) {
      match = {
        pageNumber: pNum,
        chunkIndex: chunkIndex ? parseInt(chunkIndex, 10) : 1,
        text: `Section reference extracted from Page ${pNum} of "${paperTitle}".`,
        paperTitle: paperTitle,
      };
    }

    // If user is currently in evidence mode, automatically switch to reader or select citation
    handleSelectCitation(match, false);
  };

  // 7. Passage Action: Send cited/selected passage to chat composer
  const handleAskPassage = (passageText, pageNum) => {
    if (!passageText) return;
    const preview = passageText.length > 180 ? `${passageText.slice(0, 180)}…` : passageText;
    setInputMessage(`Explain this passage from Page ${pageNum}: "${preview}"`);
    inputRef.current?.focus();
  };

  // Navigate to adjacent chunks in the paper
  const handleNavigateChunk = (direction) => {
    if (!selectedCitation || paperChunks.length === 0) return;

    const currentIdx = paperChunks.findIndex(
      (ch) =>
        ch._id === selectedCitation.chunkId ||
        (ch.pageNumber === selectedCitation.pageNumber && ch.chunkIndex === selectedCitation.chunkIndex)
    );

    if (currentIdx === -1) return;

    const nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < paperChunks.length) {
      const nextChunk = paperChunks[nextIdx];
      setSelectedCitation({
        chunkId: nextChunk._id,
        pageNumber: nextChunk.pageNumber,
        chunkIndex: nextChunk.chunkIndex,
        text: nextChunk.text,
        snippet: nextChunk.text.slice(0, 280),
        paperTitle: paperTitle,
      });
    }
  };

  // Copy excerpt to clipboard
  const handleCopyExcerpt = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Interactive KaTeX Math & Citation Renderer
  const renderMessageContent = (content, messageCitations = []) => {
    if (!content) return null;
    return (
      <MathRenderer
        content={content}
        citations={messageCitations}
        onCitationClick={(pageNum, chunkIdx) => handlePageClick(pageNum, chunkIdx, messageCitations)}
      />
    );
  };

  const suggestions = [
    'What is the primary contribution of this work?',
    'Explain the empirical methodology and evaluation metrics',
    'What key limitations or constraints are noted by the authors?',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Workstation Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <span className="font-nav-label text-[10px] text-on-surface-variant tracking-widest block">
            RAG INTERROGATION & MANUSCRIPT CO-READER
          </span>
          <h2 className="font-display text-2xl text-on-surface">
            ASK THIS PAPER
          </h2>
        </div>

        {/* View Mode & Library Switchers */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Split Ratio Controls (Visible in Reader Mode) */}
          {viewMode === 'reader' && (
            <div className="hidden sm:inline-flex rounded-full border border-outline-variant/40 bg-surface-container p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setSplitRatio('50-50')}
                className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                  splitRatio === '50-50'
                    ? 'bg-on-surface text-surface font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Balanced 50/50 layout"
              >
                50:50
              </button>
              <button
                type="button"
                onClick={() => setSplitRatio('40-60')}
                className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                  splitRatio === '40-60'
                    ? 'bg-on-surface text-surface font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Wide Reader (40% Chat / 60% Reader)"
              >
                40:60
              </button>
              <button
                type="button"
                onClick={() => setSplitRatio('60-40')}
                className={`px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                  splitRatio === '60-40'
                    ? 'bg-on-surface text-surface font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="Wide Chat (60% Chat / 40% Reader)"
              >
                60:40
              </button>
            </div>
          )}

          {/* Split Reader vs Evidence Card Toggle */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40">
            <button
              type="button"
              onClick={() => setViewMode('reader')}
              className={`px-3 py-1.5 rounded-full font-nav-label text-[10px] transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'reader'
                  ? 'bg-on-surface text-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Split-Screen: Interactive Chat side-by-side with Live Manuscript Reader"
            >
              <span>📖</span>
              <span>SPLIT READER</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('evidence')}
              className={`px-3 py-1.5 rounded-full font-nav-label text-[10px] transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'evidence'
                  ? 'bg-on-surface text-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Evidence Card: Chat with focused evidentiary snippet panel"
            >
              <span>⚡</span>
              <span>EVIDENCE CARD</span>
            </button>
          </div>

          {/* Segmented Pill Control: THIS PAPER | MY LIBRARY */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-full border border-outline-variant/40">
            <button
              className="px-3.5 py-1.5 rounded-full font-nav-label text-[10px] bg-on-surface text-surface shadow-xs cursor-default font-bold"
            >
              THIS PAPER
            </button>
            <button
              onClick={onSwitchToLibrary}
              className="px-3.5 py-1.5 rounded-full font-nav-label text-[10px] text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            >
              MY LIBRARY
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Layout: Left Chat · Right Reader or Evidence Panel */}
      <div
        className={`grid grid-cols-1 ${
          viewMode === 'reader' ? 'lg:grid-cols-12 gap-6' : 'lg:grid-cols-12 gap-8'
        } items-start min-h-[660px]`}
      >
        {/* Left Pane: Interactive Chat Stream */}
        <div
          className={`${
            viewMode === 'reader'
              ? splitRatio === '50-50'
                ? 'lg:col-span-6'
                : splitRatio === '60-40'
                  ? 'lg:col-span-7'
                  : 'lg:col-span-5'
              : 'lg:col-span-7'
          } card-hairline p-5 sm:p-6 flex flex-col justify-between bg-surface-container-low min-h-[660px] h-full rounded-2xl border border-outline-variant/30`}
        >
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 max-h-[560px]">
            {messages.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <span className="font-mono-counter text-xs text-primary-container">
                  GROUNDED CONVERSATION
                </span>
                <h3 className="font-display text-xl sm:text-2xl text-on-surface">
                  INTERROGATE "{paperTitle}"
                </h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  Ask targeted questions regarding mathematical formulations, proofs, or experimental setups. Every response provides clickable page citations so you can verify the exact text in the paper.
                </p>

                {/* Suggested-question pills */}
                <div className="flex flex-col gap-2 max-w-md mx-auto pt-4 text-left">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(s)}
                      className="p-2.5 px-4 rounded-full border border-outline-variant/50 text-xs text-on-surface hover:bg-surface-container-high hover:border-on-surface transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate pr-2">{s}</span>
                      <span className="text-primary font-bold shrink-0">→</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  {msg.role === 'user' ? (
                    /* User right-aligned bubble */
                    <div className="flex justify-end">
                      <div className="max-w-[85%] border border-outline-variant/60 rounded-2xl px-4 py-2.5 text-xs text-on-surface bg-surface leading-relaxed shadow-xs">
                        <MathRenderer content={msg.content} />
                      </div>
                    </div>
                  ) : (
                    /* Assistant left-aligned text with interactive page citations */
                    <div className="pt-4 border-t border-outline-variant/30 space-y-3">
                      <div className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                        {renderMessageContent(msg.content, msg.citations)}
                      </div>

                      {/* Clickable Citation chips like [p.4] and [p.7] */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2">
                          <span className="font-nav-label text-[9px] text-on-surface-variant block mb-1.5 uppercase tracking-wider">
                            VERIFIED CITATIONS (CLICK TO HIGHLIGHT IN MANUSCRIPT):
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            {msg.citations.map((c, cIdx) => {
                              const isSelected =
                                selectedCitation &&
                                (selectedCitation.chunkId === c.chunkId ||
                                  (selectedCitation.pageNumber === c.pageNumber &&
                                    selectedCitation.chunkIndex === c.chunkIndex));

                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => handleSelectCitation(c, false)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-primary-container text-on-primary-fixed border border-primary-container font-bold shadow-[0_0_8px_#FF9A2E]'
                                      : 'bg-surface border border-outline-variant/50 text-on-surface hover:border-primary-container hover:bg-primary-container/10'
                                  }`}
                                  title={`Click to navigate and highlight Page ${c.pageNumber || 1} in the reader`}
                                >
                                  <span>📖</span>
                                  <span>Page {c.pageNumber || 1}</span>
                                  <span className="text-[10px] opacity-70">
                                    · Chunk #{c.chunkIndex ?? 1} ↗
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="pt-4 border-t border-outline-variant/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-container animate-ping"></div>
                  <span className="font-nav-label text-[10px] text-on-surface-variant tracking-wider">
                    RETRIEVING & GROUNDING VERBATIM EXCERPTS…
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 border-l-2 border-error bg-error/5 text-xs text-error flex justify-between items-center rounded-r-lg">
                <span>{error}</span>
                <button
                  onClick={() => handleSendMessage(inputMessage)}
                  className="underline text-[10px] uppercase font-bold cursor-pointer"
                >
                  RETRY
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer pinned at bottom */}
          <div className="pt-4 border-t border-outline-variant/30 space-y-2">
            {messages.length > 0 && (
              <div className="flex justify-between items-center text-[10px] font-mono-counter text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                  STRICT PAGE GROUNDING ACTIVE
                </span>
                <button
                  onClick={handleClearHistory}
                  className="hover:text-error underline cursor-pointer transition-colors"
                >
                  CLEAR SESSION
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="ASK THIS PAPER ABOUT FORMULATIONS, EXPERIMENTS, PROOFS…"
                disabled={loading}
                className="w-full bg-surface border border-outline-variant/50 rounded-full pl-5 pr-12 py-3 text-xs text-on-surface placeholder:text-on-surface-variant/60 placeholder:font-nav-label focus:outline-none focus:border-primary-container transition-colors shadow-xs"
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="absolute right-2 top-2 w-8 h-8 rounded-full bg-on-surface text-surface flex items-center justify-center hover:bg-primary-container hover:text-inverse-on-surface transition-all disabled:opacity-40 cursor-pointer"
              >
                ↑
              </button>
            </form>
          </div>
        </div>

        {/* Right Pane: Split-Screen Document Reader OR Focused Evidence Card */}
        {viewMode === 'reader' ? (
          <div
            className={`${
              splitRatio === '50-50'
                ? 'lg:col-span-6'
                : splitRatio === '60-40'
                  ? 'lg:col-span-5'
                  : 'lg:col-span-7'
            } h-full min-h-[660px]`}
          >
            <DocumentReader
              paper={paperData}
              chunks={paperChunks}
              activeCitation={selectedCitation}
              onCitationSelect={(c) => handleSelectCitation(c, false)}
              onAskPassage={handleAskPassage}
              citationsList={allCitations}
              isSplit={true}
              onToggleExpand={() => setIsReaderExpanded((prev) => !prev)}
              isExpanded={isReaderExpanded}
            />
          </div>
        ) : (
          /* Evidence Mode: Dark Panel SOURCE EVIDENCE */
          <div
            ref={rightPaneRef}
            className={`lg:col-span-5 bg-inverse-surface border border-outline-variant/20 rounded-2xl p-6 flex flex-col justify-between min-h-[660px] sticky top-24 text-surface transition-all duration-300 ${
              highlightPulse ? 'ring-2 ring-primary-container shadow-[0_0_24px_rgba(255,154,46,0.3)]' : ''
            }`}
          >
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container shadow-[0_0_8px_#FF9A2E]"></span>
                  <span className="font-nav-label text-xs text-surface font-bold tracking-wider">
                    SOURCE EVIDENCE
                  </span>
                </div>
                {selectedCitation && (
                  <span className="font-mono-counter text-[10px] text-primary-container bg-primary-container/10 border border-primary-container/30 px-2 py-0.5 rounded">
                    PAGE {selectedCitation.pageNumber || 1} · CHUNK #{selectedCitation.chunkIndex ?? 1}
                  </span>
                )}
              </div>

              {selectedCitation ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="font-mono-counter text-[10px] text-white/50 block">
                      MANUSCRIPT RECORD
                    </span>
                    <p className="font-display text-sm text-surface leading-tight font-semibold">
                      {selectedCitation.paperTitle || paperTitle}
                    </p>
                  </div>

                  {/* Highlighted verbatim excerpt */}
                  <div className="p-4 rounded-xl border border-primary-container/40 bg-primary-container/10 text-xs text-surface leading-relaxed relative space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-mono-counter text-primary-container pb-1 border-b border-primary-container/20">
                      <span>VERBATIM EXCERPT</span>
                      <span>LOCATION: PAGE {selectedCitation.pageNumber || 1}</span>
                    </div>

                    <div className="italic font-sans text-xs sm:text-[13px] leading-relaxed max-h-60 overflow-y-auto pr-1">
                      <MathRenderer
                        content={
                          selectedCitation.text ||
                          selectedCitation.snippet ||
                          selectedCitation.excerpt ||
                          'Verbatim text excerpt extracted from document vector store.'
                        }
                      />
                    </div>

                    <div className="pt-2 flex justify-between items-center text-[10px] font-mono-counter text-white/60">
                      <button
                        onClick={() => handleCopyExcerpt(selectedCitation.text || selectedCitation.snippet)}
                        className="hover:text-primary-container flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>📋</span>
                        <span>{copied ? 'COPIED!' : 'COPY EXCERPT'}</span>
                      </button>
                      {selectedCitation.score && (
                        <span>SIMILARITY: {(selectedCitation.score * 100).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>

                  {/* Switch to Split Reader Button */}
                  <button
                    onClick={() => setViewMode('reader')}
                    className="w-full py-2.5 px-4 bg-primary-container text-on-primary-fixed border border-primary-container rounded-xl font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all font-bold shadow-md hover:brightness-110"
                  >
                    <span>📖 VIEW IN SPLIT-SCREEN READER</span>
                    <span>→</span>
                  </button>

                  {/* Context Expansion Button */}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-mono text-xs flex items-center justify-center gap-2 cursor-pointer transition-all font-semibold"
                  >
                    <span>🔍 OPEN FULL SECTION MODAL</span>
                    <span>↗</span>
                  </button>

                  <div className="p-3 bg-black/30 rounded-lg border border-white/10 font-mono text-[10px] text-white/60 space-y-1">
                    <div className="flex justify-between">
                      <span>PAGE NUMBER:</span>
                      <span className="text-white font-bold">{selectedCitation.pageNumber || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VECTOR CHUNK:</span>
                      <span className="text-white font-bold">#{selectedCitation.chunkIndex ?? 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TOTAL LOADED CHUNKS:</span>
                      <span className="text-white font-bold">{paperChunks.length || 'Indexing'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-28 text-center space-y-4 text-white/50">
                  <div className="w-12 h-12 mx-auto rounded-full border border-white/20 flex items-center justify-center font-mono text-base text-primary-container">
                    §
                  </div>
                  <div>
                    <h4 className="font-nav-label text-xs text-surface font-bold">
                      CLICK ANY PAGE CITATION
                    </h4>
                    <p className="text-xs text-white/50 max-w-xs mx-auto mt-1 leading-relaxed">
                      Click any [Page X] or [p.X] citation badge in the answer to read the exact verbatim section from the paper, or toggle the Split Reader to see the whole document.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/15 flex justify-between items-center text-[10px] font-mono-counter text-white/50">
              <span>DETERMINISTIC GROUNDING</span>
              <span className="text-primary-container">ATLAS VECTOR KNN</span>
            </div>
          </div>
        )}
      </div>

      {/* 8. Full Verbatim Section Context Modal / Reader (Fallback) */}
      {isModalOpen && selectedCitation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-[#1E2021] text-[#F2F2F2] border border-white/20 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div>
              <div className="flex justify-between items-start pb-3 border-b border-white/10 font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF9A2E] animate-pulse"></span>
                  <span className="text-[#FF9A2E] font-bold tracking-widest uppercase">
                    VERBATIM MANUSCRIPT SECTION // GROUNDED EVIDENCE
                  </span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white/50 hover:text-white cursor-pointer px-2 py-0.5 border border-white/20 rounded text-xs font-mono"
                  title="Close (Esc)"
                >
                  ✕ CLOSE [ESC]
                </button>
              </div>

              {/* Title & Page Banner */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-white uppercase leading-tight">
                    {selectedCitation.paperTitle || paperTitle}
                  </h3>
                  <p className="font-mono text-xs text-[#888888] mt-0.5">
                    SECTION RETRIEVED VIA EMBEDDING VECTOR KNN
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 self-start sm:self-auto font-mono text-xs bg-[#FF9A2E]/20 text-[#FF9A2E] border border-[#FF9A2E]/50 px-3 py-1 rounded-full font-bold">
                  <span>📖 PAGE {selectedCitation.pageNumber || 1}</span>
                  <span>·</span>
                  <span>CHUNK #{selectedCitation.chunkIndex ?? 1}</span>
                </div>
              </div>
            </div>

            {/* Verbatim Section Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-5 rounded-xl border border-[#FF9A2E]/30 bg-black/40 text-sm leading-relaxed text-[#EDEDED] font-sans relative">
                <div className="font-mono text-[10px] text-[#FF9A2E] mb-2 uppercase tracking-wider flex justify-between">
                  <span>EXACT TEXT SEGMENT AS PRINTED IN DOCUMENT:</span>
                  {selectedCitation.score && (
                    <span>SIMILARITY {(selectedCitation.score * 100).toFixed(1)}%</span>
                  )}
                </div>

                <div className="leading-relaxed font-sans text-xs sm:text-sm text-[#F5F5F5] max-h-96 overflow-y-auto">
                  <MathRenderer
                    content={
                      selectedCitation.text ||
                      selectedCitation.snippet ||
                      selectedCitation.excerpt ||
                      'Verbatim text excerpt extracted from document vector store.'
                    }
                  />
                </div>
              </div>

              <p className="text-[11px] font-mono text-[#888888] leading-relaxed">
                Tip: This excerpt was deterministically extracted from Page {selectedCitation.pageNumber || 1} and verified by the embedding model.
              </p>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigateChunk(-1)}
                  disabled={paperChunks.length === 0}
                  className="px-3 py-1.5 border border-white/20 hover:border-white/50 disabled:opacity-40 rounded-lg text-xs font-mono text-white cursor-pointer transition-colors"
                  title="View preceding chunk in document"
                >
                  ← PREV CHUNK
                </button>
                <button
                  onClick={() => handleNavigateChunk(1)}
                  disabled={paperChunks.length === 0}
                  className="px-3 py-1.5 border border-white/20 hover:border-white/50 disabled:opacity-40 rounded-lg text-xs font-mono text-white cursor-pointer transition-colors"
                  title="View following chunk in document"
                >
                  NEXT CHUNK →
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyExcerpt(selectedCitation.text || selectedCitation.snippet)}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-mono text-[#FF9A2E] cursor-pointer transition-colors flex items-center gap-1.5 font-bold"
                >
                  <span>📋</span>
                  <span>{copied ? 'COPIED TO CLIPBOARD!' : 'COPY STATEMENT'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setViewMode('reader');
                  }}
                  className="btn-ignition !h-9 !px-4 !text-xs"
                >
                  VIEW IN SPLIT READER ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperChat;
