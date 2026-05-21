import { useState, useCallback, useRef, useEffect } from 'react';
import { useAdditiveSynth } from '../../hooks/useAdditiveSynth';
import { useMidi } from '../../hooks/useMidi';
import { INSTRUMENTS } from '../../data/instrument-presets';
import LayerCard from './layer-card';
import WaveformViz from './WaveformViz';
import SpectrumViz from './SpectrumViz';
import PianoKeyboard from './PianoKeyboard';
import PresetShare from './PresetShare';
import AudioContextOverlay from './AudioContextOverlay';
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
  const {
    noteOn, noteOff, audioCtx, analyser,
    detune, setDetune,
    multiOsc, setMultiOsc,
    isRecording, recordingElapsed,
    startRecording, stopRecording,
    resumeContext,
  } = useAdditiveSynth();

  const [layers, setLayers] = useState<SynthLayer[]>([defaultLayer()]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [search, setSearch] = useState('');
  const activeNotes = useRef<Set<number>>(new Set());
  const [pressedNotes, setPressedNotes] = useState<Set<number>>(new Set());

  // MIDI integration
  const midi = useMidi(
    useCallback((note: number, _velocity: number) => {
      noteOn(note, layers);
      setPressedNotes(prev => new Set(prev).add(note));
    }, [layers, noteOn]),
    useCallback((note: number) => {
      noteOff(note);
      setPressedNotes(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }, [noteOff]),
  );

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

  const handlePianoNoteOn = useCallback((midi: number) => {
    noteOn(midi, layers);
    activeNotes.current.add(midi);
    setPressedNotes(prev => new Set(prev).add(midi));
  }, [layers, noteOn]);

  const handlePianoNoteOff = useCallback((midi: number) => {
    noteOff(midi);
    activeNotes.current.delete(midi);
    setPressedNotes(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, [noteOff]);

  // Keyboard handling
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      const midi = NOTE_MAP[e.key.toLowerCase()];
      if (midi !== undefined && !activeNotes.current.has(midi)) {
        activeNotes.current.add(midi);
        noteOn(midi, layers);
        setPressedNotes(prev => new Set(prev).add(midi));
      }
    };
    const up = (e: KeyboardEvent) => {
      const midi = NOTE_MAP[e.key.toLowerCase()];
      if (midi !== undefined) {
        activeNotes.current.delete(midi);
        noteOff(midi);
        setPressedNotes(prev => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [layers, noteOn, noteOff]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Audio Context Overlay */}
      <AudioContextOverlay audioCtx={audioCtx} onResume={resumeContext} />

      {/* Top bar: Presets + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        {/* Synth Controls */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Controls</h3>

          {/* Detune */}
          <div className="mb-3">
            <label className="text-xs text-slate-400">
              Detune: <span className="text-teal-400 font-semibold">{detune > 0 ? '+' : ''}{detune} cents</span>
            </label>
            <input
              type="range" min="-100" max="100" step="1" value={detune}
              onChange={(e) => setDetune(Number(e.target.value))}
              className="w-full accent-cyan-500 mt-1"
            />
          </div>

          {/* Multi-oscillator */}
          <div className="mb-3">
            <label className="text-xs text-slate-400">
              Extra Oscillators: <span className="text-teal-400 font-semibold">{multiOsc.count}</span>
            </label>
            <input
              type="range" min="0" max="3" step="1" value={multiOsc.count}
              onChange={(e) => setMultiOsc({ ...multiOsc, count: Number(e.target.value) })}
              className="w-full accent-cyan-500 mt-1"
            />
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-400">
              Detune Spread: <span className="text-teal-400 font-semibold">{multiOsc.spread} cents</span>
            </label>
            <input
              type="range" min="1" max="50" step="1" value={multiOsc.spread}
              onChange={(e) => setMultiOsc({ ...multiOsc, spread: Number(e.target.value) })}
              className="w-full accent-cyan-500 mt-1"
            />
          </div>

          {/* MIDI status */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`w-2 h-2 rounded-full ${midi.enabled && midi.inputs.length > 0 ? 'bg-teal-400 shadow-[0_0_6px_#14b8a6]' : 'bg-slate-600'}`} />
            <span className="text-xs text-slate-400">
              {midi.inputs.length > 0
                ? `MIDI: ${midi.inputs.join(', ')}`
                : midi.supported ? 'MIDI: No device' : 'MIDI: Not supported'
              }
            </span>
          </div>
        </div>

        {/* Recording + Share */}
        <div className="flex flex-col gap-3">
          {/* Recording */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Recording</h3>
            <div className="flex gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-medium flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-white" /> Record
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-600 text-white text-xs rounded font-medium flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
                  Stop {formatTime(recordingElapsed)}
                </button>
              )}
            </div>
          </div>

          {/* Preset Share */}
          <PresetShare layers={layers} onLoadLayers={setLayers} />
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WaveformViz analyser={analyser} />
        <SpectrumViz analyser={analyser} />
      </div>

      {/* Piano Keyboard */}
      <PianoKeyboard
        activeNotes={pressedNotes}
        onNoteOn={handlePianoNoteOn}
        onNoteOff={handlePianoNoteOff}
        startOctave={4}
        octaves={2}
      />

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
          {midi.inputs.length > 0 && ' · MIDI keyboard active'}
        </p>
      </div>
    </div>
  );
}
