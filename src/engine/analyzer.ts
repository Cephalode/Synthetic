/**
 * Spectrum analyser – takes raw PCM audio, runs an FFT, detects the
 * fundamental frequency and extracts harmonic peaks.
 *
 * Uses a **Short-Time Fourier Transform (STFT)** to extract per-frame
 * amplitude envelopes for each harmonic so the synthesiser can reproduce
 * the time-domain shape of the original sound (attack, decay, tremolo, …).
 */

import { fft, magnitude, phase } from './fft';
import type { AnalysisResult, HarmonicData } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the spectral centroid (weighted mean of frequencies).
 * Centroid = Σ(f_i · |X_i|) / Σ|X_i|
 */
export function computeSpectralCentroid(
  mag: Float32Array,
  sampleRate: number,
  fftSize: number,
): number {
  let weightedSum = 0;
  let magnitudeSum = 0;
  const usableBins = mag.length; // only positive frequencies

  for (let i = 0; i < usableBins; i++) {
    const freq = (i * sampleRate) / fftSize;
    weightedSum += freq * mag[i];
    magnitudeSum += mag[i];
  }

  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
}

/**
 * Parabolic interpolation around a peak bin for sub-bin frequency accuracy.
 * Returns an offset (in bins) to add to the integer peak index.
 */
function parabolicInterpolate(mag: Float32Array, peakIdx: number): number {
  if (peakIdx <= 0 || peakIdx >= mag.length - 1) return 0;
  const alpha = mag[peakIdx - 1];
  const beta = mag[peakIdx];
  const gamma = mag[peakIdx + 1];
  const denom = alpha - 2 * beta + gamma;
  if (Math.abs(denom) < 1e-12) return 0;
  return 0.5 * (alpha - gamma) / denom;
}

/**
 * Hann window applied to a frame in-place.
 */
function hannWindow(frame: Float32Array): void {
  const N = frame.length;
  for (let n = 0; n < N; n++) {
    frame[n] *= 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
  }
}

// ---------------------------------------------------------------------------
// STFT envelope extraction
// ---------------------------------------------------------------------------

/**
 * Run an STFT over the audio and return per-frame magnitudes for the
 * bins closest to each harmonic frequency, plus per-frame RMS energy.
 *
 * @returns An object with:
 *   - `envelopes`: array (one per harmonic) of per-frame amplitudes
 *   - `rms`: per-frame RMS energy of the signal (captures overall envelope)
 */
function extractSTFT(
  audioData: Float32Array,
  sampleRate: number,
  harmonicFreqs: number[],
  frameSize: number,
  hopSize: number,
): { envelopes: Float32Array[]; rms: Float32Array } {
  const numHarmonics = harmonicFreqs.length;
  const numFrames = Math.max(1, Math.floor((audioData.length - frameSize) / hopSize) + 1);
  const envelopes: Float32Array[] = [];
  const rms = new Float32Array(numFrames);
  const halfN = frameSize >> 1;
  const binResolution = sampleRate / frameSize;

  for (let h = 0; h < numHarmonics; h++) {
    envelopes.push(new Float32Array(numFrames));
  }

  const frame = new Float32Array(frameSize);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;

    // Copy frame + zero-pad if needed
    let frameSumSq = 0;
    for (let i = 0; i < frameSize; i++) {
      const val = offset + i < audioData.length ? audioData[offset + i] : 0;
      frame[i] = val;
      frameSumSq += val * val;
    }
    // RMS of this frame (before windowing for accurate energy)
    rms[f] = Math.sqrt(frameSumSq / frameSize);

    hannWindow(frame);

    const { real: fftRe, imag: fftIm } = fft(frame);
    const mag = magnitude(fftRe, fftIm);

    for (let h = 0; h < numHarmonics; h++) {
      const targetBin = Math.round(harmonicFreqs[h] / binResolution);

      // Search a wider window around the expected bin (±8 bins)
      const windowSize = 8;
      const lo = Math.max(1, targetBin - windowSize);
      const hi = Math.min(halfN, targetBin + windowSize);
      let bestAmp = 0;
      for (let b = lo; b <= hi; b++) {
        if (mag[b] > bestAmp) bestAmp = mag[b];
      }
      envelopes[h][f] = bestAmp;
    }
  }

  return { envelopes, rms };
}

// ---------------------------------------------------------------------------
// Fundamental detection helpers
// ---------------------------------------------------------------------------

/**
 * Autocorrelation-based pitch detection.
 * Returns fundamental frequency, or 0 if no clear pitch detected.
 */
function detectFundamentalACF(
  audioData: Float32Array,
  sampleRate: number,
  minFreq: number = 20,
  maxFreq: number = 5000,
): number {
  const segLen = Math.min(audioData.length, Math.floor(sampleRate * 0.1));
  if (segLen < 64) return 0;

  // Find the loudest segment (highest RMS) for better pitch detection
  const numSegments = Math.max(1, Math.floor((audioData.length - segLen) / (segLen >> 1)));
  let bestSegStart = 0;
  let bestRms = 0;
  for (let s = 0; s < numSegments; s++) {
    const start = s * (segLen >> 1);
    let rms = 0;
    for (let i = 0; i < segLen && start + i < audioData.length; i++) {
      rms += audioData[start + i] * audioData[start + i];
    }
    rms = Math.sqrt(rms / segLen);
    if (rms > bestRms) {
      bestRms = rms;
      bestSegStart = start;
    }
  }

  const seg = audioData.slice(bestSegStart, bestSegStart + segLen);

  const minLag = Math.max(1, Math.floor(sampleRate / maxFreq));
  const maxLag = Math.min(Math.floor(sampleRate / minFreq), segLen >> 1);

  let bestLag = minLag;
  let bestCorr = -Infinity;

  const acf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < seg.length - lag; i++) {
      sum += seg[i] * seg[i + lag];
    }
    acf[lag] = sum;
    if (sum > bestCorr) {
      bestCorr = sum;
      bestLag = lag;
    }
  }

  // Parabolic interpolation around best lag for sub-sample precision
  if (bestLag > minLag && bestLag < maxLag) {
    const y1 = acf[bestLag - 1];
    const y2 = acf[bestLag];
    const y3 = acf[bestLag + 1];
    const denom = 2 * (2 * y2 - y1 - y3);
    if (Math.abs(denom) > 1e-10) {
      const delta = (y3 - y1) / denom;
      if (Math.abs(delta) < 1) {
        return sampleRate / (bestLag + delta);
      }
    }
  }

  return sampleRate / bestLag;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse an audio signal and return its harmonic decomposition with
 * time-varying amplitude envelopes.
 *
 * @param audioData    Mono Float32 PCM samples in [-1, 1].
 * @param sampleRate   Sample rate in Hz.
 * @param maxHarmonics Maximum number of harmonics to extract (default 32).
 * @returns AnalysisResult with fundamental, harmonics, envelopes, spectra, centroid.
 */
export function analyzeSample(
  audioData: Float32Array,
  sampleRate: number,
  maxHarmonics: number = 64,
): AnalysisResult {
  const duration = audioData.length / sampleRate;

  // --- Full-signal FFT for overall spectrum display & peak detection ---
  const { real: fftReal, imag: fftImag } = fft(audioData);
  const N = fftReal.length;

  // Only the positive-frequency half is useful for real signals
  const halfN = N >> 1;
  const mag = magnitude(fftReal, fftImag);
  const ph = phase(fftReal, fftImag);

  const magHalf = mag.slice(0, halfN + 1);
  const phHalf = ph.slice(0, halfN + 1);

  // --- Fundamental detection ---
  // Strategy: simple spectral peak first, then validate/refine with ACF
  
  // 1. Find the loudest bin in the magnitude spectrum (simple peak detection)
  let peakBin = 2;
  let peakMag = 0;
  const minFundBin = Math.max(2, Math.floor(20 * N / sampleRate));
  const maxFundBin = Math.min(magHalf.length - 1, Math.floor(5000 * N / sampleRate));
  for (let b = minFundBin; b <= maxFundBin; b++) {
    if (magHalf[b] > peakMag) {
      peakMag = magHalf[b];
      peakBin = b;
    }
  }
  
  // 2. Check if the peak might be a harmonic — walk down to find a stronger
  //    candidate at a sub-harmonic frequency (e.g., if peak is at 2×fund)
  //    The true fundamental should have harmonics at integer multiples
  for (let divisor = 5; divisor >= 2; divisor--) {
    const candidateBin = Math.round(peakBin / divisor);
    if (candidateBin < minFundBin) continue;
    // Check if this candidate has harmonics at expected positions
    let harmonicEnergy = 0;
    let hasHarmonics = true;
    for (let h = 2; h <= 4; h++) {
      const hBin = candidateBin * h;
      if (hBin >= magHalf.length) break;
      const expectedMag = magHalf[candidateBin] / h; // rough decay
      if (magHalf[hBin] > expectedMag * 0.1) {
        harmonicEnergy += magHalf[hBin];
      } else {
        hasHarmonics = false;
        break;
      }
    }
    // If this candidate has harmonics AND its own magnitude is significant
    if (hasHarmonics && magHalf[candidateBin] > peakMag * 0.05) {
      peakBin = candidateBin;
      break;
    }
  }
  
  let fundamentalFreq = ((peakBin + parabolicInterpolate(magHalf, peakBin)) * sampleRate) / N;

  // 3. Validate with ACF — if it disagrees significantly, prefer ACF
  const acfFreq = detectFundamentalACF(audioData, sampleRate);
  if (acfFreq > 0) {
    const ratio = fundamentalFreq / acfFreq;
    // If the spectral peak and ACF disagree by more than 25%, prefer ACF
    // but only if ACF gives a reasonable frequency (20-5000 Hz)
    if (acfFreq >= 20 && acfFreq <= 5000 && (ratio < 0.8 || ratio > 1.25)) {
      fundamentalFreq = acfFreq;
      peakBin = Math.round(fundamentalFreq * N / sampleRate);
    }
  }

  // --- Harmonic extraction (full-signal FFT) ---
  const harmonics: HarmonicData[] = [];
  const binResolution = sampleRate / N;
  let maxAmplitude = 0;

  // First pass: collect raw harmonic amplitudes and frequencies
  const rawHarmonics: { freq: number; amp: number; phase: number }[] = [];
  for (let h = 1; h <= maxHarmonics; h++) {
    const targetFreq = fundamentalFreq * h;
    if (targetFreq > sampleRate / 2) break; // above Nyquist

    const targetBin = Math.round(targetFreq / binResolution);
    if (targetBin >= magHalf.length) break;

    // Search a small window around the expected bin (±5 bins) to catch
    // slight inharmonicity or spectral leakage
    let bestAmp = 0;
    let bestBin = targetBin;
    const windowSize = 5;
    const lo = Math.max(1, targetBin - windowSize);
    const hi = Math.min(magHalf.length - 1, targetBin + windowSize);
    for (let b = lo; b <= hi; b++) {
      if (magHalf[b] > bestAmp) {
        bestAmp = magHalf[b];
        bestBin = b;
      }
    }

    if (bestAmp > maxAmplitude) maxAmplitude = bestAmp;

    rawHarmonics.push({
      freq: bestBin * binResolution,
      amp: bestAmp,
      phase: phHalf[bestBin],
    });
  }

  // --- STFT envelope extraction ---
  // Choose frame size: aim for ~4096 samples (good freq resolution at 44.1kHz),
  // but at least 2048 and not longer than the signal.
  const stftFrameSize = Math.min(
    audioData.length,
    Math.max(2048, Math.min(8192, Math.pow(2, Math.round(Math.log(sampleRate * 0.093) / Math.LN2))))
  );
  // Round to next power of two for FFT
  let roundedFrameSize = 1;
  while (roundedFrameSize < stftFrameSize) roundedFrameSize <<= 1;
  const frameSize = Math.min(roundedFrameSize, audioData.length);
  const hopSize = Math.max(1, frameSize >> 2); // 75% overlap

  const harmonicFreqs = rawHarmonics.map(rh => rh.freq);
  const { envelopes, rms: rawRms } = extractSTFT(audioData, sampleRate, harmonicFreqs, frameSize, hopSize);

  // Normalise envelopes relative to the GLOBAL peak across all harmonics.
  // This preserves the relative amplitude balance between harmonics —
  // each harmonic's temporal shape is retained without distorting
  // inter-harmonic levels.
  let globalEnvPeak = 0;
  for (const env of envelopes) {
    for (let i = 0; i < env.length; i++) {
      if (env[i] > globalEnvPeak) globalEnvPeak = env[i];
    }
  }
  const envNorm = globalEnvPeak > 0 ? globalEnvPeak : 1;
  const normalisedEnvelopes: Float32Array[] = [];
  for (const env of envelopes) {
    const normed = new Float32Array(env.length);
    for (let i = 0; i < env.length; i++) {
      normed[i] = env[i] / envNorm;
    }
    normalisedEnvelopes.push(normed);
  }

  // Normalise RMS envelope so peak = 1.0
  let rmsPeak = 0;
  for (let i = 0; i < rawRms.length; i++) {
    if (rawRms[i] > rmsPeak) rmsPeak = rawRms[i];
  }
  const rmsEnvelope = new Float32Array(rawRms.length);
  if (rmsPeak > 0) {
    for (let i = 0; i < rawRms.length; i++) {
      rmsEnvelope[i] = rawRms[i] / rmsPeak;
    }
  }

  // Second pass: normalise amplitudes to [0, 1] and attach envelopes
  const normaliser = maxAmplitude > 0 ? maxAmplitude : 1;
  for (let i = 0; i < rawHarmonics.length; i++) {
    const rh = rawHarmonics[i];
    harmonics.push({
      frequency: rh.freq,
      amplitude: rh.amp / normaliser,
      phase: rh.phase,
      envelope: normalisedEnvelopes[i],
    });
  }

  // Remove harmonics with negligible amplitude (<0.3% of max)
  const filteredHarmonics = harmonics.filter(h => h.amplitude >= 0.003);
  harmonics.length = 0;
  harmonics.push(...filteredHarmonics);

  // --- Spectral centroid ---
  const spectralCentroid = computeSpectralCentroid(magHalf, sampleRate, N);

  const numFrames = normalisedEnvelopes.length > 0 ? normalisedEnvelopes[0].length : 0;

  // --- Residual analysis (noise layer) ---
  // Estimate residual energy by comparing harmonic energy vs total energy
  // in the magnitude spectrum. This avoids amplitude mismatch issues.
  let harmonicEnergy = 0;
  let totalEnergy = 0;
  for (let i = 1; i < magHalf.length; i++) {
    const e = magHalf[i] * magHalf[i];
    totalEnergy += e;
  }
  // Sum energy at detected harmonic frequencies — wide search to capture vibrato sidebands
  for (const h of rawHarmonics) {
    const targetBin = Math.round(h.freq / binResolution);
    // Wide search (±10 bins) to capture vibrato sidebands
    const lo = Math.max(1, targetBin - 10);
    const hi = Math.min(magHalf.length - 1, targetBin + 10);
    for (let b = lo; b <= hi; b++) {
      harmonicEnergy += magHalf[b] * magHalf[b];
    }
  }
  // Residual energy ratio = non-harmonic / total
  const rawEnergyRatio = totalEnergy > 0 ? Math.max(0, 1 - harmonicEnergy / totalEnergy) : 0;
  // Cap at reasonable range
  // Cap residual at 10% — vibrato sidebands inflate the non-harmonic energy estimate
  const energyRatio = Math.min(rawEnergyRatio, 0.1);

  // Compute residual spectral centroid from non-harmonic bins
  let resWeightedSum = 0;
  let resMagSum = 0;
  for (let i = 1; i < magHalf.length; i++) {
    // Skip bins near harmonics
    let nearHarmonic = false;
    for (const h of rawHarmonics) {
      const targetBin = Math.round(h.freq / binResolution);
      if (Math.abs(i - targetBin) <= 10) { nearHarmonic = true; break; }
    }
    if (nearHarmonic) continue;
    const freq = i * sampleRate / N;
    resWeightedSum += freq * magHalf[i];
    resMagSum += magHalf[i];
  }
  const resCentroid = resMagSum > 0 ? resWeightedSum / resMagSum : sampleRate / 4;

  // Create a simple constant residual envelope (could be improved with STFT analysis)
  const resEnvFrames = Math.max(1, Math.floor((audioData.length - frameSize) / hopSize) + 1);
  const residualEnvelope = new Float32Array(resEnvFrames);
  residualEnvelope.fill(1.0);

  const residualAnalysis = {
    energy: energyRatio,
    centerFreq: resCentroid,
    bandwidth: Math.min(resCentroid * 2, sampleRate / 4),
    envelope: residualEnvelope,
  };

  return {
    fundamentalFreq,
    harmonics,
    magnitudeSpectrum: magHalf,
    phaseSpectrum: phHalf,
    sampleRate,
    duration,
    spectralCentroid,
    numFrames,
    hopSize,
    frameSize,
    rmsEnvelope,
    residualAnalysis,
  };
}
