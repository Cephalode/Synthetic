/**
 * Unified TypeScript type definitions for the Synthetic project.
 *
 * Merges types from:
 *   - fourier-synth  (FFT analysis, similarity, test samples)
 *   - simple-synth-web  (synth parameters, operators, envelopes)
 *   - synthetic  (layer / AI-driven synth)
 */

// ---------------------------------------------------------------------------
// Fourier Synth types
// ---------------------------------------------------------------------------

/** Represents a single harmonic component of a signal. */
export interface HarmonicData {
  /** Frequency of this harmonic in Hz */
  frequency: number;
  /** Normalized amplitude (0–1 relative to strongest harmonic) */
  amplitude: number;
  /** Phase offset in radians */
  phase: number;
  /**
   * Per-frame amplitude envelope extracted via STFT.
   * Each entry is the amplitude of this harmonic in one analysis frame,
   * normalised to [0, 1] relative to the strongest harmonic across all frames.
   * Length = number of STFT frames.  `undefined` when STFT analysis wasn't used.
   */
  envelope?: Float32Array;
}

/** Synthesis mode for the re-synthesizer. */
export type SynthMode = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'additive';

/** Result returned by the FFT-based analyser. */
export interface AnalysisResult {
  /** Detected fundamental frequency in Hz */
  fundamentalFreq: number;
  /** Extracted harmonic series */
  harmonics: HarmonicData[];
  /** Full magnitude spectrum (length = N/2 + 1) */
  magnitudeSpectrum: Float32Array;
  /** Full phase spectrum (length = N/2 + 1) */
  phaseSpectrum: Float32Array;
  /** Sample rate of the analysed audio */
  sampleRate: number;
  /** Duration of the analysed audio in seconds */
  duration: number;
  /** Spectral centroid in Hz */
  spectralCentroid: number;
  /** Number of STFT frames used for envelope extraction (0 if none) */
  numFrames: number;
  /** Hop size in samples between successive STFT frames */
  hopSize: number;
  /** FFT frame size used for STFT analysis */
  frameSize: number;
  /**
   * Overall RMS energy envelope (one value per STFT frame).
   * Captures the macro amplitude shape — attack, decay, sustain, release.
   * Normalised so peak = 1.0.  Used by the synthesiser to shape the
   * overall output volume over time.
   */
  rmsEnvelope: Float32Array;
  /**
   * Residual analysis — noise floor characteristics for non-harmonic content.
   * Only present when residual analysis was performed.
   */
  residualAnalysis?: {
    /** Overall energy of the residual (RMS), normalized 0-1 */
    energy: number;
    /** Center frequency for bandpass filter in Hz */
    centerFreq: number;
    /** Bandwidth in Hz */
    bandwidth: number;
    /** Per-frame envelope of residual energy */
    envelope: Float32Array;
  };
}

/** Similarity metrics between original and reconstructed signals. */
export interface SimilarityResult {
  /** Mean-squared error in the time domain */
  mse: number;
  /** Cosine similarity of the magnitude spectra (−1 … 1) */
  cosineSimilarity: number;
  /** Absolute difference of spectral centroids in Hz */
  spectralCentroidDistance: number;
  /** Root-mean-square error in the time domain */
  rmsError: number;
  /** Time alignment offset applied to reconstructed signal (in samples) */
  alignmentShift: number;
}

/** A named test waveform that can generate its own samples. */
export interface TestSample {
  /** Human-readable name */
  name: string;
  /**
   * Generate a mono PCM buffer for the given sample rate and duration.
   * @returns Float32Array of sample values in the range [−1, 1].
   */
  generate(sampleRate: number, duration: number): Float32Array;
}

// ---------------------------------------------------------------------------
// Simple Synth Web types
// ---------------------------------------------------------------------------

/** ADSR envelope configuration. */
export interface EnvelopeConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** FM / additive operator configuration. */
export interface OperatorConfig {
  enabled: boolean;
  waveform: string;
  harmonics: Float32Array | null;
  ratio: number;
  fineTune: number;
  phase: number;
  level: number;
  pan: number;
  modType: string;
  modTarget: string;
  unison: number;
  unisonDetune: number;
  envelope: EnvelopeConfig;
}

/** Top-level synthesiser parameters. */
export interface SynthParams {
  waveform: string;
  octaveShift: number;
  filterCutoff: number;
  filterQ: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  algorithm: number;
  operators: OperatorConfig[];
}

// ---------------------------------------------------------------------------
// Additive Synth (Synthetic) types
// ---------------------------------------------------------------------------

/** Unison detune configuration for a synth layer. */
export interface UnisonConfig {
  /** Number of unison voices (1 = no unison). */
  voices: number;
  /** Detune spread in cents between voices. */
  detune: number;
}

/** Filter configuration for a synth layer. */
export interface FilterConfig {
  /** Biquad filter type. */
  type?: BiquadFilterType;
  /** Cutoff frequency in Hz. */
  frequency?: number;
  /** Resonance (Q) value. */
  Q?: number;
}

/** Filter envelope configuration applied on note-on. */
export interface FilterEnvelopeConfig {
  /** Amount of frequency modulation above the base frequency (Hz). */
  amount?: number;
  /** Attack time in seconds. */
  attack?: number;
  /** Decay time in seconds. */
  decay?: number;
}

/** FM synthesis configuration for a synth layer. */
export interface FmConfig {
  /** Frequency ratio of modulator to carrier. */
  ratio?: number;
  /** Modulation depth in Hz. */
  depth?: number;
  /** FM envelope attack in seconds. */
  attack?: number;
  /** FM envelope decay in seconds. */
  decay?: number;
}

/** Vibrato LFO configuration. */
export interface VibratoConfig {
  /** Vibrato depth in cents. */
  depth?: number;
  /** Vibrato rate in Hz. */
  rate?: number;
}

/** Tremolo LFO configuration. */
export interface TremoloConfig {
  /** Tremolo depth (0–1 gain modulation). */
  depth?: number;
  /** Tremolo rate in Hz. */
  rate?: number;
}

/**
 * A single additive-synthesis layer.  Each layer creates its own set of
 * oscillator / noise voices with independent envelopes, filters, FM,
 * vibrato, and tremolo.
 */
export interface SynthLayer {
  /** Layer ID for React keys. */
  id?: number;
  /** Role label for display. */
  role?: string;
  /** Instrument profile name. */
  instrumentProfile?: string | null;
  /** Oscillator waveform, or `'noise'` for a noise layer. */
  waveShape?: OscillatorType | 'noise';
  /** Octave offset from middle (4 = no shift). */
  octave?: number;
  /** Harmonic multiplier applied to the base frequency. */
  harmonic?: number;
  /** Peak gain for this layer. */
  gain?: number;
  /** ADSR attack time in seconds. */
  attack?: number;
  /** ADSR decay time in seconds. */
  decay?: number;
  /** ADSR sustain level (0–1). */
  sustain?: number;
  /** ADSR release time in seconds. */
  release?: number;
  /** If true, sustain is forced to silence (one-shot percussion). */
  percussive?: boolean;
  /** Optional unison configuration. */
  unison?: UnisonConfig;
  /** Optional biquad filter. */
  filter?: FilterConfig;
  /** Optional filter envelope. */
  filterEnvelope?: FilterEnvelopeConfig;
  /** Optional FM modulation. */
  fm?: FmConfig;
  /** Optional vibrato LFO. */
  vibrato?: VibratoConfig;
  /** Delay before vibrato kicks in (seconds). */
  vibratoDelay?: number;
  /** Optional tremolo LFO. */
  tremolo?: TremoloConfig;
  /** Noise-layer filter type. */
  noiseFilterType?: BiquadFilterType;
  /** Noise-layer filter frequency in Hz. */
  noiseFilterFreq?: number;
  /** Noise-layer filter Q. */
  noiseFilterQ?: number;
}

/**
 * Internal representation of a playing voice (set of Web Audio nodes).
 * Used to track active notes so they can be released / stolen.
 */
export interface ActiveVoice {
  /** All AudioNodes that belong to this voice (oscillators, gains, filters, etc.). */
  nodes: AudioNode[];
  /** Reference to the gain node and its envelope for release. */
  envelope: {
    gainNode: GainNode;
    envelope: EnvelopeConfig;
  };
  /** Filter node to release (null if no filter). */
  filterNode: BiquadFilterNode | null;
  /** Base frequency of the filter (for release envelope return). */
  filterBase: number | null;
}

export type AppMode = 'instrument' | 'fourier';

// Preset types
export interface InstrumentPreset {
  id: string;
  name: string;
  octave: number;
  waveShape: string;
  envelope: EnvelopeConfig;
  harmonics: { harmonic: number; gain: number; role: string; waveShape?: string; decay?: number }[];
  filter?: { type: string; frequency: number; Q: number };
  filterEnvelope?: { amount: number; attack: number; decay: number };
  vibrato?: { depth: number; rate: number };
  vibratoDelay?: number;
  tremolo?: { depth: number; rate: number };
  unison?: { voices: number; detune: number };
  fm?: { ratio: number; depth: number; attack: number; decay: number };
  noise?: { noiseFilterFreq: number; noiseFilterQ: number; noiseFilterType?: string; gain: number; role: string; attack?: number; decay?: number; sustain?: number; release?: number } | null;
}

// ActiveVoice already defined above
