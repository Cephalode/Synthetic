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
import { fft, ifft } from './fft';

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

    case 'overlapadd':
      synthesizeOverlapAdd(output, analysis, sampleRate, limit);
      break;

    case 'griffinlim':
      synthesizeGriffinLim(output, analysis, sampleRate, 32);
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

  // Match output RMS to original analysis RMS level
  // The analysis stores an rmsEnvelope — use its mean to estimate original level
  if (analysis.rmsEnvelope && analysis.rmsEnvelope.length > 0) {
    let meanRms = 0;
    for (let i = 0; i < analysis.rmsEnvelope.length; i++) meanRms += analysis.rmsEnvelope[i];
    meanRms /= analysis.rmsEnvelope.length;
    
    // Compute output RMS
    let outRms = 0;
    for (let i = 0; i < output.length; i++) outRms += output[i] * output[i];
    outRms = Math.sqrt(outRms / output.length);
    
    // Scale output to match
    if (outRms > 0 && meanRms > 0) {
      const scale = Math.min(meanRms / outRms, 2.0); // cap at 2x to avoid amplifying noise
      for (let i = 0; i < output.length; i++) output[i] *= scale;
    }
  }

  // Scale output to match approximate level of input (don't normalize to 1.0)
  // Peak-normalization distorts the relative levels and hurts similarity scores
  let outPeak = 0;
  for (let i = 0; i < output.length; i++) {
    const abs = Math.abs(output[i]);
    if (abs > outPeak) outPeak = abs;
  }
  // Only normalize if clipping (>0.95), otherwise leave levels as-is
  if (outPeak > 0.95) {
    const scale = 0.9 / outPeak;
    for (let i = 0; i < output.length; i++) output[i] *= scale;
  }

  return output;
}

// ---------------------------------------------------------------------------
// Synthesis strategies
// ---------------------------------------------------------------------------

/**
 * Griffin-Lim iterative phase reconstruction.
 * Reconstructs audio from the harmonic magnitude spectrogram by iteratively
 * estimating phase. This naturally handles vibrato and time-varying spectra
 * because it works with the STFT frames directly.
 *
 * Reference: Griffin & Lim, "Signal Estimation from Modified Short-Time
 * Fourier Transform", IEEE 1984.
 */
function synthesizeGriffinLim(
  output: Float32Array,
  analysis: AnalysisResult,
  sampleRate: number,
  iterations: number = 32,
): void {
  const harmonics = analysis.harmonics;
  const numHarmonics = harmonics.length;

  const frameSize = analysis.frameSize || 2048;
  const hopSize = analysis.hopSize || (frameSize >> 2);
  const numFrames = Math.max(1, Math.floor((output.length - frameSize) / hopSize) + 1);

  // Build target magnitude spectrogram from harmonic parameters.
  // For each frame, create a magnitude spectrum with peaks at harmonic frequencies.
  const halfN = (frameSize >> 1) + 1;
  const targetMag: Float32Array[] = [];

  for (let f = 0; f < numFrames; f++) {
    const mag = new Float32Array(halfN);
    const frameStart = f * hopSize;

    for (let h = 0; h < numHarmonics; h++) {
      const harm = harmonics[h];
      const freq = harm.frequency;
      const baseAmp = harm.amplitude;

      // Get envelope for this frame
      const envAmp = harm.envelope && harm.envelope.length > 0
        ? interpEnvelope(harm.envelope, frameStart, output.length)
        : 1.0;

      const amp = baseAmp * envAmp;
      if (amp < 0.001) continue;

      // Place magnitude at the target frequency bin with Gaussian spread
      const targetBin = freq * frameSize / sampleRate;
      const spread = 3; // bins
      const lo = Math.max(1, Math.floor(targetBin - spread * 2));
      const hi = Math.min(halfN - 1, Math.ceil(targetBin + spread * 2));

      for (let b = lo; b <= hi; b++) {
        const dist = (b - targetBin) / spread;
        mag[b] += amp * Math.exp(-0.5 * dist * dist);
      }
    }

    targetMag.push(mag);
  }

  // Initialize phase: if per-frame phases are available from analysis,
  // use them as the initial estimate (much better than random).
  const prevPhase: Float32Array[] = [];
  for (let f = 0; f < numFrames; f++) {
    const ph = new Float32Array(halfN);

    if (harmonics.some(h => h.phaseFrames && h.phaseFrames.length > 0)) {
      // Seed phase at harmonic bins from the analysis per-frame phases
      for (let h = 0; h < numHarmonics; h++) {
        const harm = harmonics[h];
        if (!harm.phaseFrames || harm.phaseFrames.length === 0) continue;

        // Interpolate phase for this frame
        const frameFloat = (f / Math.max(1, numFrames - 1)) * (harm.phaseFrames.length - 1);
        const lo = Math.floor(frameFloat);
        const hi = Math.min(lo + 1, harm.phaseFrames.length - 1);
        const frac = frameFloat - lo;
        const framePhase = harm.phaseFrames[lo] * (1 - frac) + harm.phaseFrames[hi] * frac;

        // Write phase into bins around the harmonic frequency
        const targetBin = Math.round(harm.frequency * frameSize / sampleRate);
        const spread = 3;
        const bLo = Math.max(0, targetBin - spread * 2);
        const bHi = Math.min(halfN - 1, targetBin + spread * 2);
        for (let b = bLo; b <= bHi; b++) {
          ph[b] = framePhase;
        }
      }
    } else {
      // Fallback: random phase initialization
      for (let i = 0; i < halfN; i++) {
        ph[i] = Math.random() * 2 * Math.PI;
      }
    }

    prevPhase.push(ph);
  }

  // Build Hann synthesis window
  const hann = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));
  }

  // Griffin-Lim iterations
  for (let iter = 0; iter < iterations; iter++) {
    // Reconstruct time-domain signal from current magnitude + phase estimate
    const recon = new Float32Array(output.length);
    const windowSum = new Float32Array(output.length);

    for (let f = 0; f < numFrames; f++) {
      const frameStart = f * hopSize;

      // Create complex spectrum: target magnitude with current phase estimate
      const specReal = new Float32Array(frameSize);
      const specImag = new Float32Array(frameSize);

      for (let i = 0; i < halfN; i++) {
        specReal[i] = targetMag[f][i] * Math.cos(prevPhase[f][i]);
        specImag[i] = targetMag[f][i] * Math.sin(prevPhase[f][i]);
      }
      // Mirror for negative frequencies (conjugate symmetry for real signal)
      for (let i = halfN; i < frameSize; i++) {
        specReal[i] = specReal[frameSize - i];
        specImag[i] = -specImag[frameSize - i];
      }

      // Inverse FFT to get time-domain frame
      const timeFrame = ifft(specReal, specImag);

      // Overlap-add with synthesis window
      for (let i = 0; i < frameSize && frameStart + i < output.length; i++) {
        recon[frameStart + i] += timeFrame[i] * hann[i];
        windowSum[frameStart + i] += hann[i] * hann[i];
      }
    }

    // Normalize by window sum (COLA criterion)
    for (let i = 0; i < output.length; i++) {
      if (windowSum[i] > 0.001) recon[i] /= windowSum[i];
    }

    // If last iteration, copy to output and done
    if (iter === iterations - 1) {
      output.set(recon);
      break;
    }

    // Otherwise, re-analyze the reconstruction to update phase estimates
    for (let f = 0; f < numFrames; f++) {
      const frameStart = f * hopSize;

      // Extract windowed frame from reconstruction
      const frame = new Float32Array(frameSize);
      for (let i = 0; i < frameSize; i++) {
        const idx = frameStart + i;
        frame[i] = (idx < recon.length ? recon[idx] : 0) * hann[i];
      }

      // Forward FFT
      const { real: rR, imag: rI } = fft(frame);

      // Update phase from this reconstruction (keep only positive frequencies)
      for (let i = 0; i < halfN; i++) {
        prevPhase[f][i] = Math.atan2(rI[i], rR[i]);
      }
    }
  }
}

/**
 * Overlap-add synthesis using per-frame harmonic parameters.
 * Reconstructs the signal STFT-frame-by-frame, naturally capturing
 * vibrato and time-varying spectra.
 */
function synthesizeOverlapAdd(
  output: Float32Array,
  analysis: AnalysisResult,
  sampleRate: number,
  limit: number,
): void {
  const harmonics = analysis.harmonics;
  const numHarmonics = Math.min(limit, harmonics.length);

  // Derive STFT parameters from analysis
  const frameSize = analysis.frameSize || 2048;
  const hopSize = analysis.hopSize || frameSize >> 2; // 75% overlap
  const numFrames = Math.max(1, Math.floor((output.length - frameSize) / hopSize) + 1);

  // Build a Hann synthesis window
  const synthWindow = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    synthWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));
  }

  // For each STFT frame, generate a chunk and overlap-add it
  for (let f = 0; f < numFrames; f++) {
    const frameStart = f * hopSize;
    const frameEnd = Math.min(frameStart + frameSize, output.length);
    const actualFrameSize = frameEnd - frameStart;

    for (let h = 0; h < numHarmonics; h++) {
      const harm = harmonics[h];
      const freq = harm.frequency;
      const baseAmp = harm.amplitude;

      // Get envelope value for this frame (interpolated)
      const envAmp = harm.envelope && harm.envelope.length > 0
        ? interpEnvelope(harm.envelope, frameStart, output.length)
        : 1.0;

      const amp = baseAmp * envAmp;
      if (amp < 0.001) continue; // skip very quiet harmonics

      const omega = 2 * Math.PI * freq / sampleRate;
      // Use continuous phase: accumulate from frame position
      const startPhase = harm.phase + omega * frameStart;

      for (let i = 0; i < actualFrameSize; i++) {
        output[frameStart + i] += amp * synthWindow[i] * Math.cos(startPhase + omega * i);
      }
    }
  }

  // Normalize by the sum of squared windows (COLA criterion for Hann at 75% overlap)
  // For Hann at 75% overlap, the sum of squared windows is approximately 1.5
  // We need to divide by this to maintain correct amplitude
  const windowSum = new Float32Array(output.length);
  for (let f = 0; f < numFrames; f++) {
    const frameStart = f * hopSize;
    const frameEnd = Math.min(frameStart + frameSize, output.length);
    for (let i = 0; i < frameEnd - frameStart; i++) {
      windowSum[frameStart + i] += synthWindow[i] * synthWindow[i];
    }
  }
  for (let i = 0; i < output.length; i++) {
    if (windowSum[i] > 0.001) output[i] /= windowSum[i];
  }
}

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
export function normalise(buffer: Float32Array): void {
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
