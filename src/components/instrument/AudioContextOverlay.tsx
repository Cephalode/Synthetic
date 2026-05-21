/**
 * AudioContext state indicator and "Click to enable audio" overlay.
 * Browsers require user interaction to start AudioContext.
 */

import { useState, useEffect, useCallback } from 'react';

interface AudioContextOverlayProps {
  audioCtx: AudioContext | null;
  onResume: () => void;
}

export default function AudioContextOverlay({ audioCtx, onResume }: AudioContextOverlayProps) {
  const [state, setState] = useState<AudioContextState | null>(null);

  useEffect(() => {
    if (!audioCtx) return;
    setState(audioCtx.state);

    const handler = () => setState(audioCtx.state);
    audioCtx.addEventListener('statechange', handler);
    return () => audioCtx.removeEventListener('statechange', handler);
  }, [audioCtx]);

  const handleClick = useCallback(() => {
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().then(() => onResume());
    }
  }, [audioCtx, onResume]);

  if (state === 'running') {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded bg-teal-900/40 border border-teal-800/50">
        <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_#14b8a6] animate-pulse" />
        <span className="text-xs text-teal-300">Audio Ready</span>
      </div>
    );
  }

  if (state === 'suspended') {
    return (
      <div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer"
        onClick={handleClick}
        role="button"
        aria-label="Click to enable audio"
      >
        <div className="bg-slate-800 border border-teal-500 rounded-xl p-8 text-center max-w-sm shadow-2xl shadow-teal-900/30">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-600/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M18.364 5.636a9 9 0 010 12.728" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-200 mb-2">Click to Enable Audio</h2>
          <p className="text-sm text-slate-400 mb-4">
            Your browser requires a user interaction to start the audio engine.
          </p>
          <div className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-semibold inline-block transition-colors">
            Enable Audio
          </div>
        </div>
      </div>
    );
  }

  // 'closed' or null
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded bg-yellow-900/30 border border-yellow-800/50">
      <div className="w-2 h-2 rounded-full bg-yellow-500" />
      <span className="text-xs text-yellow-400">
        {state === 'closed' ? 'Audio Closed' : 'No Audio'}
      </span>
    </div>
  );
}
