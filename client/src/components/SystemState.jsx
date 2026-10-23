import React from 'react';
import WireframeMesh from './WireframeMesh';

/**
 * Page 12 — System States (404, Error 500, 401 Session Expired, Empty Library, Toasts)
 */
export const NotFoundState = ({ onBack }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#2B2B2B] flex flex-col justify-between text-[#F2F2F2]">
      {/* Top minimal bar */}
      <div className="p-8 border-b border-white/10 flex justify-between items-center">
        <span className="font-display text-xl text-[#F2F2F2]">PAPERMIND</span>
        <button onClick={onBack} className="font-nav-label text-xs text-[#F2F2F2]/70 hover:text-white">
          ← BACK
        </button>
      </div>

      {/* Center scene */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        <div className="absolute inset-0">
          <WireframeMesh broken={true} showRing={true} />
        </div>

        <div className="relative z-10 text-center space-y-4 max-w-md mx-auto">
          <span className="font-mono-counter text-xs text-[#FF9A2E]">ERROR 404</span>
          <h1 className="font-display text-5xl sm:text-6xl text-white">
            PAGE NOT FOUND
          </h1>
          <p className="text-xs text-[#F2F2F2]/70 leading-relaxed">
            The requested document node does not exist or has been relocated within the research bibliography.
          </p>
          <div className="pt-2">
            <button onClick={onBack} className="btn-primary-dark">
              BACK TO LIBRARY
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/10 text-center font-mono-counter text-[10px] text-white/40">
        DISCONNECTED TOPOLOGY
      </div>
    </div>
  );
};

export const ErrorState = ({ message = 'SOMETHING BROKE', onRetry }) => {
  return (
    <div className="p-12 text-center card-dark space-y-4 max-w-md mx-auto my-12">
      <div className="w-10 h-10 mx-auto rounded-full border border-[#C0392B] flex items-center justify-center text-[#C0392B] font-mono text-xs">
        !
      </div>
      <h3 className="font-display text-2xl text-white">SOMETHING BROKE</h3>
      <p className="text-xs text-white/70">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary-dark !h-9 !px-6 !text-[10px]">
          TRY AGAIN
        </button>
      )}
    </div>
  );
};

export const ToastNotification = ({ message, type = 'success', onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 card-dark p-3.5 px-5 bg-[#2B2B2B]/95 backdrop-blur-md flex items-center gap-3 border border-white/20 shadow-2xl animate-fade-in">
      <span className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-[#FF9A2E] shadow-[0_0_8px_#FF9A2E]' : 'bg-[#C0392B]'}`} />
      <span className="font-nav-label text-[10px] text-white tracking-wider">{message}</span>
      {onClose && (
        <button onClick={onClose} className="text-white/40 hover:text-white text-xs pl-2">
          ✕
        </button>
      )}
    </div>
  );
};
