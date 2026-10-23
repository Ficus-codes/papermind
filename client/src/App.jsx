import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PaperList from './pages/PaperList';
import UploadPaper from './pages/UploadPaper';
import PaperDetail from './pages/PaperDetail';
import LibraryChat from './pages/LibraryChat';
import Settings from './pages/Settings';
import CitationGraph from './pages/CitationGraph';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import PapermindLogo from './components/PapermindLogo';
import AppFooter from './components/AppFooter';
import './App.css';

/**
 * Route helpers for native Browser History synchronization:
 * Maps internal views to clean URL paths and parses current browser URL on popstate / load.
 */
const getPathForView = (v, paperId = null, tab = 'summary') => {
  switch (v) {
    case 'landing':
      return '/';
    case 'home':
      return '/home';
    case 'library':
      return '/library';
    case 'chat':
      return '/chat';
    case 'graph':
      return '/graph';
    case 'settings':
      return '/settings';
    case 'upload':
      return '/upload';
    case 'login':
      return '/login';
    case 'register':
      return '/register';
    case 'forgot-password':
      return '/forgot-password';
    case 'paperDetail':
      return paperId ? `/paper/${paperId}${tab && tab !== 'summary' ? `?tab=${tab}` : ''}` : '/library';
    default:
      return '/';
  }
};

const parseRouteFromUrl = () => {
  const token = localStorage.getItem('token');
  let pathname = window.location.pathname;
  let search = window.location.search;

  // Support hash routing fallback if hash is present (e.g. #/library or #/paper/123)
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    const hashPart = window.location.hash.slice(1);
    const [hPath, hQuery] = hashPart.split('?');
    pathname = hPath;
    if (hQuery) search = `?${hQuery}`;
  }

  const searchParams = new URLSearchParams(search);
  const tabParam = searchParams.get('tab') || 'summary';

  if (pathname.startsWith('/paper/')) {
    const id = pathname.replace('/paper/', '').split('/')[0].split('?')[0];
    if (id) {
      if (!token) return { view: 'login', selectedPaperId: null, paperInitialTab: 'summary' };
      return { view: 'paperDetail', selectedPaperId: id, paperInitialTab: tabParam };
    }
  }

  const cleanPath = pathname.replace(/\/$/, '') || '/';

  switch (cleanPath) {
    case '':
    case '/':
      return { view: token ? 'home' : 'landing', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/home':
      return { view: token ? 'home' : 'login', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/library':
      return { view: token ? 'library' : 'login', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/chat':
      return { view: token ? 'chat' : 'login', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/graph':
      return { view: 'graph', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/settings':
      return { view: token ? 'settings' : 'login', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/upload':
      return { view: token ? 'upload' : 'login', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/login':
      return { view: 'login', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/register':
      return { view: 'register', selectedPaperId: null, paperInitialTab: 'summary' };
    case '/forgot-password':
      return { view: 'forgot-password', selectedPaperId: null, paperInitialTab: 'summary' };
    default:
      return { view: token ? 'home' : 'landing', selectedPaperId: null, paperInitialTab: 'summary' };
  }
};

/**
 * PAPERMIND RESEARCH REPOSITORY
 * Shell Architecture & Navigation matching Stitch Project 3601931371115488755
 */
function App() {
  const initialRoute = useMemo(() => parseRouteFromUrl(), []);
  const [view, setViewState] = useState(initialRoute.view);
  const [selectedPaperId, setSelectedPaperId] = useState(initialRoute.selectedPaperId);
  const [paperInitialTab, setPaperInitialTab] = useState(initialRoute.paperInitialTab);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', title: string, message: string }
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const userMenuRef = useRef(null);

  // Close user dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!showUserMenu) return;

    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  // Core navigation function that writes to browser history
  const navigate = useCallback((nextView, options = {}) => {
    setShowUserMenu(false);
    const { paperId = null, tab = 'summary', replace = false } = options;
    const path = getPathForView(nextView, paperId, tab);

    const newState = {
      view: nextView,
      selectedPaperId: paperId,
      paperInitialTab: tab,
    };

    if (replace) {
      window.history.replaceState(newState, '', path);
    } else {
      window.history.pushState(newState, '', path);
    }

    setViewState(nextView);
    setSelectedPaperId(paperId);
    setPaperInitialTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Backwards-compatible `setView` dispatch wrapper
  const setView = useCallback((nextView, options = {}) => {
    navigate(nextView, options);
  }, [navigate]);

  // Sync initial URL and state with browser history on mount
  useEffect(() => {
    const current = parseRouteFromUrl();
    const path = getPathForView(current.view, current.selectedPaperId, current.paperInitialTab);
    window.history.replaceState(
      {
        view: current.view,
        selectedPaperId: current.selectedPaperId,
        paperInitialTab: current.paperInitialTab,
      },
      '',
      path
    );
  }, []);

  // Browser Back & Forward button listener (popstate)
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.view) {
        setViewState(event.state.view);
        setSelectedPaperId(event.state.selectedPaperId || null);
        setPaperInitialTab(event.state.paperInitialTab || 'summary');
      } else {
        const route = parseRouteFromUrl();
        setViewState(route.view);
        setSelectedPaperId(route.selectedPaperId);
        setPaperInitialTab(route.paperInitialTab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Graceful in-app Back handler: steps back in history if available, else falls back
  const handleGoBack = useCallback((fallbackView = 'home') => {
    if (window.history.state && window.history.length > 1) {
      window.history.back();
    } else {
      setView(fallbackView);
    }
  }, [setView]);

  // Keyboard shortcut listener: ⌘K or Ctrl+K for search, U for upload
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.key) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('papers-search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          setView('library');
        }
      }
      if (
        e.key.toLowerCase() === 'u' &&
        !['input', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase()) &&
        isAuthenticated &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        setView('upload');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, setView]);

  const showNotification = (type, title, message) => {
    setToast({ type, title, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Listen for auth expiration dispatched by apiClient interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      navigate('login', { replace: true });
      showNotification('warning', '[AUTH // EXPIRED]', 'Your security session has expired. Please sign in again.');
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [navigate]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    try {
      setCurrentUser(JSON.parse(localStorage.getItem('user')) || null);
    } catch {
      setCurrentUser(null);
    }
    navigate('home', { replace: true });
    showNotification('success', '[AUTH // 001]', 'Session key verified · Welcome to your personal research node.');
  };

  const handleRegisterSuccess = () => {
    navigate('login');
    showNotification('success', '[ENROL // 002]', 'Account minted · Proceed to cryptographic login.');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedPaperId(null);
    setShowUserMenu(false);
    navigate('landing', { replace: true });
    showNotification('info', '[DISPATCH // 003]', 'Node session terminated · Keys erased from local memory.');
  };

  const handleOpenPaper = (paperId, tab = 'summary') => {
    setIsLoading(true);
    navigate('paperDetail', { paperId, tab });
    setTimeout(() => setIsLoading(false), 300);
  };

  const isAuthScreen = view === 'login' || view === 'register' || view === 'forgot-password';

  const userDisplayName = currentUser?.name
    ? currentUser.name.toUpperCase().startsWith('DR.')
      ? currentUser.name.toUpperCase()
      : `DR. ${currentUser.name.toUpperCase()}`
    : 'DR. E. VANCE · OXFORD NODE';

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans selection:bg-primary-container selection:text-on-surface">
      {/* 1. Global Loading Line (Screen 201e573b1c0b4fdcb96342fff26443b4) */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-primary-container z-50 animate-pulse shadow-[0_0_12px_#ff9a2e]" />
      )}

      {/* 2. Top Broadside Navigation Header (Screen Shell) */}
      {!isAuthScreen && view !== 'landing' && (
        <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 sticky top-0 z-40 transition-all">
          <div className="max-w-[1440px] mx-auto px-3 sm:px-6 md:px-12 h-full flex justify-between items-center">
            {/* Left Brand */}
            <div
              onClick={() => setView(isAuthenticated ? 'home' : 'landing')}
              className="cursor-pointer group flex items-center gap-2 sm:gap-2.5"
              title="Return to Research Homepage"
            >
              <PapermindLogo size={24} className="group-hover:scale-105 transition-transform" />
              <div className="hidden sm:flex items-center gap-1.5 font-counter-mono text-counter-mono text-secondary border border-outline-variant/40 px-2 py-0.5 rounded-sm">
                <span>[PM-ARCHIVE]</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
              </div>
              <span className="font-label-nav text-label-nav text-on-surface uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold group-hover:text-primary transition-colors text-xs sm:text-sm">
                PAPERMIND
              </span>
            </div>

            {/* Broadside Center Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8 font-label-nav text-label-nav text-secondary">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setView('home')}
                    className={`hover:text-on-surface transition-colors cursor-pointer py-1 ${
                      view === 'home'
                        ? 'text-primary font-bold border-b-2 border-primary'
                        : ''
                    }`}
                  >
                    HOME
                  </button>
                  <button
                    onClick={() => setView('library')}
                    className={`hover:text-on-surface transition-colors cursor-pointer py-1 ${
                      view === 'library' || view === 'paperDetail'
                        ? 'text-primary font-bold border-b-2 border-primary'
                        : ''
                    }`}
                  >
                    LIBRARY
                  </button>
                  <button
                    onClick={() => setView('chat')}
                    className={`hover:text-on-surface transition-colors cursor-pointer py-1 ${
                      view === 'chat' ? 'text-primary font-bold border-b-2 border-primary' : ''
                    }`}
                  >
                    CHAT
                  </button>
                  <button
                    onClick={() => setView('graph')}
                    className={`hover:text-on-surface transition-colors cursor-pointer py-1 ${
                      view === 'graph' ? 'text-primary font-bold border-b-2 border-primary' : ''
                    }`}
                  >
                    GRAPH
                  </button>
                  <button
                    onClick={() => setView('settings')}
                    className={`hover:text-on-surface transition-colors cursor-pointer py-1 ${
                      view === 'settings' ? 'text-primary font-bold border-b-2 border-primary' : ''
                    }`}
                  >
                    SETTINGS
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setView('landing')}
                    className="hover:text-on-surface transition-colors cursor-pointer"
                  >
                    MAIN
                  </button>
                  <button
                    onClick={() => setView('landing')}
                    className="hover:text-on-surface transition-colors cursor-pointer"
                  >
                    FEATURES
                  </button>
                  <button
                    onClick={() => setView('graph')}
                    className="hover:text-on-surface transition-colors cursor-pointer"
                  >
                    GRAPH MATRIX
                  </button>
                </>
              )}
            </nav>

            {/* Right Side Utility & Identity */}
            <div className="flex items-center gap-2 sm:gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => setView('upload')}
                    className={`inline-flex items-center justify-center font-label-nav text-label-nav text-on-primary bg-inverse-surface hover:bg-primary transition-all duration-200 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full tracking-[0.1em] uppercase cursor-pointer shadow-sm text-xs ${
                      view === 'upload' ? 'ring-2 ring-primary-container' : ''
                    }`}
                    title="Ingest new manuscript into library"
                  >
                    <span className="hidden sm:inline">+ UPLOAD PAPER</span>
                    <span className="sm:hidden font-bold">+ UPLOAD</span>
                  </button>

                  {/* Researcher Node Badge with Dropdown */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-1.5 sm:gap-2 border border-outline-variant/40 bg-surface-container rounded-full px-2.5 sm:px-3 py-1 text-counter-mono text-[10px] sm:text-[11px] hover:bg-surface-container-high transition-all cursor-pointer text-on-surface"
                      title={userDisplayName}
                    >
                      <span className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_#ff9a2e]"></span>
                      <span className="truncate max-w-[80px] sm:max-w-[130px] md:max-w-[160px]">{userDisplayName}</span>
                      <span className="text-[10px] text-secondary">▾</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-inverse-surface text-on-primary rounded-xl border border-white/15 p-2 shadow-2xl z-50 font-mono text-xs animate-fade-in">
                        <div className="p-2 border-b border-white/10 text-[10px] text-neutral-400 font-counter-mono">
                          CLUSTER :: ZURICH [ENCRYPTED]
                          <div className="text-white text-xs mt-0.5 truncate">{currentUser?.email || 'e.vance@oxford.ac.uk'}</div>
                        </div>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            setView('home');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs text-primary-container font-semibold"
                        >
                          RESEARCH HOME
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            setView('settings');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs"
                        >
                          SYSTEM PREFERENCES
                        </button>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            setView('graph');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-xs"
                        >
                          CITATION GRAPH
                        </button>
                        <div className="border-t border-white/10 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-primary-container hover:bg-primary-container/10 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                        >
                          TERMINATE SESSION
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setView('login')}
                    className="font-label-nav text-label-nav text-secondary hover:text-on-surface px-3 py-1 cursor-pointer transition-colors"
                  >
                    LOGIN
                  </button>
                  <button
                    onClick={() => setView('register')}
                    className="inline-flex items-center justify-center font-label-nav text-label-nav text-on-primary bg-inverse-surface hover:bg-primary transition-all duration-200 px-4 py-2 rounded-full tracking-[0.1em] uppercase cursor-pointer shadow-sm"
                  >
                    GET STARTED
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* 3. Main View Router */}
      <main className={`flex-1 w-full ${!isAuthScreen && view !== 'landing' && isAuthenticated ? 'pb-20 md:pb-0' : ''}`}>
        {view === 'landing' && (
          <LandingPage
            onGetStarted={() => setView(isAuthenticated ? 'home' : 'register')}
            onUploadClick={() => setView(isAuthenticated ? 'upload' : 'login')}
            onLoginClick={() => setView(isAuthenticated ? 'home' : 'login')}
            onViewChange={(v) => setView(v)}
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
          />
        )}

        {view === 'home' && (
          <Dashboard
            currentUser={currentUser}
            onGoToLibrary={() => setView('library')}
            onGoToChat={() => setView('chat')}
            onGoToGraph={() => setView('graph')}
            onGoToUpload={() => setView('upload')}
            onGoToSettings={() => setView('settings')}
            onOpenPaper={(id, tab = 'summary') => handleOpenPaper(id, tab)}
            onAskPaper={(id) => handleOpenPaper(id, 'chat')}
            onAuthRequired={() => setView('login')}
            showNotification={showNotification}
          />
        )}

        {view === 'library' && (
          <PaperList
            onSelectPaper={(id, tab = 'summary') => handleOpenPaper(id, tab)}
            onAskPaper={(id) => handleOpenPaper(id, 'chat')}
            onUploadClick={() => setView('upload')}
            onAuthRequired={() => setView('login')}
            showNotification={showNotification}
          />
        )}

        {view === 'upload' && (
          <UploadPaper
            onUploadComplete={(paperId) => {
              showNotification('success', '[INGEST // READY]', 'Paper vectorization complete.');
              handleOpenPaper(paperId, 'summary');
            }}
            onCancel={() => handleGoBack('library')}
            onAuthRequired={() => setView('login')}
          />
        )}

        {view === 'paperDetail' && (
          <PaperDetail
            paperId={selectedPaperId}
            initialTab={paperInitialTab}
            onBack={() => handleGoBack('library')}
            onAskPaper={(id) => handleOpenPaper(id, 'ask')}
            onAuthRequired={() => setView('login')}
            showNotification={showNotification}
          />
        )}

        {view === 'chat' && (
          <LibraryChat
            onSwitchToPaperChat={(paperId) => handleOpenPaper(paperId, 'ask')}
            onOpenPaper={(paperId) => handleOpenPaper(paperId, 'summary')}
            onAuthRequired={() => setView('login')}
            onGoToLibrary={() => handleGoBack('library')}
            showNotification={showNotification}
          />
        )}

        {view === 'graph' && (
          <CitationGraph
            onSelectPaper={(id) => handleOpenPaper(id, 'summary')}
            onAskPaper={(id) => handleOpenPaper(id, 'ask')}
            onAuthRequired={() => setView('login')}
          />
        )}

        {view === 'settings' && (
          <Settings
            currentUser={currentUser}
            onLogout={handleLogout}
            onBack={() => handleGoBack('home')}
            onUpdateProfile={(updated) => {
              setCurrentUser(updated);
              showNotification('success', '[PREF // SAVED]', 'Researcher preferences updated.');
            }}
            onAuthRequired={() => setView('login')}
          />
        )}

        {view === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setView('register')}
            onForgotPassword={() => setView('forgot-password')}
            onBackToLanding={() => setView('landing')}
          />
        )}

        {view === 'register' && (
          <Register
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setView('login')}
            onBackToLanding={() => setView('landing')}
          />
        )}

        {view === 'forgot-password' && (
          <ForgotPassword
            onBackToLogin={() => setView('login')}
            onBackToLanding={() => setView('landing')}
            onResetComplete={() => {
              setView('login');
              showNotification('success', '[AUTH // RESET]', 'Password updated. Please log in.');
            }}
          />
        )}
      </main>

      {/* 4. Global Archival Footer for Workspace Views */}
      {!isAuthScreen && view !== 'landing' && view !== 'graph' && view !== 'chat' && (
        <AppFooter
          currentView={view}
          onNavigate={(targetView) => {
            setView(targetView);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          currentUser={currentUser}
        />
      )}

      {/* 4. Global Toast System (Screen 9e01b23ebb304287930c92d580734b31) */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 max-w-sm w-auto sm:w-full bg-inverse-surface text-surface rounded-2xl border border-white/15 p-4 shadow-2xl animate-fade-in font-mono text-xs flex items-start gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
              toast.type === 'error'
                ? 'bg-error shadow-[0_0_8px_#ba1a1a]'
                : 'bg-primary-container shadow-[0_0_8px_#ff9a2e]'
            }`}
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/50 font-bold tracking-widest">{toast.title}</span>
              <button
                onClick={() => setToast(null)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/85 leading-relaxed font-sans">{toast.message}</p>
          </div>
        </div>
      )}

      {/* 5. Mobile Bottom Navigation Bar (< 768px for Authenticated Workspaces) */}
      {!isAuthScreen && view !== 'landing' && isAuthenticated && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-outline-variant/30 flex items-center justify-around py-1.5 px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] select-none"
        >
          <button
            onClick={() => setView('home')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              view === 'home'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="text-sm sm:text-base leading-none">⌂</span>
            <span className="font-counter-mono text-[9px] tracking-wider uppercase mt-1">HOME</span>
            {view === 'home' && <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-0.5 shadow-[0_0_4px_#ff9a2e]"></span>}
          </button>

          <button
            onClick={() => setView('library')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              view === 'library' || view === 'paperDetail'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="text-sm sm:text-base leading-none">▤</span>
            <span className="font-counter-mono text-[9px] tracking-wider uppercase mt-1">LIBRARY</span>
            {(view === 'library' || view === 'paperDetail') && <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-0.5 shadow-[0_0_4px_#ff9a2e]"></span>}
          </button>

          <button
            onClick={() => setView('chat')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              view === 'chat'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="text-sm sm:text-base leading-none">💬</span>
            <span className="font-counter-mono text-[9px] tracking-wider uppercase mt-1">CHAT</span>
            {view === 'chat' && <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-0.5 shadow-[0_0_4px_#ff9a2e]"></span>}
          </button>

          <button
            onClick={() => setView('graph')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              view === 'graph'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="text-sm sm:text-base leading-none">☊</span>
            <span className="font-counter-mono text-[9px] tracking-wider uppercase mt-1">GRAPH</span>
            {view === 'graph' && <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-0.5 shadow-[0_0_4px_#ff9a2e]"></span>}
          </button>

          <button
            onClick={() => setView('settings')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              view === 'settings'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="text-sm sm:text-base leading-none">⚙</span>
            <span className="font-counter-mono text-[9px] tracking-wider uppercase mt-1">CONFIG</span>
            {view === 'settings' && <span className="w-1.5 h-1.5 rounded-full bg-primary-container mt-0.5 shadow-[0_0_4px_#ff9a2e]"></span>}
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
