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
  const magOrig = magnitudeSpectrum(original);
  const magRecon = magnitudeSpectrum(alignedRecon);

  // Pad shorter spectrum to match
  const specLen = Math.max(magOrig.length, magRecon.length);
  const mO = new Float32Array(specLen);
  const mR = new Float32Array(specLen);
  mO.set(magOrig);
  mR.set(magRecon);

  // Cosine similarity: cos(θ) = (A·B) / (||A|| ||B||)
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < specLen; i++) {
    dotProduct += mO[i] * mR[i];
    normA += mO[i] * mO[i];
    normB += mR[i] * mR[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  const cosineSimilarity = denom > 0 ? dotProduct / denom : 0;

  // Spectral centroid distance
  const fftSizeOrig = (magOrig.length - 1) * 2;
  const fftSizeRecon = (magRecon.length - 1) * 2;
  const centroidOrig = computeSpectralCentroid(magOrig, sampleRate, fftSizeOrig);
  const centroidRecon = computeSpectralCentroid(magRecon, sampleRate, fftSizeRecon);
  const spectralCentroidDistance = Math.abs(centroidOrig - centroidRecon);

  return {
    mse,
    cosineSimilarity,
    spectralCentroidDistance,
    rmsError,
    alignmentShift: shift,
  };
}
