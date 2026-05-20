import { useState, useCallback, useRef, useEffect } from 'react';
import { useAdditiveSynth } from '../../hooks/useAdditiveSynth';
import { INSTRUMENTS } from '../../data/instrument-presets';
import LayerCard from './layer-card';
import type { SynthLayer } from '../../types';

function presetToLayers(name: string): SynthLayer[] {
  const preset = INSTRUMENTS[name];
  if (!preset) return [defaultLayer()];
  return preset.harmonics.map((h, i) => ({
    id: i,
    waveShape: (h.waveShape || preset.waveShape || 'sine') as SynthLayer['waveShape'],
    octave: preset.octave,
    attack: preset.envelope.attack,
    decay: h.decay || preset.envelope.decay,
    sustain: preset.envelope.sustain,
    release: preset.envelope.release,
    gain: h.gain,
    harmonic: h.harmonic,
    role: h.role,
    instrumentProfile: name,
    percussive: preset.envelope.sustain < 0.01,
    filter: preset.filter ? { ...preset.filter, type: preset.filter.type as BiquadFilterType } : undefined,
    filterEnvelope: preset.filterEnvelope ? { ...preset.filterEnvelope } : undefined,
    vibrato: preset.vibrato ? { ...preset.vibrato } : undefined,
    vibratoDelay: preset.vibratoDelay,
    tremolo: preset.tremolo ? { ...preset.tremolo } : undefined,
    unison: preset.unison ? { ...preset.unison } : undefined,
    fm: preset.fm ? { ...preset.fm } : undefined,
    noiseFilterFreq: undefined,
    noiseFilterQ: undefined,
    noiseFilterType: undefined,
  }));
}

function defaultLayer(): SynthLayer {
  return {
    id: 0, waveShape: 'sine', octave: 4,
    attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3,
    gain: 0.5, harmonic: 1, role: 'fundamental',
    percussive: false,
  };
}

const NOTE_MAP: Record<string, number> = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64,
  'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69,
  'u': 70, 'j': 71, 'k': 72, 'o': 73, 'l': 74,
};

export default function InstrumentPanel() {
  const { noteOn, noteOff } = useAdditiveSynth();
  const [layers, setLayers] = useState<SynthLayer[]>([defaultLayer()]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [search, setSearch] = useState('');
  const activeNotes = useRef<Set<number>>(new Set());

  const instrumentNames = Object.keys(INSTRUMENTS);
  const filtered = search
    ? instrumentNames.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : instrumentNames;

  const loadPreset = useCallback((name: string) => {
    setSelectedPreset(name);
    setLayers(presetToLayers(name));
  }, []);

  const updateLayer = useCallback((index: number, layer: SynthLayer) => {
    setLayers(prev => prev.map((l, i) => i === index ? layer : l));
  }, []);

  const deleteLayer = useCallback((index: number) => {
    setLayers(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addLayer = useCallback(() => {
    setLayers(prev => [...prev, { ...defaultLayer(), id: prev.length, role: `layer-${prev.length}` }]);
  }, []);

  // Keyboard handling
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const midi = NOTE_MAP[e.key.toLowerCase()];
      if (midi !== undefined && !activeNotes.current.has(midi)) {
        activeNotes.current.add(midi);
        noteOn(midi, layers);
      }
    };
    const up = (e: KeyboardEvent) => {
      const midi = NOTE_MAP[e.key.toLowerCase()];
      if (midi !== undefined) {
        activeNotes.current.delete(midi);
        noteOff(midi);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [layers, noteOn, noteOff]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Preset selector */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Instrument Presets</h3>
        <input
          type="text" placeholder="Search instruments..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 mb-3"
        />
        <div className="grid grid-cols-4 md:grid-cols-6 gap-1 max-h-40 overflow-y-auto">
          {filtered.slice(0, 48).map(name => (
            <button
              key={name}
              className={`px-2 py-1 text-xs rounded ${selectedPreset === name ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              onClick={() => loadPreset(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Layers */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
            Layers ({layers.length})
          </h3>
          <button
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded"
            onClick={addLayer}
          >
            + Add Layer
          </button>
        </div>
        {layers.map((layer, i) => (
          <LayerCard
            key={layer.id}
            layer={layer}
            index={i}
            onUpdate={(l) => updateLayer(i, l)}
            onDelete={() => deleteLayer(i)}
          />
        ))}
      </div>

      {/* Keyboard hint */}
      <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-center">
        <p className="text-xs text-slate-500">
          Play with keyboard: A S D F G H J K L (white keys) · W E T Y U O (black keys) · Octave starts at C4
        </p>
      </div>
    </div>
  );
}
