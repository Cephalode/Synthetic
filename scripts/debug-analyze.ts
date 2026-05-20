import * as fs from 'fs';
import { fft, magnitude } from '../src/engine/fft';
import { analyzeSample } from '../src/engine/analyzer';

// Read piano sample
const buf = fs.readFileSync('public/samples/piano-c4.wav');
let offset = 12;
while (offset < buf.length - 8) {
  const id = buf.toString('ascii', offset, offset + 4);
  const sz = buf.readUInt32LE(offset + 4);
  if (id === 'data') {
    const start = offset + 8;
    const samples = sz / 2;
    const data = new Float32Array(samples);
    for (let i = 0; i < samples; i++) data[i] = buf.readInt16LE(start + i * 2) / 32768;

    const result = analyzeSample(data, 44100, 64);
    console.log('Fundamental:', result.fundamentalFreq.toFixed(2), 'Hz');
    console.log('Harmonics:', result.harmonics.length);
    console.log('Top 5 harmonics:');
    for (let i = 0; i < Math.min(5, result.harmonics.length); i++) {
      const h = result.harmonics[i];
      console.log(`  ${i+1}: freq=${h.frequency.toFixed(1)}Hz amp=${h.amplitude.toFixed(4)} phase=${h.phase.toFixed(4)}`);
    }
    console.log('Residual energy:', result.residualAnalysis?.energy.toFixed(4));
    console.log('Residual center freq:', result.residualAnalysis?.centerFreq.toFixed(1));
    break;
  }
  offset += 8 + sz;
}
