import React from 'react';

/**
 * Papermind Architectural Error Boundary
 * Catches client-side exceptions and renders a Swiss brutalist recovery interface
 * rather than allowing a silent blank white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Papermind Runtime Anomaly:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#2B2B2B] text-[#F2F2F2] flex items-center justify-center p-6 font-mono">
          <div className="max-w-xl w-full border border-white/20 p-8 rounded-2xl bg-[#1E1E1E] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF9A2E] animate-pulse"></span>
                <span className="text-xs text-[#FF9A2E] tracking-widest font-bold">
                  [PM // EXCEPTION_HALTED]
                </span>
              </div>
              <span className="text-[10px] text-[#888888]">NODE ANOMALY DETECTED</span>
            </div>

            <div className="space-y-2">
              <h1 className="font-sans text-2xl font-bold text-white tracking-tight">
                Architectural Render Interrupted
              </h1>
              <p className="text-xs text-[#AAAAAA] leading-relaxed font-sans">
                A client-side execution anomaly prevented this view from mounting properly.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/40 border border-white/10 rounded-lg text-xs text-[#FF9A2E] overflow-x-auto whitespace-pre-wrap max-h-36 font-mono">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-full bg-[#FF9A2E] text-[#111111] text-xs font-bold font-sans hover:bg-[#FFC15E] transition-all cursor-pointer"
              >
                RELOAD INTERFACE
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-full border border-white/30 text-white text-xs font-sans hover:bg-white/10 transition-all cursor-pointer"
              >
                RESET SESSION KEYS
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
