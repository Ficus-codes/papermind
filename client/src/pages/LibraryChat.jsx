import React, { useState, useEffect, useRef } from 'react';
import api from '../api/apiClient';
import MathRenderer from '../components/MathRenderer';

/**
 * LibraryChat (Page 8 — Ask My Library / Cross-Library Synthesis)
 *
 * Sophisticated, clean, and minimalistic academic synthesis interface.
 * - 3-Column Desktop Layout:
 *   1. Left rail (260px): Real saved chat sessions, "+ NEW CHAT", "CLEAR ALL", and model telemetry
 *   2. Center pane: Editorial conversation stream, markdown rendering, in-text citation pills,
 *      intelligent starter prompts, auto-expanding composer with Enter-to-send, and Markdown export
 *   3. Right panel: Dark architectural EVIDENTIARY SOURCES panel with verbatim chunk excerpts,
 *      similarity scores, citation copy, and direct "OPEN MANUSCRIPT ↗" navigation
 * - Complete element functionality:
 *   - "THIS PAPER" vs "MY LIBRARY" modal/selector to switch focus to any specific paper
 *   - Dynamic query scope selector (full corpus vs focused manuscript)
 *   - Persistent chat session history in localStorage
 *   - Single-click citation inspection that highlights verbatim excerpts in the right panel
 */
const LibraryChat = ({
  onSwitchToPaperChat,
  onOpenPaper,
  onAuthRequired,
  onGoToLibrary,
  showNotification,
}) => {
  // Conversational state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [activeCitation, setActiveCitation] = useState(null);
  const [allSources, setAllSources] = useState([]);
  const [expandedPaper, setExpandedPaper] = useState(null);

  // Library & scope state
  const [papers, setPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState('ALL');
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [paperModalFilter, setPaperModalFilter] = useState('');

  // Sessions state (persisted in localStorage)
  const [recentChats, setRecentChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [copiedCitationKey, setCopiedCitationKey] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [mobileTab, setMobileTab] = useState('chat'); // 'threads' | 'chat' | 'sources'

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const sourceRefs = useRef({});

  // 1. Load user's papers for scope filtering and modal
  useEffect(() => {
    let isMounted = true;
    const fetchPapers = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        setLoadingPapers(true);
        const res = await api.get('/api/papers');
        if (isMounted && Array.isArray(res.data)) {
          setPapers(res.data);
        }
      } catch (err) {
        console.error('Failed to load papers for chat scope:', err);
      } finally {
        if (isMounted) setLoadingPapers(false);
      }
    };

    fetchPapers();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load past sessions from localStorage
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user');
      const userId = rawUser ? JSON.parse(rawUser)?.id || 'default' : 'default';
      const stored = localStorage.getItem(`papermind_library_chats_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentChats(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read saved chats from localStorage:', e);
    }
  }, []);

  // 3. Load initial server chat history
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (onAuthRequired) onAuthRequired();
        return;
      }

      try {
        const response = await api.get('/api/chat/library');

        if (!isMounted) return;

        if (response.data.messages && response.data.messages.length > 0) {
          setMessages(response.data.messages);
          setSessionId(response.data.sessionId);

          // Extract all citations
          const sources = [];
          response.data.messages.forEach((m) => {
            if (m.citations && Array.isArray(m.citations)) {
              m.citations.forEach((c) => sources.push(c));
            }
          });
          setAllSources(sources);
          if (sources.length > 0) {
            setExpandedPaper(sources[0].paperTitle || 'Sources');
          }
        }
      } catch (err) {
        console.error('Failed to load library chat history:', err);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [onAuthRequired]);

  // 4. Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Save active session to localStorage helper
  const persistSession = (firstQuestion, newMessages, currentSessionId) => {
    try {
      const rawUser = localStorage.getItem('user');
      const userId = rawUser ? JSON.parse(rawUser)?.id || 'default' : 'default';
      const key = `papermind_library_chats_${userId}`;
      const chatId = currentSessionId || `session_${Date.now()}`;

      setRecentChats((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === chatId);
        const title = firstQuestion.length > 40 ? `${firstQuestion.slice(0, 40)}…` : firstQuestion;
        const entry = {
          id: chatId,
          title: title.toUpperCase(),
          date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          timestamp: Date.now(),
          messages: newMessages,
        };

        let updated;
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = entry;
        } else {
          updated = [entry, ...prev.slice(0, 19)]; // Keep up to 20 recent sessions
        }
        localStorage.setItem(key, JSON.stringify(updated));
        return updated;
      });
      setActiveChatId(chatId);
    } catch (err) {
      console.warn('Failed to persist session to localStorage:', err);
    }
  };

  // 5. Send message
  const handleSendMessage = async (textToSend) => {
    const trimmed = (textToSend || inputMessage).trim();
    if (!trimmed || loading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    const tempUser = {
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, tempUser];
    setMessages(nextMessages);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const payload = {
        message: trimmed,
        sessionId,
      };

      // Add paperId if specific paper is scoped
      if (selectedPaperId && selectedPaperId !== 'ALL') {
        payload.paperId = selectedPaperId;
      }

      const response = await api.post('/api/chat/library', payload);

      const assistantMsg = {
        role: 'assistant',
        content: response.data.assistantMessage,
        citations: response.data.citations || [],
        timestamp: Date.now(),
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);

      const resolvedSessionId = response.data.sessionId || sessionId;
      if (response.data.sessionId) setSessionId(response.data.sessionId);

      // Add new citations to sources list
      if (response.data.citations && response.data.citations.length > 0) {
        setAllSources((prev) => [...response.data.citations, ...prev]);
        setExpandedPaper(response.data.citations[0].paperTitle);
        setActiveCitation(response.data.citations[0]);
      }

      // Persist session locally
      persistSession(trimmed, finalMessages, resolvedSessionId);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to query library vector index.';
      if (showNotification) {
        showNotification('error', '[SYNTHESIS // ERROR]', errMsg);
      } else {
        alert(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle New Chat
  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setAllSources([]);
    setActiveCitation(null);
    setActiveChatId(null);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    if (showNotification) {
      showNotification('success', '[SESSION // READY]', 'Started fresh research synthesis thread.');
    }
  };

  // 7. Load a past session from left rail
  const handleSelectSession = (chat) => {
    setActiveChatId(chat.id);
    if (chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0) {
      setMessages(chat.messages);
      setSessionId(chat.id);

      const sources = [];
      chat.messages.forEach((m) => {
        if (m.citations && Array.isArray(m.citations)) {
          m.citations.forEach((c) => sources.push(c));
        }
      });
      setAllSources(sources);
      if (sources.length > 0) {
        setExpandedPaper(sources[0].paperTitle);
      }
    } else {
      // If no messages cached, populate query into input
      setInputMessage(chat.title);
      if (textareaRef.current) textareaRef.current.focus();
    }
  };

  // 8. Delete a single past session
  const handleDeleteSession = (e, chatId) => {
    e.stopPropagation();
    try {
      const rawUser = localStorage.getItem('user');
      const userId = rawUser ? JSON.parse(rawUser)?.id || 'default' : 'default';
      const key = `papermind_library_chats_${userId}`;

      const updated = recentChats.filter((c) => c.id !== chatId);
      setRecentChats(updated);
      localStorage.setItem(key, JSON.stringify(updated));

      if (activeChatId === chatId) {
        handleNewChat();
      }
    } catch (err) {
      console.warn('Failed to delete chat session:', err);
    }
  };

  // 9. Clear all chat history (server + local)
  const handleClearAllHistory = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.delete('/api/chat/library');
      } catch (err) {
        console.warn('Server clear failed, clearing local:', err);
      }
    }

    try {
      const rawUser = localStorage.getItem('user');
      const userId = rawUser ? JSON.parse(rawUser)?.id || 'default' : 'default';
      localStorage.removeItem(`papermind_library_chats_${userId}`);
    } catch (e) {
      // ignore
    }

    setRecentChats([]);
    handleNewChat();
    setShowClearConfirm(false);

    if (showNotification) {
      showNotification('success', '[PURGE // COMPLETE]', 'All cross-library chat history cleared.');
    }
  };

  // 10. Copy message text to clipboard
  const handleCopyMessage = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2500);
    if (showNotification) {
      showNotification('success', '[CLIPBOARD // COPIED]', 'Synthesis response copied to clipboard.');
    }
  };

  // 11. Copy single citation text
  const handleCopyCitation = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedCitationKey(key);
    setTimeout(() => setCopiedCitationKey(null), 2000);
  };

  // 12. Export full conversation as Markdown
  const handleExportChat = () => {
    if (messages.length === 0) return;

    let md = `# PAPERMIND — Cross-Library Literature Synthesis Briefing\n`;
    md += `*Generated: ${new Date().toLocaleString()}*\n\n---\n\n`;

    messages.forEach((m) => {
      if (m.role === 'user') {
        md += `### 🧑‍🔬 Research Inquiry\n> ${m.content}\n\n`;
      } else {
        md += `### 🤖 Synthesized Intelligence\n${m.content}\n\n`;
        if (m.citations && m.citations.length > 0) {
          md += `**Grounded Evidentiary Sources:**\n`;
          m.citations.forEach((c) => {
            md += `- **${c.paperTitle || 'Manuscript'}** (Page ${c.pageNumber || 1}, Chunk #${c.chunkIndex ?? 1})\n`;
            if (c.snippet || c.text) {
              md += `  > *"${(c.snippet || c.text).trim()}"*\n`;
            }
          });
          md += `\n`;
        }
      }
      md += `---\n\n`;
    });

    navigator.clipboard.writeText(md);
    if (showNotification) {
      showNotification('success', '[EXPORT // READY]', 'Complete synthesis briefing copied in Markdown format.');
    }
  };

  // 13. Handle in-text citation pill click
  const handleCitationClick = (pageNum, citations = []) => {
    const pNum = parseInt(pageNum, 10);
    let match = null;
    if (!isNaN(pNum) && citations.length > 0) {
      match = citations.find((c) => c.pageNumber === pNum) || citations[0];
    } else if (citations.length > 0) {
      match = citations[0];
    }

    if (match) {
      setActiveCitation(match);
      if (match.paperTitle) {
        setExpandedPaper(match.paperTitle);
      }
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setMobileTab('sources');
      }
      // Scroll source into view in right panel
      const refKey = `${match.paperTitle}_${match.pageNumber}_${match.chunkIndex}`;
      if (sourceRefs.current[refKey]) {
        sourceRefs.current[refKey].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  // Render assistant message with interactive KaTeX math and citation badges
  const renderMessageContent = (content, citations = []) => {
    if (!content) return null;
    return (
      <MathRenderer
        content={content}
        citations={citations}
        onCitationClick={(pageNum) => handleCitationClick(pageNum, citations)}
      />
    );
  };

  // Group sources by paper title (cap max 3 per paper for clarity)
  const groupedSources = allSources.reduce((acc, c) => {
    const key = c.paperTitle || 'Reference Paper';
    if (!acc[key]) acc[key] = [];
    if (acc[key].length < 3) acc[key].push(c);
    return acc;
  }, {});

  // Selected paper object if focused
  const focusedPaper = papers.find((p) => p._id === selectedPaperId);

  return (
    <div className="h-[calc(100dvh-64px-56px)] md:h-[calc(100vh-64px)] flex flex-col overflow-hidden max-w-[1600px] mx-auto px-2 sm:px-6 py-2 sm:py-4 font-sans text-on-surface">
      {/* 1. TOP HEADER & BREADCRUMB BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-outline-variant/30 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onGoToLibrary}
            className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="Return to Manuscript Library"
          >
            <span>← LIBRARY</span>
          </button>
          <span className="text-outline-variant/50">/</span>
          <div className="flex items-center gap-2">
            <span className="font-counter-mono text-counter-mono text-secondary">[SYNTHESIS ENGINE]</span>
            <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-on-surface uppercase">
              ASK MY LIBRARY
            </h1>
          </div>
          {papers.length > 0 && (
            <span className="hidden md:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-on-surface-variant">
              {papers.length} {papers.length === 1 ? 'MANUSCRIPT' : 'MANUSCRIPTS'} INDEXED
            </span>
          )}
        </div>

        {/* Right Action Controls: Segmented Mode Switcher + Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Mode Control */}
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-full border border-outline-variant/40">
            <button
              onClick={() => setSelectedPaperId('ALL')}
              className={`px-3 py-1 rounded-full font-label-nav text-[10px] transition-all cursor-pointer uppercase ${
                selectedPaperId === 'ALL'
                  ? 'bg-inverse-surface text-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              MY LIBRARY (ALL)
            </button>
            <button
              onClick={() => setIsPaperModalOpen(true)}
              className={`px-3 py-1 rounded-full font-label-nav text-[10px] transition-all cursor-pointer uppercase flex items-center gap-1 ${
                selectedPaperId !== 'ALL'
                  ? 'bg-inverse-surface text-surface font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>{focusedPaper ? `FOCUS: ${focusedPaper.title.slice(0, 16)}…` : 'FOCUS SINGLE PAPER'}</span>
              <span className="text-[10px]">▾</span>
            </button>
          </div>

          {/* Export Briefing Button */}
          {messages.length > 0 && (
            <button
              onClick={handleExportChat}
              className="btn-ghost !h-7 !px-3 !text-[10px] !font-mono cursor-pointer flex items-center gap-1 hover:border-primary-container"
              title="Copy entire conversation as formatted Markdown briefing"
            >
              <span>EXPORT [MD]</span>
              <span>📋</span>
            </button>
          )}

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="btn-primary !h-7 !px-3 !text-[10px] !font-mono cursor-pointer flex items-center gap-1"
            title="Start fresh conversation thread"
          >
            <span>+ NEW CHAT</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (< lg) */}
      <div className="flex lg:hidden items-center justify-between p-1 bg-surface-container-high rounded-full border border-outline-variant/40 mt-2 mb-1 shrink-0">
        <button
          onClick={() => setMobileTab('threads')}
          className={`flex-1 py-1.5 px-2 rounded-full font-counter-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center ${
            mobileTab === 'threads'
              ? 'bg-inverse-surface text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          THREADS ({recentChats.length})
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-1.5 px-2 rounded-full font-counter-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center ${
            mobileTab === 'chat'
              ? 'bg-inverse-surface text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          CHAT
        </button>
        <button
          onClick={() => setMobileTab('sources')}
          className={`flex-1 py-1.5 px-2 rounded-full font-counter-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer text-center ${
            mobileTab === 'sources'
              ? 'bg-inverse-surface text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          EVIDENCE ({allSources.length})
        </button>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 pb-1 overflow-hidden">
        
        {/* LEFT RAIL: SAVED SESSIONS & ARCHIVE (lg:col-span-3) */}
        <div className={`${mobileTab === 'threads' ? 'flex' : 'hidden'} lg:flex lg:col-span-3 h-full flex-col overflow-hidden bg-surface-container-low rounded-xl border border-outline-variant/30`}>
          {/* Header */}
          <div className="p-3.5 pb-2.5 border-b border-outline-variant/30 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-counter-mono text-[10px] text-secondary uppercase font-semibold">
                [01] // THREADS
              </span>
              <span className="text-[10px] font-mono text-secondary">
                ({recentChats.length})
              </span>
            </div>
            <button
              onClick={handleNewChat}
              className="text-[10px] font-mono font-bold text-primary hover:underline cursor-pointer"
            >
              + NEW
            </button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-outline-variant/10">
            {recentChats.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2 text-on-surface-variant">
                <span className="text-xl opacity-60">💬</span>
                <p className="font-counter-mono text-[10px] uppercase font-semibold">
                  NO SAVED SESSIONS
                </p>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                  Your research threads and cross-library queries will appear here automatically.
                </p>
              </div>
            ) : (
              recentChats.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectSession(chat)}
                    className={`p-2.5 rounded-lg transition-all cursor-pointer group flex items-start justify-between gap-2 text-left ${
                      isActive
                        ? 'bg-surface border border-outline-variant/50 shadow-xs'
                        : 'hover:bg-surface-container/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p
                        className={`text-xs font-medium truncate ${
                          isActive ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'
                        }`}
                      >
                        {chat.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant/70">
                        <span>{chat.date}</span>
                        {chat.messages && <span>· {chat.messages.length} msgs</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error text-xs p-1 transition-opacity cursor-pointer"
                      title="Delete thread"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Controls: Telemetry + Clear All */}
          <div className="p-3 border-t border-outline-variant/30 space-y-2 shrink-0 bg-surface-container-low/50">
            <div className="flex justify-between items-center text-[10px] font-mono text-secondary">
              <span>1536-DIM CROSS-RAG</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            {recentChats.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full text-center text-[10px] font-mono text-on-surface-variant/60 hover:text-error hover:underline cursor-pointer pt-1"
              >
                CLEAR ALL HISTORY
              </button>
            )}
          </div>
        </div>

        {/* CENTER PANE: CONVERSATION STREAM (lg:col-span-5) */}
        <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex lg:col-span-5 h-full flex-col overflow-hidden bg-surface rounded-xl border border-outline-variant/30 shadow-xs`}>
          
          {/* Scope indicator strip */}
          <div className="px-4 py-2 border-b border-outline-variant/20 flex justify-between items-center text-xs font-mono shrink-0 bg-surface-container-lowest">
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <span className="text-secondary uppercase">SCOPE:</span>
              <span className="font-semibold text-on-surface">
                {selectedPaperId === 'ALL'
                  ? 'FULL REPOSITORY (ALL PAPERS)'
                  : focusedPaper
                  ? `[FOCUS] ${focusedPaper.title.slice(0, 28)}…`
                  : 'FOCUSED PAPER'}
              </span>
            </div>

            {selectedPaperId !== 'ALL' && (
              <button
                onClick={() => setSelectedPaperId('ALL')}
                className="text-[10px] text-primary hover:underline cursor-pointer"
                title="Reset to search across full library"
              >
                RESET TO ALL ⟲
              </button>
            )}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {messages.length === 0 ? (
              /* Editorial Empty State with Starter Inquiries */
              <div className="py-10 text-center space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 mx-auto rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-xl shadow-xs">
                  📖
                </div>
                <div className="space-y-1">
                  <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-on-surface uppercase">
                    SYNTHESIZE ACROSS LITERATURE
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Formulate comparative research questions spanning multiple manuscripts. Every conclusion is rigorously page-grounded.
                  </p>
                </div>

                {/* Starter Prompts */}
                <div className="pt-3 space-y-2 text-left">
                  <p className="font-counter-mono text-[10px] text-secondary text-center uppercase tracking-wider">
                    RECOMMENDED RESEARCH QUERIES:
                  </p>
                  {[
                    'Synthesize the primary methodology and experimental setups',
                    'Compare the key architectural differences and trade-offs',
                    'What are the common limitations and future work discussed?',
                    'Extract empirical benchmark results and performance metrics',
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full p-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 hover:border-primary-container text-xs text-on-surface transition-all cursor-pointer text-left flex items-center justify-between group shadow-2xs"
                    >
                      <span className="truncate pr-2 font-medium">{prompt}</span>
                      <span className="text-secondary group-hover:text-primary transition-colors text-[11px] shrink-0 font-mono">
                        ASK →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Stream */
              messages.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  {msg.role === 'user' ? (
                    /* User Inquiry Bubble */
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-surface-container-high border border-outline-variant/50 rounded-2xl px-4 py-2.5 text-xs text-on-surface leading-relaxed shadow-2xs">
                        <div className="flex justify-between items-center pb-1 gap-4 font-mono text-[9px] text-on-surface-variant/70 border-b border-outline-variant/20 mb-1">
                          <span className="font-bold uppercase">RESEARCHER INQUIRY</span>
                          <span>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap"><MathRenderer content={msg.content} /></div>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Synthesized Response */
                    <div className="pt-3 border-t border-outline-variant/20 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-secondary pb-1">
                        <span className="flex items-center gap-1.5 font-bold text-primary">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                          PAPERMIND SYNTHESIS ENGINE
                        </span>
                        <span>
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {/* Content with Markdown & Page Citations */}
                      <div className="text-xs sm:text-[13px] text-on-surface leading-relaxed whitespace-pre-wrap font-sans selection:bg-primary-container selection:text-on-surface">
                        {renderMessageContent(msg.content, msg.citations)}
                      </div>

                      {/* Citation Pills Cluster */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                          <span className="font-counter-mono text-[9px] text-secondary uppercase pr-1">
                            GROUNDED SOURCES:
                          </span>
                          {msg.citations.map((c, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleCitationClick(c.pageNumber, msg.citations)}
                              className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-surface-container border border-outline-variant/40 hover:border-primary-container hover:bg-surface-container-high transition-colors cursor-pointer text-on-surface flex items-center gap-1"
                              title={`Inspect Page ${c.pageNumber} chunk`}
                            >
                              <span className="text-[#FF9A2E]">📄</span>
                              <span>{c.paperTitle ? c.paperTitle.slice(0, 15) : 'Paper'}</span>
                              <span className="text-primary font-bold">· p.{c.pageNumber || 1}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action Bar Below Assistant Response */}
                      <div className="pt-2 flex items-center justify-between text-[10px] font-mono border-t border-outline-variant/15">
                        <button
                          onClick={() => handleCopyMessage(msg.content, idx)}
                          className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer flex items-center gap-1 py-1"
                          title="Copy synthesis response"
                        >
                          <span>{copiedMessageIndex === idx ? 'COPIED ✓' : 'COPY RESPONSE'}</span>
                          <span>📋</span>
                        </button>

                        {msg.citations && (
                          <span className="text-secondary">
                            {msg.citations.length} {msg.citations.length === 1 ? 'EVIDENTIARY CITATION' : 'EVIDENTIARY CITATIONS'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Synthesizing Loading State */}
            {loading && (
              <div className="pt-4 border-t border-outline-variant/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-primary">
                  <div className="w-2 h-2 rounded-full bg-primary-container animate-ping"></div>
                  <span className="font-counter-mono text-[10px] tracking-wide uppercase font-semibold">
                    RETRIEVING 1536-DIM VECTOR CHUNKS & SYNTHESIZING...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Composer */}
          <div className="p-3 border-t border-outline-variant/30 bg-surface-container-lowest shrink-0 space-y-1.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask your library (e.g., 'Compare attention mechanisms vs state-space models')..."
                disabled={loading}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl pl-4 pr-12 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary-container resize-none leading-relaxed"
              />

              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-inverse-surface text-surface flex items-center justify-center hover:bg-primary-container hover:text-inverse-on-surface transition-all disabled:opacity-30 cursor-pointer shadow-xs font-bold"
                title="Send query (Enter)"
              >
                ↑
              </button>
            </form>

            <div className="flex justify-between items-center text-[10px] font-mono text-secondary px-1">
              <span>ENTER ↵ TO SYNTHESIZE · SHIFT+ENTER FOR NEWLINE</span>
              <span>1536-DIM ATLAS RAG</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: EVIDENTIARY SOURCES (lg:col-span-4) */}
        <div className={`${mobileTab === 'sources' ? 'flex' : 'hidden'} lg:flex lg:col-span-4 h-full flex-col overflow-hidden bg-[#181919] border border-white/10 rounded-xl text-[#e3e2e2] shadow-sm`}>
          {/* Header */}
          <div className="p-3.5 pb-2.5 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-1.5 font-counter-mono text-[10px] text-white/60 uppercase font-semibold">
              <span>[02] // EVIDENCE</span>
              <span className="text-[#FF9A2E]">({allSources.length})</span>
            </div>
            <span className="font-counter-mono text-[9px] text-white/40">
              MAX 3 CHUNKS / PAPER
            </span>
          </div>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {Object.keys(groupedSources).length === 0 ? (
              <div className="py-20 text-center space-y-3 text-white/40 px-4">
                <div className="w-10 h-10 mx-auto rounded-full border border-white/20 flex items-center justify-center font-mono text-xs text-white/60">
                  0
                </div>
                <p className="font-counter-mono text-[10px] uppercase font-semibold text-white/60">
                  NO EVIDENCE RETRIEVED YET
                </p>
                <p className="text-xs max-w-xs mx-auto leading-relaxed text-white/40">
                  Execute a query to inspect the exact multi-manuscript vector segments retrieved and cited.
                </p>
              </div>
            ) : (
              Object.entries(groupedSources).map(([title, chunks]) => {
                const isExpanded = expandedPaper === title;
                const sampleChunk = chunks[0];
                return (
                  <div
                    key={title}
                    className="border border-white/10 rounded-xl overflow-hidden bg-white/5 transition-all"
                  >
                    {/* Paper Title Header Card */}
                    <div className="p-3 flex items-start justify-between gap-2 border-b border-white/5">
                      <div
                        onClick={() => setExpandedPaper(isExpanded ? null : title)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <h4 className="font-sans font-semibold text-xs text-white truncate hover:text-[#FF9A2E] transition-colors">
                          {title}
                        </h4>
                        <span className="font-counter-mono text-[10px] text-[#FF9A2E]">
                          {chunks.length} {chunks.length === 1 ? 'CHUNK' : 'CHUNKS'} CITED {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {/* Direct Link to Open Paper in Repository */}
                      {sampleChunk?.paperId && (
                        <button
                          onClick={() => onOpenPaper && onOpenPaper(sampleChunk.paperId)}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] transition-all cursor-pointer shrink-0 uppercase tracking-wider flex items-center gap-1"
                          title="Open full paper in repository view"
                        >
                          <span>OPEN</span>
                          <span>↗</span>
                        </button>
                      )}
                    </div>

                    {/* Collapsible Chunk Excerpts */}
                    {isExpanded && (
                      <div className="p-3 space-y-2.5">
                        {chunks.map((c, cIdx) => {
                          const isActive = activeCitation === c;
                          const refKey = `${c.paperTitle}_${c.pageNumber}_${c.chunkIndex}`;
                          const copyKey = `${title}_${cIdx}`;
                          return (
                            <div
                              key={cIdx}
                              ref={(el) => {
                                sourceRefs.current[refKey] = el;
                              }}
                              className={`p-2.5 rounded-lg border text-xs leading-relaxed transition-all ${
                                isActive
                                  ? 'border-[#FF9A2E] bg-[#FF9A2E]/15 shadow-[0_0_12px_rgba(255,154,46,0.25)]'
                                  : 'border-white/10 bg-white/5'
                              }`}
                            >
                              <div className="flex justify-between items-center pb-1 text-[10px] font-mono text-[#FF9A2E]">
                                <span className="font-bold">
                                  PAGE {c.pageNumber || 1} · CHUNK {c.chunkIndex ?? cIdx + 1}
                                </span>
                                {c.score && (
                                  <span className="text-white/60">
                                    {(c.score * 100).toFixed(0)}% MATCH
                                  </span>
                                )}
                              </div>

                              <div className="italic text-[11px] text-white/80 leading-snug py-1">
                                <MathRenderer content={c.text || c.snippet || 'Verbatim excerpt extracted from document vector store.'} />
                              </div>

                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => handleCopyCitation(c.text || c.snippet, copyKey)}
                                  className="text-[9px] font-mono text-white/50 hover:text-white transition-colors cursor-pointer"
                                >
                                  {copiedCitationKey === copyKey ? 'COPIED ✓' : 'COPY EXCERPT'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Telemetry Strip */}
          <div className="p-3 border-t border-white/10 flex justify-between items-center text-[10px] font-mono text-white/40 shrink-0">
            <span>GROUNDED BY 1536-DIM VECTORS</span>
            <span className="text-[#FF9A2E] font-semibold">100% DETERMINISTIC</span>
          </div>
        </div>
      </div>

      {/* 3. MODAL: FOCUS ON SPECIFIC PAPER SELECTOR */}
      {isPaperModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2B2B2B] text-white max-w-lg w-full rounded-2xl border border-white/20 p-6 shadow-2xl space-y-4 animate-fade-in font-sans">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="font-counter-mono text-[10px] text-[#FF9A2E] uppercase font-bold tracking-wider">
                  [QUERY SCOPE // FOCUS]
                </span>
                <h3 className="font-display text-lg font-bold text-white uppercase">
                  Select Manuscript To Focus
                </h3>
              </div>
              <button
                onClick={() => setIsPaperModalOpen(false)}
                className="text-white/60 hover:text-white text-lg cursor-pointer p-1"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Focus your queries on a specific paper in your library, or open its dedicated Single-Paper Chat.
            </p>

            {/* Filter Input */}
            <input
              type="text"
              placeholder="Search manuscripts by title or author…"
              value={paperModalFilter}
              onChange={(e) => setPaperModalFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF9A2E]"
            />

            {/* Papers List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              <button
                onClick={() => {
                  setSelectedPaperId('ALL');
                  setIsPaperModalOpen(false);
                }}
                className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer flex justify-between items-center ${
                  selectedPaperId === 'ALL'
                    ? 'bg-[#FF9A2E]/20 border-[#FF9A2E] text-white font-bold'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                }`}
              >
                <span>🌐 ALL PAPERS (CROSS-LIBRARY CORPUS)</span>
                {selectedPaperId === 'ALL' && <span className="text-[#FF9A2E]">✓</span>}
              </button>

              {papers
                .filter(
                  (p) =>
                    !paperModalFilter ||
                    p.title?.toLowerCase().includes(paperModalFilter.toLowerCase()) ||
                    (Array.isArray(p.authors) && p.authors.some((a) => a.toLowerCase().includes(paperModalFilter.toLowerCase())))
                )
                .map((p) => {
                  const isSelected = selectedPaperId === p._id;
                  return (
                    <div
                      key={p._id}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#FF9A2E]/20 border-[#FF9A2E] text-white font-bold'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/80'
                      }`}
                    >
                      <div
                        onClick={() => {
                          setSelectedPaperId(p._id);
                          setIsPaperModalOpen(false);
                        }}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <p className="truncate font-semibold text-white">{p.title}</p>
                        <p className="text-[10px] text-white/50 truncate">
                          {Array.isArray(p.authors) ? p.authors.join(', ') : p.authors || 'Unknown'}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setIsPaperModalOpen(false);
                          if (onSwitchToPaperChat) onSwitchToPaperChat(p._id);
                        }}
                        className="px-2 py-1 rounded bg-[#FF9A2E] hover:bg-[#FFAE52] text-[#111111] font-mono text-[9px] font-bold cursor-pointer shrink-0 uppercase"
                        title="Switch to dedicated Ask This Paper screen"
                      >
                        OPEN CHAT ↗
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setIsPaperModalOpen(false)}
                className="btn-ghost !border-white/20 !text-white hover:!bg-white/10 !h-8 !text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: CONFIRM CLEAR ALL HISTORY */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2B2B2B] text-white max-w-sm w-full rounded-2xl border border-white/20 p-6 shadow-2xl space-y-4 animate-fade-in font-sans">
            <span className="font-counter-mono text-[10px] text-error uppercase font-bold tracking-wider">
              [PURGE // IRREVERSIBLE]
            </span>
            <h3 className="font-display text-lg font-bold text-white">
              Clear All Chat History?
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              This will wipe all cross-library synthesis threads, messages, and saved sessions from both the server and local storage.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-ghost !border-white/20 !text-white hover:!bg-white/10 !h-8 !text-xs cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleClearAllHistory}
                className="btn-primary !bg-[#BA1A1A] !text-white hover:!bg-[#991515] !h-8 !text-xs cursor-pointer font-bold"
              >
                PURGE ALL HISTORY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryChat;
