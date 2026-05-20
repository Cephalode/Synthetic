// @ts-nocheck
import React, { useState } from 'react';
import type { SynthLayer } from '../../types';

const COLORS = ['#00d4aa', '#ff6b9d', '#ffa64d', '#6bcbff', '#c084fc', '#f0e040', '#ff5555', '#50fa7b'];

interface LayerCardProps {
  layer: SynthLayer;
  index: number;
  onUpdate: (layer: SynthLayer) => void;
  onDelete: () => void;
}

export default function LayerCard({ layer, index, onUpdate, onDelete }: LayerCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const color = COLORS[index % COLORS.length];

  const set = (key: keyof SynthLayer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = parseFloat(e.target.value);
    onUpdate({ ...layer, [key]: isNaN(val) ? (e.target as HTMLInputElement).value : val });
  };

  const waveShapes: SynthLayer['waveShape'][] = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];
  const displayTitle = layer.role || `Layer ${index + 1}`;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700/50"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="text-sm font-medium text-slate-200">{displayTitle}</span>
        {layer.harmonic > 1 && (
          <span className="text-xs bg-cyan-900 text-cyan-300 px-1.5 py-0.5 rounded">×{layer.harmonic}</span>
        )}
        <span className="ml-auto text-xs text-slate-500">{collapsed ? '▸' : '▾'}</span>
        <button
          className="text-red-400 hover:text-red-300 text-xs px-2"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          ✕
        </button>
      </div>

      {!collapsed && (
        <div className="p-3 grid grid-cols-2 gap-3 border-t border-slate-700">
          {/* Wave Shape */}
          <div className="col-span-2">
            <label className="text-xs text-slate-400">Wave Shape</label>
            <div className="flex gap-1 mt-1">
              {waveShapes.map(w => (
                <button
                  key={w}
                  className={`flex-1 px-2 py-1 text-xs rounded ${layer.waveShape === w ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                  onClick={() => onUpdate({ ...layer, waveShape: w })}
                >
                  {w.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ADSR */}
          <div>
            <label className="text-xs text-slate-400">Attack: {layer.attack.toFixed(3)}s</label>
            <input type="range" min="0.001" max="2" step="0.001" value={layer.attack} onChange={set('attack')} className="w-full accent-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Decay: {layer.decay.toFixed(3)}s</label>
            <input type="range" min="0.001" max="2" step="0.001" value={layer.decay} onChange={set('decay')} className="w-full accent-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Sustain: {layer.sustain.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.01" value={layer.sustain} onChange={set('sustain')} className="w-full accent-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Release: {layer.release.toFixed(3)}s</label>
            <input type="range" min="0.001" max="5" step="0.001" value={layer.release} onChange={set('release')} className="w-full accent-cyan-500" />
          </div>

          {/* Gain, Octave, Harmonic */}
          <div>
            <label className="text-xs text-slate-400">Gain: {layer.gain.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.01" value={layer.gain} onChange={set('gain')} className="w-full accent-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Octave: {layer.octave}</label>
            <input type="range" min="1" max="8" step="1" value={layer.octave} onChange={set('octave')} className="w-full accent-cyan-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Harmonic: ×{layer.harmonic}</label>
            <input type="range" min="1" max="16" step="1" value={layer.harmonic} onChange={set('harmonic')} className="w-full accent-cyan-500" />
          </div>
        </div>
      )}
    </div>
  );
}
