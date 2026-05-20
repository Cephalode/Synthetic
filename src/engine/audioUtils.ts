/**
 * Audio utility functions – file decoding and test-sample generation.
 *
 * All test samples are synthesised purely with math (no Web Audio API
 * at generation time) so they work in Node.js tests as well.
 */

import type { TestSample } from '../types';

// ---------------------------------------------------------------------------
// File decoding
// ---------------------------------------------------------------------------

/**
 * Decode an audio file (wav, mp3, ogg, …) into mono Float32 PCM.
 *
 * Uses the browser's built-in decoders via OfflineAudioContext.
 *
 * @param file An audio File selected by the user.
 * @returns A plain object with `audioData` (Float32Array) and `sampleRate`.
 */
export async function decodeAudioFile(
  file: File,
): Promise<{ audioData: Float32Array; sampleRate: number }> {
  const arrayBuffer = await file.arrayBuffer();

  // OfflineAudioContext is sufficient for decoding; 1 channel, dummy rate.
  const offlineCtx = new OfflineAudioContext(1, 1, 44100);
  const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

  // Down-mix to mono if necessary
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
// Test-sample generation
// ---------------------------------------------------------------------------

/** Standard concert pitch A4. */
const A4 = 440;
/** Middle C (C4). */
const C4 = 261.63;

/**
 * Return an array of five standard test samples, each producing
 * 2 seconds of audio at the given sample rate (default 44 100 Hz).
 */
export function generateTestSamples(): TestSample[] {
  return [
    // 1. Pure Sine 440 Hz
    {
      name: 'Pure Sine 440Hz',
      generate(sampleRate: number, duration: number): Float32Array {
        const numSamples = Math.floor(sampleRate * duration);
        const data = new Float32Array(numSamples);
        const omega = 2 * Math.PI * A4;
        for (let n = 0; n < numSamples; n++) {
          data[n] = Math.sin(omega * n / sampleRate);
        }
        return data;
      },
    },

    // 2. Square 220 Hz (band-limited via additive synthesis up to 20 harmonics)
    {
      name: 'Square 220Hz',
      generate(sampleRate: number, duration: number): Float32Array {
        const numSamples = Math.floor(sampleRate * duration);
        const data = new Float32Array(numSamples);
        const freq = 220;
        // Square wave Fourier series: 4/π Σ sin((2k−1)ωt)/(2k−1)
        const maxK = 20;
        for (let n = 0; n < numSamples; n++) {
          let sample = 0;
          for (let k = 1; k <= maxK; k++) {
            const harmonic = 2 * k - 1; // odd harmonics only
            const harmonicFreq = freq * harmonic;
            if (harmonicFreq >= sampleRate / 2) break;
            sample += Math.sin(2 * Math.PI * harmonicFreq * n / sampleRate) / harmonic;
          }
          data[n] = (4 / Math.PI) * sample;
        }
        // Normalise
        normalise(data);
        return data;
      },
    },

    // 3. Sawtooth 330 Hz (band-limited additive synthesis)
    {
      name: 'Sawtooth 330Hz',
      generate(sampleRate: number, duration: number): Float32Array {
        const numSamples = Math.floor(sampleRate * duration);
        const data = new Float32Array(numSamples);
        const freq = 330;
        // Sawtooth Fourier series: 2/π Σ (−1)^(k+1) sin(kωt)/k
        for (let n = 0; n < numSamples; n++) {
          let sample = 0;
          for (let k = 1; k <= 30; k++) {
            const harmonicFreq = freq * k;
            if (harmonicFreq >= sampleRate / 2) break;
            const sign = (k + 1) % 2 === 0 ? 1 : -1;
            sample += sign * Math.sin(2 * Math.PI * harmonicFreq * n / sampleRate) / k;
          }
          data[n] = (2 / Math.PI) * sample;
        }
        normalise(data);
        return data;
      },
    },

    // 4. Complex tone: C4 (261.63 Hz) + first 6 harmonics with decreasing amp
    {
      name: 'Complex Tone (C4 + harmonics)',
      generate(sampleRate: number, duration: number): Float32Array {
        const numSamples = Math.floor(sampleRate * duration);
        const data = new Float32Array(numSamples);
        const freq = C4;
        const harmonics = [
          { ratio: 1, amp: 1.0 },
          { ratio: 2, amp: 0.6 },
          { ratio: 3, amp: 0.4 },
          { ratio: 4, amp: 0.25 },
          { ratio: 5, amp: 0.15 },
          { ratio: 6, amp: 0.08 },
        ];
        for (let n = 0; n < numSamples; n++) {
          let sample = 0;
          for (const h of harmonics) {
            const f = freq * h.ratio;
            if (f >= sampleRate / 2) break;
            sample += h.amp * Math.sin(2 * Math.PI * f * n / sampleRate);
          }
          data[n] = sample;
        }
        normalise(data);
        return data;
      },
    },

    // 5. Bell-like tone (inharmonic partials)
    {
      name: 'Bell-like (inharmonic partials)',
      generate(sampleRate: number, duration: number): Float32Array {
        const numSamples = Math.floor(sampleRate * duration);
        const data = new Float32Array(numSamples);
        // Bell partials are approximately: 0.5, 1, 1.2, 1.5, 2.0, 2.5, 3.0
        // relative to a nominal fundamental.
        const fundamental = 220;
        const partials = [
          { ratio: 0.5, amp: 0.6, decay: 3.0 },
          { ratio: 1.0, amp: 1.0, decay: 2.5 },
          { ratio: 1.2, amp: 0.7, decay: 2.0 },
          { ratio: 1.5, amp: 0.5, decay: 1.8 },
          { ratio: 2.0, amp: 0.35, decay: 1.2 },
          { ratio: 2.5, amp: 0.2, decay: 0.8 },
          { ratio: 3.0, amp: 0.15, decay: 0.5 },
        ];

        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          let sample = 0;
          for (const p of partials) {
            const freq = fundamental * p.ratio;
            if (freq >= sampleRate / 2) continue;
            // Exponential decay envelope
            const envelope = Math.exp(-p.decay * t);
            sample += p.amp * envelope * Math.sin(2 * Math.PI * freq * t);
          }
          data[n] = sample;
        }
        normalise(data);
        return data;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** In-place peak normalisation to [−1, 1]. */
function normalise(buffer: Float32Array): void {
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0) {
    const scale = 1 / peak;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] *= scale;
    }
  }
}
