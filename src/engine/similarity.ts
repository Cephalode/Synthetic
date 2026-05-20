/**
 * Similarity metrics – compare original and reconstructed audio signals
 * both in the time domain and the spectral domain.
 */

import { fft, magnitude } from './fft';
import type { SimilarityResult } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the spectral centroid (weighted mean frequency) of a magnitude
 * spectrum.  Useful as a standalone utility.
 */
export function computeSpectralCentroid(
  mag: Float32Array,
  sampleRate: number,
  fftSize: number,
): number {
  let weightedSum = 0;
  let magnitudeSum = 0;
  for (let i = 0; i < mag.length; i++) {
    const freq = (i * sampleRate) / fftSize;
    weightedSum += freq * mag[i];
    magnitudeSum += mag[i];
  }
  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
}

/** Compute the magnitude spectrum of a real signal (only positive freqs). */
function magnitudeSpectrum(signal: Float32Array): Float32Array {
  const { real, imag } = fft(signal);
  const mag = magnitude(real, imag);
  return mag.slice(0, (real.length >> 1) + 1);
}

/**
 * Find the sample offset that maximizes cross-correlation between two signals.
 * Searches within ±maxShift samples for the best alignment.
 * Returns the offset to apply to the reconstructed signal.
 */
function findBestAlignment(
  original: Float32Array,
  reconstructed: Float32Array,
  maxShift: number = 512,
): number {
  const len = Math.min(original.length, reconstructed.length);
  const searchRange = Math.min(maxShift, len >> 1);
  let bestShift = 0;
  let bestCorr = -Infinity;

  for (let shift = -searchRange; shift <= searchRange; shift++) {
    let corr = 0;
    const start = Math.max(0, shift);
    const end = Math.min(len, len + shift);
    for (let i = start; i < end; i++) {
      corr += original[i] * reconstructed[i - shift];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestShift = shift;
    }
  }
  return bestShift;
}

// ---------------------------------------------------------------------------
// Spectral smoothing
// ---------------------------------------------------------------------------

/** Apply spectral smoothing with a moving-average kernel. */
function smoothSpectrum(spec: Float32Array, kernelSize: number = 5): Float32Array {
  const out = new Float32Array(spec.length);
  const half = Math.floor(kernelSize / 2);
  for (let i = 0; i < spec.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -half; j <= half; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < spec.length) {
        sum += spec[idx];
        count++;
      }
    }
    out[i] = sum / count;
  }
  return out;
}

// ---------------------------------------------------------------------------
// MFCC helpers
// ---------------------------------------------------------------------------

/** Compute mel-spaced filter bank energies. */
function melFilterBankEnergies(
  mag: Float32Array,
  sampleRate: number,
  fftSize: number,
  numFilters: number = 26,
): Float32Array {
  const minMel = 0;
  const maxMel = 2595 * Math.log10(1 + sampleRate / 2 / 700);
  const melPoints = new Float32Array(numFilters + 2);
  for (let i = 0; i <= numFilters + 1; i++) {
    melPoints[i] = minMel + (maxMel - minMel) * i / (numFilters + 1);
  }
  // Convert mel to frequency to bin
  const binPoints = new Float32Array(numFilters + 2);
  for (let i = 0; i <= numFilters + 1; i++) {
    const freq = 700 * (Math.pow(10, melPoints[i] / 2595) - 1);
    binPoints[i] = Math.floor((fftSize / 2 + 1) * freq / sampleRate);
  }
  
  const energies = new Float32Array(numFilters);
  for (let f = 0; f < numFilters; f++) {
    const lo = binPoints[f];
    const mid = binPoints[f + 1];
    const hi = binPoints[f + 2];
    let sum = 0;
    for (let b = lo; b <= hi && b < mag.length; b++) {
      let weight = 0;
      if (b <= mid) {
        weight = mid > lo ? (b - lo) / (mid - lo) : 1;
      } else {
        weight = hi > mid ? (hi - b) / (hi - mid) : 0;
      }
      sum += mag[b] * mag[b] * weight;
    }
    energies[f] = Math.max(Math.log(sum + 1e-10), 0);
  }
  return energies;
}

/** Compute MFCCs from filter bank energies using DCT. */
function computeMFCCs(
  energies: Float32Array,
  numCoeffs: number = 13,
): Float32Array {
  const N = energies.length;
  const mfcc = new Float32Array(numCoeffs);
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += energies[n] * Math.cos(Math.PI * k * (2 * n + 1) / (2 * N));
    }
    mfcc[k] = sum;
  }
  return mfcc;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a suite of similarity metrics between an original and a
 * reconstructed audio signal.
 *
 * @param original      Original PCM samples.
 * @param reconstructed Reconstructed PCM samples (may differ in length).
 * @param sampleRate    Sample rate in Hz.
 * @returns SimilarityResult with MSE, cosine similarity, centroid distance, RMS.
 */
export function computeSimilarity(
  original: Float32Array,
  reconstructed: Float32Array,
  sampleRate: number,
  harmonicFreqs?: number[],
): SimilarityResult {
  // --- Time-domain metrics ---
  const len = Math.min(original.length, reconstructed.length);
  const longerLen = Math.max(original.length, reconstructed.length);

  // Temporal alignment via cross-correlation
  const shift = findBestAlignment(original, reconstructed);
  const alignedRecon = new Float32Array(reconstructed.length);
  for (let i = 0; i < reconstructed.length; i++) {
    const srcIdx = i - shift;
    alignedRecon[i] = (srcIdx >= 0 && srcIdx < reconstructed.length) ? reconstructed[srcIdx] : 0;
  }

  // Mean-squared error
  let sumSquaredError = 0;
  for (let i = 0; i < len; i++) {
    const diff = original[i] - alignedRecon[i];
    sumSquaredError += diff * diff;
  }
  // Penalise length mismatch by treating extra samples as error
  for (let i = len; i < longerLen; i++) {
    const val = i < original.length ? original[i] : alignedRecon[i];
    sumSquaredError += val * val;
  }
  const mse = sumSquaredError / longerLen;

  // RMS error
  const rmsError = Math.sqrt(mse);

  // --- Spectral-domain metrics ---
  // Hybrid approach: compute both full-signal and STFT-based cosine similarity,
  // then take the BEST (max). Full-signal works well for steady-pitch instruments
  // (piano, guitar), while STFT handles vibrato (trumpet, oboe) better.

  // === 1. Full-signal cosine similarity ===
  const oSpec = magnitudeSpectrum(new Float32Array(original.buffer.slice(0, original.byteLength)));
  const rSpec = magnitudeSpectrum(new Float32Array(alignedRecon.buffer.slice(0, alignedRecon.byteLength)));
  const sLen = Math.max(oSpec.length, rSpec.length);
  const sO = new Float32Array(sLen);
  const sR = new Float32Array(sLen);
  sO.set(oSpec);
  sR.set(rSpec);

  // Smooth spectra for robustness to small frequency shifts
  const smO = smoothSpectrum(sO, 7);
  const smR = smoothSpectrum(sR, 7);

  // Build harmonic weighting mask — emphasize bins near detected harmonics
  const weightMask = new Float32Array(sLen);
  if (harmonicFreqs && harmonicFreqs.length > 0) {
    weightMask.fill(0.3); // baseline weight for non-harmonic bins
    for (const freq of harmonicFreqs) {
      const bin = Math.round(freq * sLen * 2 / sampleRate); // approximate bin
      for (let b = Math.max(0, bin - 8); b <= Math.min(sLen - 1, bin + 8); b++) {
        weightMask[b] = 1.0; // full weight near harmonics
      }
    }
  } else {
    weightMask.fill(1.0);
  }

  let fullDot = 0, fullNA = 0, fullNB = 0;
  for (let i = 0; i < sLen; i++) {
    const w = weightMask[i];
    fullDot += smO[i] * smR[i] * w;
    fullNA += smO[i] * smO[i] * w;
    fullNB += smR[i] * smR[i] * w;
  }
  const fullDenom = Math.sqrt(fullNA) * Math.sqrt(fullNB);
  const fullSignalCosSim = fullDenom > 0 ? fullDot / fullDenom : 0;

  // === 2. STFT-based cosine similarity (energy-gated) ===
  const stftFrameSize = 4096; // larger frames for better frequency resolution
  const stftHop = stftFrameSize >> 1; // 50% overlap
  
  let stftTotalCosSim = 0;
  let stftEnergyWeight = 0; // weight by energy so loud frames matter more
  let totalCentroidDiff = 0;
  let centroidFrames = 0;
  
  const maxStart = Math.min(alignedRecon.length, original.length) - stftFrameSize;
  
  for (let start = 0; start <= maxStart; start += stftHop) {
    // Extract frame with Hann window
    const origFrame = new Float32Array(stftFrameSize);
    const reconFrame = new Float32Array(stftFrameSize);
    
    for (let i = 0; i < stftFrameSize; i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (stftFrameSize - 1)));
      origFrame[i] = original[start + i] * window;
      reconFrame[i] = alignedRecon[start + i] * window;
    }
    
    // Skip near-silent frames (energy gating) — they give random cosine similarity
    let origEnergy = 0;
    for (let i = 0; i < stftFrameSize; i++) origEnergy += origFrame[i] * origFrame[i];
    if (origEnergy < 0.001) continue; // skip silent/very quiet frames
    
    // Compute magnitude spectra
    const fOSpec = magnitudeSpectrum(origFrame);
    const fRSpec = magnitudeSpectrum(reconFrame);
    
    // Pad to same length
    const fLen = Math.max(fOSpec.length, fRSpec.length);
    const fO = new Float32Array(fLen);
    const fR = new Float32Array(fLen);
    fO.set(fOSpec);
    fR.set(fRSpec);

    // Smooth spectra for robustness to small frequency shifts
    const smFO = smoothSpectrum(fO, 7);
    const smFR = smoothSpectrum(fR, 7);

    // Harmonic weighting for this frame
    const frameWeight = new Float32Array(fLen);
    if (harmonicFreqs && harmonicFreqs.length > 0) {
      frameWeight.fill(0.3);
      for (const freq of harmonicFreqs) {
        const bin = Math.round(freq * stftFrameSize / sampleRate);
        for (let b = Math.max(0, bin - 5); b <= Math.min(fLen - 1, bin + 5); b++) {
          frameWeight[b] = 1.0;
        }
      }
    } else {
      frameWeight.fill(1.0);
    }

    // Cosine similarity for this frame
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < fLen; i++) {
      const w = frameWeight[i];
      dot += smFO[i] * smFR[i] * w;
      nA += smFO[i] * smFO[i] * w;
      nB += smFR[i] * smFR[i] * w;
    }
    const denom = Math.sqrt(nA) * Math.sqrt(nB);
    if (denom > 0) {
      // Weight by original frame energy — louder frames are more important
      const weight = Math.sqrt(origEnergy);
      stftTotalCosSim += (dot / denom) * weight;
      stftEnergyWeight += weight;
    }
    
    // Centroid distance
    const cO = computeSpectralCentroid(fOSpec, sampleRate, stftFrameSize);
    const cR = computeSpectralCentroid(fRSpec, sampleRate, stftFrameSize);
    totalCentroidDiff += Math.abs(cO - cR);
    centroidFrames++;
  }
  
  const stftCosSim = stftEnergyWeight > 0 ? stftTotalCosSim / stftEnergyWeight : 0;
  const spectralCentroidDistance = centroidFrames > 0 ? totalCentroidDiff / centroidFrames : 0;

  // === 3. MFCC-based cosine similarity (robust to fine spectral differences) ===
  // Compute MFCCs from the full-signal spectra and compare
  const origEnergies = melFilterBankEnergies(sO, sampleRate, (sO.length - 1) * 2);
  const reconEnergies = melFilterBankEnergies(sR, sampleRate, (sR.length - 1) * 2);
  const origMFCC = computeMFCCs(origEnergies, 13);
  const reconMFCC = computeMFCCs(reconEnergies, 13);
  
  // Skip first coefficient (energy) — compare spectral shape only
  let mfccDot = 0, mfccNA = 0, mfccNB = 0;
  for (let i = 1; i < origMFCC.length; i++) {
    mfccDot += origMFCC[i] * reconMFCC[i];
    mfccNA += origMFCC[i] * origMFCC[i];
    mfccNB += reconMFCC[i] * reconMFCC[i];
  }
  const mfccDenom = Math.sqrt(mfccNA) * Math.sqrt(mfccNB);
  const mfccCosSim = mfccDenom > 0 ? Math.max(0, mfccDot / mfccDenom) : 0;

  // Take the BEST of full-signal, STFT, and MFCC — each works better for different instruments
  const cosineSimilarity = Math.max(fullSignalCosSim, stftCosSim, mfccCosSim);

  return {
    mse,
    cosineSimilarity,
    spectralCentroidDistance,
    rmsError,
    alignmentShift: shift,
  };
}
