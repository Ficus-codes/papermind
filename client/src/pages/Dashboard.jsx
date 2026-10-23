import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/apiClient';
import DegreesOfFreedomVisualizer from '../components/DegreesOfFreedomVisualizer';

/**
 * SCREEN: "Papermind — User Personalized Research Homepage"
 * - Welcome banner with personalized researcher telemetry
 * - Direct navigation portals to any section (Library, Chat, Graph, Upload, Settings)
 * - Real-time metrics quadrant (Manuscripts, Embeddings, Inquiries, Notes)
 * - User Activity Stream (Timeline of uploads, chat inquiries, and annotations)
 * - Quick-access stream of recent manuscripts with one-click actions
 */
const Dashboard = ({
  currentUser,
  onGoToLibrary,
  onGoToChat,
  onGoToGraph,
  onGoToUpload,
  onGoToSettings,
  onOpenPaper,
  onAskPaper,
  onAuthRequired,
  showNotification,
}) => {
  const [papers, setPapers] = useState([]);
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('ALL'); // 'ALL' | 'UPLOAD' | 'QUERY' | 'NOTE'

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (onAuthRequired) onAuthRequired();
        return;
      }

      setLoading(true);
      try {
        // Fetch papers
        const papersPromise = api.get('/api/papers');

        // Fetch user activity & telemetry
        const activityPromise = api.get('/api/auth/activity').catch(() => ({ data: null }));

        const [papersRes, activityRes] = await Promise.all([papersPromise, activityPromise]);
        setPapers(papersRes.data || []);
        if (activityRes?.data) {
          setActivityData(activityRes.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [onAuthRequired]);

  // Derived metrics
  const readyPapers = useMemo(() => papers.filter((p) => p.status === 'ready'), [papers]);
  const totalChunks = useMemo(() => {
    if (activityData?.stats?.totalVectors) return activityData.stats.totalVectors;
    return papers.reduce((sum, p) => sum + (p.chunkCount || 0), 0);
  }, [papers, activityData]);

  const researcherName = useMemo(() => {
    if (currentUser?.name) {
      const name = currentUser.name.toUpperCase();
      return name.startsWith('DR.') ? name : `DR. ${name}`;
    }
    return 'DR. ELEANOR VANCE';
  }, [currentUser]);

  const padNum = (n) => String(n).padStart(3, '0');

  // Filtered activity timeline
  const filteredTimeline = useMemo(() => {
    const list = activityData?.activityTimeline || [];
    if (activityFilter === 'ALL') return list;
    return list.filter((item) => item.type === activityFilter);
  }, [activityData, activityFilter]);

  // Fallback activity if timeline is still empty
  const hasActivity = filteredTimeline.length > 0;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-10 animate-fade-in font-sans space-y-8 sm:space-y-12">
      {/* 1. Header Row: Welcome & Personalized Telemetry */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6 pb-6 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] text-on-surface-variant uppercase">
            <span className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_#ff9a2e]"></span>
            <span className="truncate max-w-[280px] sm:max-w-none">RESEARCH NODE ONLINE // {currentUser?.email || 'e.vance@oxford.ac.uk'}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl text-on-surface leading-[0.95] sm:leading-[0.92] tracking-tight break-words">
            WELCOME BACK, <br className="hidden sm:inline" />
            <span className="text-primary-container">{researcherName}</span>
          </h1>
          <p className="font-mono text-[11px] sm:text-xs text-on-surface-variant mt-2 sm:mt-3 leading-relaxed">
            ZURICH ARCHIVE CLUSTER · ZERO-LEAKAGE LOCAL VECTOR STORE · {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Global Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 lg:pt-0">
          <button
            onClick={onGoToUpload}
            className="btn-primary !h-9 sm:!h-10 !px-4 sm:!px-5 !text-[10px] sm:!text-[11px] shadow-sm cursor-pointer"
          >
            + UPLOAD MANUSCRIPT
          </button>
          <button
            onClick={onGoToLibrary}
            className="btn-ghost !h-9 sm:!h-10 !px-4 sm:!px-5 !text-[10px] sm:!text-[11px] border border-outline-variant/50 cursor-pointer"
          >
            OPEN LIBRARY ↗
          </button>
          <button
            onClick={onGoToChat}
            className="btn-ignition !h-9 sm:!h-10 !px-4 sm:!px-5 !text-[10px] sm:!text-[11px] cursor-pointer"
          >
            SYNTHESIZE CORPUS ↗
          </button>
        </div>
      </div>

      {/* 1.5 Theoretical Dynamics: Degrees of Freedom Laboratory (Physics Mode P & Chemistry Mode C) */}
      <DegreesOfFreedomVisualizer />

      {/* 2. Personalized Metrics Quadrant */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={onGoToLibrary}
          className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 space-y-2 hover:border-primary-container/60 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-on-surface-variant tracking-wider uppercase">
              INDEXED MANUSCRIPTS [01]
            </span>
            <span className="font-mono text-[10px] text-primary-container group-hover:translate-x-0.5 transition-transform">
              EXPLORE →
            </span>
          </div>
          <div className="font-display text-4xl font-bold text-on-surface group-hover:text-primary-container transition-colors">
            {padNum(papers.length)}
          </div>
          <p className="font-mono text-[10px] text-on-surface-variant">
            {padNum(readyPapers.length)} READY · {padNum(papers.length - readyPapers.length)} PENDING
          </p>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 space-y-2">
          <span className="font-mono text-[10px] text-on-surface-variant tracking-wider uppercase block">
            VECTOR EMBEDDINGS [02]
          </span>
          <div className="font-display text-4xl font-bold text-on-surface">
            {totalChunks > 0 ? totalChunks.toLocaleString() : '—'}
          </div>
          <p className="font-mono text-[10px] text-on-surface-variant">
            1536-DIM SEGMENTS · DETERMINISTIC GROUNDING
          </p>
        </div>

        <div
          onClick={onGoToChat}
          className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 space-y-2 hover:border-primary-container/60 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-on-surface-variant tracking-wider uppercase">
              RESEARCH INQUIRIES [03]
            </span>
            <span className="font-mono text-[10px] text-primary-container group-hover:translate-x-0.5 transition-transform">
              ASK →
            </span>
          </div>
          <div className="font-display text-4xl font-bold text-on-surface group-hover:text-primary-container transition-colors">
            {activityData?.stats?.totalQuestions ?? 0}
          </div>
          <p className="font-mono text-[10px] text-on-surface-variant">
            {activityData?.stats?.totalSessions ?? 0} DIALOGUE SESSIONS COMPLETED
          </p>
        </div>

        <div className="bg-inverse-surface text-surface border border-outline-variant/20 rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase">
              FIELD ANNOTATIONS [04]
            </span>
            <span className="font-mono text-[10px] text-primary-container">
              ACTIVE
            </span>
          </div>
          <div className="font-display text-4xl font-bold text-primary-container">
            {activityData?.stats?.totalNotes ?? 0}
          </div>
          <p className="font-mono text-[10px] text-white/60">
            RESEARCH FIELD NOTES RECORDED
          </p>
        </div>
      </div>

      {/* 3. Direct Portals Hub ("From there user can go to any page he wants") */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/25">
          <span className="font-mono text-[10px] tracking-[0.2em] text-on-surface-variant uppercase font-bold">
            PORTAL MATRIX // CENTRAL DISPATCH
          </span>
          <span className="font-mono text-[10px] text-on-surface-variant">
            DIRECT NAVIGATION HUBS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Portal 1: LIBRARY */}
          <div
            onClick={onGoToLibrary}
            className="group p-6 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col justify-between hover:bg-surface-container hover:border-primary-container/70 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-primary-container font-bold tracking-widest uppercase">
                  [01] CORPUS
                </span>
                <span className="text-xs text-on-surface-variant group-hover:text-primary-container transition-colors">
                  ↗
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-on-surface group-hover:text-primary-container transition-colors">
                YOUR LIBRARY
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Browse, search metadata, read 3-pillar analytical briefings, and manage citations across your personal corpus.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-outline-variant/20 flex items-center justify-between font-mono text-[11px] text-primary-container font-semibold">
              <span>{papers.length} MANUSCRIPTS</span>
              <span className="group-hover:translate-x-1 transition-transform">OPEN LIBRARY →</span>
            </div>
          </div>

          {/* Portal 2: CHAT */}
          <div
            onClick={onGoToChat}
            className="group p-6 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col justify-between hover:bg-surface-container hover:border-primary-container/70 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-primary-container font-bold tracking-widest uppercase">
                  [02] SYNTHESIS
                </span>
                <span className="text-xs text-on-surface-variant group-hover:text-primary-container transition-colors">
                  ↗
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-on-surface group-hover:text-primary-container transition-colors">
                ASK THE CORPUS
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Conduct conversational RAG queries with verifiable page citations across multiple manuscripts simultaneously.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-outline-variant/20 flex items-center justify-between font-mono text-[11px] text-primary-container font-semibold">
              <span>CROSS-CORPUS RAG</span>
              <span className="group-hover:translate-x-1 transition-transform">START CHAT →</span>
            </div>
          </div>

          {/* Portal 3: GRAPH */}
          <div
            onClick={onGoToGraph}
            className="group p-6 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex flex-col justify-between hover:bg-surface-container hover:border-primary-container/70 hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-primary-container font-bold tracking-widest uppercase">
                  [03] TOPOLOGY
                </span>
                <span className="text-xs text-on-surface-variant group-hover:text-primary-container transition-colors">
                  ↗
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-on-surface group-hover:text-primary-container transition-colors">
                CITATION GRAPH
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Explore interactive network nodes, semantic clusters, and citation dependencies with smooth force-directed physics.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-outline-variant/20 flex items-center justify-between font-mono text-[11px] text-primary-container font-semibold">
              <span>RELATIONAL MATRIX</span>
              <span className="group-hover:translate-x-1 transition-transform">VIEW GRAPH →</span>
            </div>
          </div>

          {/* Portal 4: UPLOAD */}
          <div
            onClick={onGoToUpload}
            className="group p-6 bg-inverse-surface border border-outline-variant/20 rounded-2xl flex flex-col justify-between hover:shadow-xl transition-all duration-200 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-primary-container font-bold tracking-widest uppercase">
                  [04] INGESTION
                </span>
                <span className="text-xs text-white/50 group-hover:text-primary-container transition-colors">
                  +
                </span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white group-hover:text-primary-container transition-colors">
                UPLOAD PAPER
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Ingest new PDF manuscripts into your personal vector repository with automated metadata and section parsing.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-primary-container font-semibold">
              <span>PDF UP TO 25MB</span>
              <span className="group-hover:translate-x-1 transition-transform">+ UPLOAD →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Layout: User Activity Stream (Left) & Recent Manuscripts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (lg:col-span-7): USER ACTIVITY STREAM */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
            <div>
              <span className="font-mono text-[10px] tracking-widest text-primary-container uppercase font-bold block">
                AUDIT TELEMETRY
              </span>
              <h2 className="font-display text-2xl text-on-surface">
                YOUR RESEARCH ACTIVITY
              </h2>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              {['ALL', 'UPLOAD', 'QUERY', 'NOTE'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActivityFilter(filter)}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    activityFilter === filter
                      ? 'bg-on-surface text-surface font-bold'
                      : 'text-on-surface-variant hover:text-on-surface border border-outline-variant/40'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center font-mono text-xs text-on-surface-variant bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
              <div className="w-5 h-5 mx-auto border border-primary-container border-t-transparent rounded-full animate-spin"></div>
              <span>STREAMING ACTIVITY AUDIT…</span>
            </div>
          ) : !hasActivity ? (
            <div className="p-8 text-center bg-surface-container-low border border-outline-variant/30 rounded-2xl space-y-4">
              <div className="font-mono text-xs text-on-surface-variant">
                NO ACTIVITY LOGGED UNDER CURRENT FILTER.
              </div>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Ingest your first manuscript or open a chat dialogue to generate cryptographic activity telemetry.
              </p>
              <button
                onClick={onGoToUpload}
                className="btn-primary !h-8 !px-4 !text-[10px] cursor-pointer"
              >
                + INGEST MANUSCRIPT
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTimeline.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-surface-container-low border border-outline-variant/30 rounded-xl hover:bg-surface-container hover:border-outline-variant/60 transition-all flex items-start gap-4"
                >
                  {/* Badge Marker */}
                  <div className="shrink-0 mt-0.5">
                    {item.type === 'UPLOAD' && (
                      <span className="font-mono text-[9px] bg-primary-container/15 text-primary-container border border-primary-container/40 px-2 py-0.5 rounded">
                        INGEST
                      </span>
                    )}
                    {item.type === 'QUERY' && (
                      <span className="font-mono text-[9px] bg-surface-container-highest text-on-surface border border-outline-variant/50 px-2 py-0.5 rounded">
                        QUERY
                      </span>
                    )}
                    {item.type === 'NOTE' && (
                      <span className="font-mono text-[9px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded">
                        NOTE
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <h4 className="font-sans text-sm font-semibold text-on-surface leading-snug truncate">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="font-sans text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <span className="font-mono text-[10px] text-on-surface-variant block pt-0.5">
                      {new Date(item.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Navigation Action */}
                  <div className="shrink-0 self-center">
                    {item.type === 'UPLOAD' && item.targetId && (
                      <button
                        onClick={() => onOpenPaper(item.targetId, 'summary')}
                        className="btn-ghost !h-7 !px-3 !text-[10px] cursor-pointer"
                      >
                        READ ↗
                      </button>
                    )}
                    {item.type === 'QUERY' && (
                      <button
                        onClick={() => {
                          if (item.targetId) {
                            onAskPaper(item.targetId);
                          } else {
                            onGoToChat();
                          }
                        }}
                        className="btn-ghost !h-7 !px-3 !text-[10px] cursor-pointer"
                      >
                        CHAT ↗
                      </button>
                    )}
                    {item.type === 'NOTE' && item.targetId && (
                      <button
                        onClick={() => onOpenPaper(item.targetId, 'notes')}
                        className="btn-ghost !h-7 !px-3 !text-[10px] cursor-pointer"
                      >
                        NOTE ↗
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-5): RECENT MANUSCRIPTS */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <div>
              <span className="font-mono text-[10px] tracking-widest text-on-surface-variant uppercase font-bold block">
                CORPUS RECENTIA
              </span>
              <h2 className="font-display text-2xl text-on-surface">
                ACTIVE MANUSCRIPTS
              </h2>
            </div>
            <button
              onClick={onGoToLibrary}
              className="font-mono text-[10px] text-primary-container hover:underline cursor-pointer"
            >
              VIEW ALL ({papers.length}) →
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center font-mono text-xs text-on-surface-variant bg-surface-container-low rounded-2xl border border-outline-variant/30">
              SCANNING REPOSITORY MATRIX…
            </div>
          ) : papers.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-low border border-outline-variant/30 rounded-2xl space-y-3 font-mono text-xs text-on-surface-variant">
              <span>CORPUS VACANT.</span>
              <p className="text-xs font-sans text-on-surface-variant">
                Upload your first academic manuscript to initiate vector search.
              </p>
              <button
                onClick={onGoToUpload}
                className="btn-primary !h-8 !px-4 !text-[10px] cursor-pointer"
              >
                + UPLOAD PDF
              </button>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/20 bg-surface-container-low border border-outline-variant/30 rounded-2xl p-2">
              {papers.slice(0, 5).map((paper, idx) => (
                <div
                  key={paper._id}
                  className="p-3.5 hover:bg-surface-container rounded-xl transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>MANUSCRIPT // 0{idx + 1}</span>
                    <span className="flex items-center gap-1.5 text-primary-container font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                      {paper.status?.toUpperCase() || 'READY'}
                    </span>
                  </div>

                  <h3
                    onClick={() => onOpenPaper(paper._id, 'summary')}
                    className="font-display text-base font-bold text-on-surface group-hover:text-primary-container cursor-pointer transition-colors line-clamp-2 leading-snug"
                  >
                    {paper.title || 'Untitled Manuscript'}
                  </h3>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-on-surface-variant truncate max-w-[180px]">
                      {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors || 'Unknown'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenPaper(paper._id, 'summary')}
                        className="btn-ghost !h-6 !px-2.5 !text-[9px] cursor-pointer"
                      >
                        SUMMARY
                      </button>
                      <button
                        onClick={() => onAskPaper(paper._id)}
                        className="font-mono text-[10px] font-bold text-on-surface hover:text-primary-container cursor-pointer"
                      >
                        ASK →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
