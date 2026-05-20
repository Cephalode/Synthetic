/**
 * Offline synthesiser – generates waveforms using pure math (no Web Audio
 * oscillators).  This keeps the DSP path completely deterministic and
 * testable.
 *
 * Supports **time-varying amplitude envelopes** extracted via STFT analysis.
 * Each harmonic can have its own per-frame amplitude envelope so the
 * reconstruction captures the attack, decay, and overall temporal shape of
 * the original sound — not just a flat steady-state buzz.
 */

import type { AnalysisResult, SynthMode } from '../types';

// ---------------------------------------------------------------------------
// Waveform generators (one cycle helper functions)
// ---------------------------------------------------------------------------

/** Normalised sine in [−1, 1]. */
function sineAt(phase: number): number {
  return Math.sin(phase);
}

/** Naïve (aliased) square wave – acceptable for educational purposes. */
function squareAt(phase: number): number {
  const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return p < Math.PI ? 1 : -1;
}

/** Naïve sawtooth. */
function sawtoothAt(phase: number): number {
  const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return 1 - 2 * p / (2 * Math.PI);
}

/** Triangle wave. */
function triangleAt(phase: number): number {
  const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const norm = p / (2 * Math.PI);
  if (norm < 0.25) return 4 * norm;
  if (norm < 0.75) return 2 - 4 * norm;
  return 4 * norm - 4;
}

// ---------------------------------------------------------------------------
// Envelope interpolation
// ---------------------------------------------------------------------------

/**
 * Look up the envelope amplitude for a given sample index using linear
 * interpolation between STFT frames.
 *
 * @param envelope  Per-frame amplitudes (one entry per STFT frame).
 * @param sampleIdx The sample index we want the amplitude for.
 * @param hopSize   Hop size between STFT frames (in samples).
 * @param totalSamples Total number of output samples.
 * @returns Interpolated amplitude in [0, 1].
 */
function interpEnvelope(
  envelope: Float32Array,
  sampleIdx: number,
  totalSamples: number,
): number {
  const numFrames = envelope.length;
  if (numFrames === 0) return 1;

  // Map sample index to continuous frame index
  const frameFloat = (sampleIdx / totalSamples) * (numFrames - 1);
  const frameLo = Math.floor(frameFloat);
  const frameHi = Math.min(frameLo + 1, numFrames - 1);
  const frac = frameFloat - frameLo;

  return envelope[frameLo] * (1 - frac) + envelope[frameHi] * frac;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate white noise buffer. */
function createWhiteNoise(length: number): Float32Array {
  const noise = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    noise[i] = Math.random() * 2 - 1;
  }
  return noise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Synthesise audio from an analysis result.
 *
 * @param analysis     Output of `analyzeSample` (may contain envelopes).
 * @param sampleRate   Target sample rate.
 * @param duration     Duration in seconds.
 * @param mode         Synthesis mode (additive or standard waveform shapes).
 * @param numHarmonics Number of harmonics to include (default: all from analysis).
 * @returns Float32Array of mono PCM samples.
 */
export function synthesize(
  analysis: AnalysisResult,
  sampleRate: number,
  duration: number,
  mode: SynthMode = 'additive',
  numHarmonics?: number,
): Float32Array {
  const numSamples = Math.floor(sampleRate * duration);
  const output = new Float32Array(numSamples);
  const harmonics = analysis.harmonics;
  const limit = numHarmonics !== undefined
    ? Math.min(numHarmonics, harmonics.length)
    : harmonics.length;
  const fundamental = analysis.fundamentalFreq;

  if (fundamental <= 0 || limit === 0) return output;

  switch (mode) {
    case 'additive':
      synthesizeAdditive(
        output, harmonics, limit, sampleRate,
        analysis.hopSize, analysis.frameSize,
      );
      break;

    case 'sine':
      synthesizeWaveShape(output, fundamental, harmonics, limit, sampleRate, sineAt,
        analysis.hopSize, analysis.frameSize);
      break;

    case 'square':
      synthesizeWaveShape(output, fundamental, harmonics, limit, sampleRate, squareAt,
        analysis.hopSize, analysis.frameSize);
      break;

    case 'sawtooth':
      synthesizeWaveShape(output, fundamental, harmonics, limit, sampleRate, sawtoothAt,
        analysis.hopSize, analysis.frameSize);
      break;

    case 'triangle':
      synthesizeWaveShape(output, fundamental, harmonics, limit, sampleRate, triangleAt,
        analysis.hopSize, analysis.frameSize);
      break;

    default:
      synthesizeAdditive(
        output, harmonics, limit, sampleRate,
        analysis.hopSize, analysis.frameSize,
      );
  }

  // Add noise/residual layer if available
  if (analysis.residualAnalysis && analysis.residualAnalysis.energy > 0.001) {
    const res = analysis.residualAnalysis;
    const noise = createWhiteNoise(numSamples);
    // Bandpass filter via direct Form II biquad
    const bw = Math.max(100, res.bandwidth);
    const q = res.centerFreq / bw;
    const w0 = 2 * Math.PI * res.centerFreq / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.max(0.001, q));
    const b0 = alpha;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let n = 0; n < numSamples; n++) {
      const x0 = noise[n];
      const y0 = (b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
      const envAmp = res.envelope.length > 0 ? interpEnvelope(res.envelope, n, numSamples) : 1;
      output[n] += res.energy * envAmp * y0;
    }
  }

  // Normalise to prevent clipping
  normalise(output);

  return output;
}

// ---------------------------------------------------------------------------
// Synthesis strategies
// ---------------------------------------------------------------------------

/**
 * Pure additive synthesis with time-varying envelopes.
 *
 * For each harmonic, if an STFT envelope is available the amplitude is
 * interpolated per-sample so the output mirrors the original's temporal
 * shape (attack, decay, sustain, release).  Without an envelope the
 * harmonic uses its static amplitude (constant level).
 */
function synthesizeAdditive(
  output: Float32Array,
  harmonics: { frequency: number; amplitude: number; phase: number; envelope?: Float32Array }[],
  limit: number,
  sampleRate: number,
  _hopSize: number,
  _frameSize: number,
): void {
  const totalSamples = output.length;

  for (let h = 0; h < limit; h++) {
    const { frequency, amplitude, phase: ph, envelope } = harmonics[h];
    const omega = 2 * Math.PI * frequency;

    if (envelope && envelope.length > 0) {
      // Time-varying: interpolate envelope per-sample
      for (let n = 0; n < totalSamples; n++) {
        const envAmp = interpEnvelope(envelope, n, totalSamples);
        output[n] += amplitude * envAmp * Math.cos(omega * n / sampleRate + ph);
      }
    } else {
      // Static amplitude (fallback when no STFT data)
      for (let n = 0; n < totalSamples; n++) {
        output[n] += amplitude * Math.cos(omega * n / sampleRate + ph);
      }
    }
  }
}

/**
 * Wave-shape synthesis with envelope support.
 *
 * Generate a waveform at the fundamental frequency and blend it with an
 * additive layer whose harmonics carry the measured envelopes.
 */
function synthesizeWaveShape(
  output: Float32Array,
  fundamental: number,
  harmonics: { frequency: number; amplitude: number; phase: number; envelope?: Float32Array }[],
  limit: number,
  sampleRate: number,
  waveFunc: (phase: number) => number,
  hopSize: number,
  frameSize: number,
): void {
  const omega = 2 * Math.PI * fundamental;

  // First, generate the base waveform
  for (let n = 0; n < output.length; n++) {
    output[n] = waveFunc(omega * n / sampleRate);
  }

  // Compute an additive layer weighted by measured harmonics + envelopes
  const additiveLayer = new Float32Array(output.length);
  synthesizeAdditive(additiveLayer, harmonics, limit, sampleRate, hopSize, frameSize);

  // Mix: 50 % base waveform + 50 % additive, then normalise later
  for (let n = 0; n < output.length; n++) {
    output[n] = 0.5 * output[n] + 0.5 * additiveLayer[n];
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** In-place peak normalisation to [−1, 1]. */
function normalise(buffer: Float32Array): void {
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0 && peak > 1) {
    const scale = 1 / peak;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] *= scale;
    }
  }
}

/**
 * Play a PCM buffer through the browser's audio output.
 *
 * This is the *only* function that touches the Web Audio API at runtime.
 * All other synthesis is offline / pure-math.
 *
 * @param audioData  Mono Float32 PCM samples.
 * @param sampleRate Sample rate of the buffer.
 * @returns The AudioBufferSourceNode (caller can call `.stop()` on it).
 */
export function playBuffer(audioData: Float32Array, sampleRate: number): AudioBufferSourceNode {
  const ctx = new AudioContext();
  const buffer = ctx.createBuffer(1, audioData.length, sampleRate);
  buffer.getChannelData(0).set(audioData);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();

  // Automatically close the AudioContext when playback finishes
  source.onended = () => {
    ctx.close();
  };

  return source;
}
