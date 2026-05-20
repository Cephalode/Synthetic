/**
 * Automated accuracy benchmark for the Fourier synth pipeline.
 *
 * Loads instrument samples from URLs, runs the full
 * analyze → synthesize → computeSimilarity pipeline on each one,
 * and returns structured results for the benchmark UI.
 */

import { analyzeSample } from './analyzer';
import { synthesize } from './fourier-synth';
import { computeSimilarity } from './similarity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single sample entry in the benchmark suite. */
export interface BenchmarkSample {
  name: string;
  url: string;
  category: string;
}

/** Per-sample benchmark result. */
export interface BenchmarkResult {
  name: string;
  category: string;
  fundamentalFreq: number;
  harmonicCount: number;
  cosineSimilarity: number;
  mse: number;
  spectralLoss: number;
  temporalOffset: number;
  error?: string;
}

/** Progress callback receives (completed, total). */
export type ProgressCallback = (completed: number, total: number) => void;

// ---------------------------------------------------------------------------
// Sample list
// ---------------------------------------------------------------------------

export const SAMPLES: BenchmarkSample[] = [
  { name: 'Piano C4', url: '/samples/piano-c4.wav', category: 'keyboard' },
  { name: 'Violin C4', url: '/samples/violin-c4.wav', category: 'strings' },
  { name: 'Cello C4', url: '/samples/cello-c4.wav', category: 'strings' },
  { name: 'Flute C4', url: '/samples/flute-c4.wav', category: 'woodwind' },
  { name: 'Clarinet C4', url: '/samples/clarinet-c4.wav', category: 'woodwind' },
  { name: 'Oboe C4', url: '/samples/oboe-c4.wav', category: 'woodwind' },
  { name: 'Trumpet C4', url: '/samples/trumpet-c4.wav', category: 'brass' },
  { name: 'French Horn C4', url: '/samples/frenchhorn-c4.wav', category: 'brass' },
  { name: 'Saxophone C4', url: '/samples/saxophone-c4.wav', category: 'woodwind' },
  { name: 'Guitar C4', url: '/samples/guitar-c4.wav', category: 'strings' },
  { name: 'Organ C4', url: '/samples/organ-c4.wav', category: 'keyboard' },
  { name: 'Synth Pad C4', url: '/samples/synthpad-c4.wav', category: 'electronic' },
];

// ---------------------------------------------------------------------------
// Audio decoding from URL
// ---------------------------------------------------------------------------

/**
 * Fetch an audio file from a URL and decode it to mono Float32Array.
 *
 * Uses fetch() → ArrayBuffer → OfflineAudioContext.decodeAudioData(),
 * mirroring the decodeAudioFile pattern from audioUtils but accepting
 * a URL string instead of a File object.
 */
async function decodeAudioFromUrl(
  url: string,
): Promise<{ audioData: Float32Array; sampleRate: number }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // OfflineAudioContext is sufficient for decoding; 1 channel, dummy rate.
  const offlineCtx = new OfflineAudioContext(1, 1, 44100);
  const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  if (numChannels === 1) {
    return {
      audioData: audioBuffer.getChannelData(0),
      sampleRate,
    };
  }

  // Average all channels → mono
  const mono = new Float32Array(length);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i];
    }
  }
  const scale = 1 / numChannels;
  for (let i = 0; i < length; i++) {
    mono[i] *= scale;
  }

  return { audioData: mono, sampleRate };
}

// ---------------------------------------------------------------------------
// Single-sample benchmark
// ---------------------------------------------------------------------------

/**
 * Run the full pipeline on one instrument sample:
 *   analyzeSample → synthesize → computeSimilarity
 */
async function benchmarkSample(sample: BenchmarkSample): Promise<BenchmarkResult> {
  try {
    const { audioData, sampleRate } = await decodeAudioFromUrl(sample.url);
    const duration = audioData.length / sampleRate;
    const harmonicCount = 64;

    // Step 1: Analyse
    const analysis = analyzeSample(audioData, sampleRate, harmonicCount);

    // Step 2: Synthesize (additive mode with same harmonic count)
    const reconstructed = synthesize(analysis, sampleRate, duration, 'additive', harmonicCount);

    // Step 3: Compute similarity
    const similarity = computeSimilarity(audioData, reconstructed, sampleRate);

    return {
      name: sample.name,
      category: sample.category,
      fundamentalFreq: analysis.fundamentalFreq,
      harmonicCount: analysis.harmonics.length,
      cosineSimilarity: similarity.cosineSimilarity,
      mse: similarity.mse,
      spectralLoss: similarity.spectralCentroidDistance,
      temporalOffset: similarity.alignmentShift,
    };
  } catch (err) {
    return {
      name: sample.name,
      category: sample.category,
      fundamentalFreq: 0,
      harmonicCount: 0,
      cosineSimilarity: 0,
      mse: 1,
      spectralLoss: 0,
      temporalOffset: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Full benchmark runner
// ---------------------------------------------------------------------------

/**
 * Run the benchmark on ALL samples in parallel.
 *
 * @param onProgress Optional callback invoked each time a sample completes.
 * @returns Results sorted by cosineSimilarity ascending (worst first).
 */
export async function runBenchmark(
  onProgress?: ProgressCallback,
): Promise<BenchmarkResult[]> {
  const total = SAMPLES.length;
  let completed = 0;

  const tasks = SAMPLES.map(async (sample) => {
    const result = await benchmarkSample(sample);
    completed++;
    onProgress?.(completed, total);
    return result;
  });

  const results = await Promise.all(tasks);

  // Sort by cosineSimilarity ascending → worst first
  results.sort((a, b) => a.cosineSimilarity - b.cosineSimilarity);

  return results;
}
