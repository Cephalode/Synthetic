/**
 * Preset import/export via shareable JSON strings.
 */

import { useState, useCallback } from 'react';
import type { SynthLayer } from '../../types';

interface PresetShareProps {
  layers: SynthLayer[];
  onLoadLayers: (layers: SynthLayer[]) => void;
}

export default function PresetShare({ layers, onLoadLayers }: PresetShareProps) {
  const [importText, setImportText] = useState('');
  const [status, setStatus] = useState('');

  const handleExport = useCallback(() => {
    const json = JSON.stringify({
      version: 1,
      layers,
      exportedAt: new Date().toISOString(),
    });
    navigator.clipboard.writeText(json).then(() => {
      setStatus('Copied to clipboard!');
      setTimeout(() => setStatus(''), 2000);
    }).catch(() => {
      // Fallback: show in text area
      setImportText(json);
      setStatus('Copy the text above');
      setTimeout(() => setStatus(''), 3000);
    });
  }, [layers]);

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.layers || !Array.isArray(parsed.layers)) {
        setStatus('Invalid preset: missing layers array');
        setTimeout(() => setStatus(''), 3000);
        return;
      }
      // Basic validation
      const validLayers: SynthLayer[] = parsed.layers.map((l: SynthLayer, i: number) => ({
        id: i,
        waveShape: l.waveShape || 'sine',
        octave: l.octave ?? 4,
        attack: l.attack ?? 0.01,
        decay: l.decay ?? 0.1,
        sustain: l.sustain ?? 0.7,
        release: l.release ?? 0.3,
        gain: l.gain ?? 0.5,
        harmonic: l.harmonic ?? 1,
        role: l.role || `layer-${i}`,
        ...l,
      }));
      onLoadLayers(validLayers);
      setImportText('');
      setStatus(`Loaded ${validLayers.length} layers`);
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Invalid JSON — paste a valid preset string');
      setTimeout(() => setStatus(''), 3000);
    }
  }, [importText, onLoadLayers]);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Share Preset</h4>
      <div className="flex gap-2 mb-2">
        <button
          onClick={handleExport}
          className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded font-medium"
        >
          📋 Export / Copy
        </button>
        <button
          onClick={handleImport}
          className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded font-medium"
        >
          📥 Import
        </button>
      </div>
      <textarea
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        placeholder="Paste a preset JSON string here to import..."
        className="w-full h-16 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 placeholder-slate-500 resize-none"
      />
      {status && (
        <p className="text-xs text-teal-400 mt-1 text-center">{status}</p>
      )}
    </div>
  );
}
