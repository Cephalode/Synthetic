/**
 * Node.js benchmark — runs the full Fourier analysis pipeline on all
 * instrument samples and reports accuracy scores.
 *
 * Usage:  npx tsx scripts/benchmark.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// We need to import the TS modules directly
import { analyzeSample } from '../src/engine/analyzer';
import { synthesize } from '../src/engine/fourier-synth';
import { computeSimilarity } from '../src/engine/similarity';

// ---------------------------------------------------------------------------
// WAV decoder (simple PCM 16-bit mono)
// ---------------------------------------------------------------------------
function readWavMono(filePath: string): { data: Float32Array; sampleRate: number } {
  const buf = fs.readFileSync(filePath);

  // Parse RIFF header
  const riff = buf.toString('ascii', 0, 4);
  if (riff !== 'RIFF') throw new Error(`Not a WAV file: ${filePath}`);

  // Find 'fmt ' chunk
  let offset = 12;
  let audioFormat = 0;
  let numChannels = 1;
  let sampleRate = 44100;
  let bitsPerSample = 16;

  while (offset < buf.length - 8) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);

    if (chunkId === 'fmt ') {
      audioFormat = buf.readUInt16LE(offset + 8);
      numChannels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bitsPerSample = buf.readUInt16LE(offset + 22);
    }

    if (chunkId === 'data') {
      const dataStart = offset + 8;
      const dataEnd = dataStart + chunkSize;
      const samples = Math.floor(chunkSize / (bitsPerSample / 8) / numChannels);
      const floatData = new Float32Array(samples);

      if (bitsPerSample === 16) {
        for (let i = 0; i < samples; i++) {
          let val = 0;
          for (let ch = 0; ch < numChannels; ch++) {
            const idx = dataStart + (i * numChannels + ch) * 2;
            val += buf.readInt16LE(idx) / 32768;
          }
          floatData[i] = val / numChannels;
        }
      } else if (bitsPerSample === 24) {
        for (let i = 0; i < samples; i++) {
          let val = 0;
          for (let ch = 0; ch < numChannels; ch++) {
            const idx = dataStart + (i * numChannels + ch) * 3;
            val += ((buf[idx] | (buf[idx+1] << 8) | (buf[idx+2] << 16)) << 8 >> 8) / 8388608;
          }
          floatData[i] = val / numChannels;
        }
      }

      return { data: floatData, sampleRate };
    }

    offset += 8 + chunkSize;
  }

  throw new Error(`No data chunk found in WAV: ${filePath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const SAMPLES_DIR = path.resolve(import.meta.dirname, '../public/samples');

interface SampleResult {
  name: string;
  fundamental: number;
  harmonics: number;
  cosineSim: number;
  mse: number;
  spectralCentroidDist: number;
  alignmentShift: number;
  error?: string;
}

async function main() {
  const files = fs.readdirSync(SAMPLES_DIR)
    .filter(f => f.endsWith('.wav'))
    .sort();

  if (files.length === 0) {
    console.error('No WAV files found in', SAMPLES_DIR);
    process.exit(1);
  }

  console.log(`\n🎵 Fourier Synth Accuracy Benchmark`);
  console.log(`   ${files.length} samples in ${SAMPLES_DIR}\n`);
  console.log('─'.repeat(90));
  console.log(`${'Instrument'.padEnd(22)} ${'Fund'.padStart(8)} ${'Harm'.padStart(5)} ${'CosSim'.padStart(8)} ${'MSE'.padStart(10)} ${'Align'.padStart(6)}  Status`);
  console.log('─'.repeat(90));

  const results: SampleResult[] = [];

  for (const file of files) {
    const name = file.replace('.wav', '');
    try {
      const { data, sampleRate } = readWavMono(path.join(SAMPLES_DIR, file));
      const duration = data.length / sampleRate;

      // Full pipeline: analyze → synthesize → compare
      const analysis = analyzeSample(data, sampleRate, 64);
      const recon = synthesize(analysis, sampleRate, duration, 'griffinlim', 64);
      const harmFreqs = analysis.harmonics.map(h => h.frequency);
      const sim = computeSimilarity(data, recon, sampleRate, harmFreqs);

      const pass = sim.cosineSimilarity >= 0.95;
      const status = pass ? '✅ PASS' : '❌ FAIL';

      console.log(
        `${name.padEnd(22)} ${analysis.fundamentalFreq.toFixed(1).padStart(8)} ${String(analysis.harmonics.length).padStart(5)} ${sim.cosineSimilarity.toFixed(4).padStart(8)} ${sim.mse.toExponential(2).padStart(10)} ${String(sim.alignmentShift).padStart(6)}  ${status}`
      );

      results.push({
        name,
        fundamental: analysis.fundamentalFreq,
        harmonics: analysis.harmonics.length,
        cosineSim: sim.cosineSimilarity,
        mse: sim.mse,
        spectralCentroidDist: sim.spectralCentroidDistance,
        alignmentShift: sim.alignmentShift,
      });
    } catch (err: any) {
      console.log(`${name.padEnd(22)} ${'ERROR: ' + err.message}`);
      results.push({ name, fundamental: 0, harmonics: 0, cosineSim: 0, mse: 0, spectralCentroidDist: 0, alignmentShift: 0, error: err.message });
    }
  }

  console.log('─'.repeat(90));

  // Summary
  const valid = results.filter(r => !r.error);
  if (valid.length > 0) {
    const avg = valid.reduce((s, r) => s + r.cosineSim, 0) / valid.length;
    const passing = valid.filter(r => r.cosineSim >= 0.95).length;
    const failing = valid.filter(r => r.cosineSim < 0.95);

    console.log(`\n📊 Average Cosine Similarity: ${(avg * 100).toFixed(2)}%`);
    console.log(`   Passing (≥95%): ${passing}/${valid.length}`);

    if (failing.length > 0) {
      console.log(`\n❌ Failing samples (need improvement):`);
      failing.sort((a, b) => a.cosineSim - b.cosineSim);
      for (const f of failing) {
        console.log(`   ${f.name.padEnd(22)} ${(f.cosineSim * 100).toFixed(2)}%  (fund: ${f.fundamental.toFixed(1)}Hz, ${f.harmonics} harmonics)`);
      }
    }

    // Overall pass/fail
    if (failing.length === 0) {
      console.log(`\n🎉 ALL SAMPLES PASS ≥95% — GOAL COMPLETE!`);
    } else {
      console.log(`\n🎯 Need to improve ${failing.length} sample(s) to reach >95%`);
    }
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
