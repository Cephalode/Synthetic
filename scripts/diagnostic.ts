// Deep diagnostic: analyze why specific samples score poorly
import * as fs from 'fs';
import { analyzeSample } from '../src/engine/analyzer';
import { synthesize } from '../src/engine/fourier-synth';
import { computeSimilarity } from '../src/engine/similarity';
import { fft, magnitude } from '../src/engine/fft';

function readWavMono(filePath: string): Float32Array {
  const buf = fs.readFileSync(filePath);
  let offset = 12;
  while (offset < buf.length - 8) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === 'data') {
      const start = offset + 8;
      const samples = chunkSize / 2;
      const data = new Float32Array(samples);
      for (let i = 0; i < samples; i++) data[i] = buf.readInt16LE(start + i * 2) / 32768;
      return data;
    }
    offset += 8 + chunkSize;
  }
  throw new Error('No data chunk');
}

const samples = ['trumpet-c4', 'oboe-c4', 'flute-c4', 'piano-c4', 'organ-c4', 'guitar-c4'];

for (const name of samples) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`INSTRUMENT: ${name}`);
  console.log('='.repeat(60));
  
  const data = readWavMono(`public/samples/${name}.wav`);
  const sr = 44100;
  const dur = data.length / sr;
  
  // Original stats
  let origRms = 0, origPeak = 0;
  for (let i = 0; i < data.length; i++) {
    origRms += data[i] * data[i];
    if (Math.abs(data[i]) > origPeak) origPeak = Math.abs(data[i]);
  }
  origRms = Math.sqrt(origRms / data.length);
  console.log(`Original: ${data.length} samples, ${dur.toFixed(2)}s, RMS=${origRms.toFixed(4)}, peak=${origPeak.toFixed(4)}`);
  
  // Analysis
  const analysis = analyzeSample(data, sr, 64);
  console.log(`Fundamental: ${analysis.fundamentalFreq.toFixed(2)} Hz`);
  console.log(`Harmonics: ${analysis.harmonics.length}`);
  
  // Show top harmonics
  for (let i = 0; i < Math.min(8, analysis.harmonics.length); i++) {
    const h = analysis.harmonics[i];
    console.log(`  H${i+1}: ${h.frequency.toFixed(1)}Hz amp=${h.amplitude.toFixed(4)}`);
  }
  
  // Residual
  console.log(`Residual: energy=${analysis.residualAnalysis?.energy.toFixed(4)}, centerFreq=${analysis.residualAnalysis?.centerFreq.toFixed(0)}Hz`);
  
  // Synthesize
  const recon = synthesize(analysis, sr, dur, 'additive', 64);
  let reconRms = 0, reconPeak = 0;
  for (let i = 0; i < recon.length; i++) {
    reconRms += recon[i] * recon[i];
    if (Math.abs(recon[i]) > reconPeak) reconPeak = Math.abs(recon[i]);
  }
  reconRms = Math.sqrt(reconRms / recon.length);
  console.log(`Recon: ${recon.length} samples, RMS=${reconRms.toFixed(4)}, peak=${reconPeak.toFixed(4)}`);
  
  // Similarity
  const sim = computeSimilarity(data, recon, sr);
  console.log(`CosSim: ${(sim.cosineSimilarity * 100).toFixed(2)}%, MSE: ${sim.mse.toExponential(3)}, Align: ${sim.alignmentShift}`);
  
  // Check spectrum match at key frequencies
  const origSpec = magnitude(...fft(data).real ? [fft(data).real, fft(data).imag] as any : [new Float32Array(0), new Float32Array(0)]);
  // Simple spectral comparison at harmonic frequencies
  const { real: oR, imag: oI } = fft(data);
  const { real: rR, imag: rI } = fft(recon);
  const oMag = magnitude(oR, oI);
  const rMag = magnitude(rR, rI);
  const N = oR.length;
  
  // Energy in first 100 bins
  let origLow = 0, reconLow = 0, origMid = 0, reconMid = 0, origHigh = 0, reconHigh = 0;
  const bin100 = Math.min(100, N >> 1);
  const bin1000 = Math.min(1000, N >> 1);
  for (let i = 0; i < bin100; i++) { origLow += oMag[i]; reconLow += rMag[i]; }
  for (let i = bin100; i < bin1000; i++) { origMid += oMag[i]; reconMid += rMag[i]; }
  for (let i = bin1000; i < (N >> 1); i++) { origHigh += oMag[i]; reconHigh += rMag[i]; }
  
  console.log(`Spectral energy: Low(0-100) O=${origLow.toFixed(0)} R=${reconLow.toFixed(0)} (${((reconLow/origLow)*100).toFixed(0)}%) | Mid(100-1k) O=${origMid.toFixed(0)} R=${reconMid.toFixed(0)} (${((reconMid/origMid)*100).toFixed(0)}%) | High(1k+) O=${origHigh.toFixed(0)} R=${reconHigh.toFixed(0)} (${((reconHigh/origHigh)*100).toFixed(0)}%)`);
}
