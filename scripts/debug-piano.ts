import * as fs from 'fs';
import { fft, magnitude } from '../src/engine/fft';

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

    const { real, imag } = fft(data);
    const mag = magnitude(real, imag);
    const N = real.length;
    const halfN = N >> 1;

    const bins: { bin: number; mag: number; freq: number }[] = [];
    for (let i = 1; i < halfN; i++) bins.push({ bin: i, mag: mag[i], freq: i * 44100 / N });
    bins.sort((a, b) => b.mag - a.mag);
    console.log('FFT size:', N);
    console.log('Top 15 magnitude bins:');
    for (let i = 0; i < 15; i++) {
      console.log(`  bin ${bins[i].bin} = ${bins[i].freq.toFixed(1)} Hz  mag=${bins[i].mag.toFixed(4)}`);
    }

    // Also check magnitude at 261Hz (expected fundamental)
    const expectedBin = Math.round(261.63 * N / 44100);
    console.log(`\nExpected fundamental bin (261.63Hz): ${expectedBin}, mag=${mag[expectedBin].toFixed(4)}`);
    console.log(`Bin at 5512.5Hz: ${Math.round(5512.5 * N / 44100)}, mag=${mag[Math.round(5512.5 * N / 44100)].toFixed(4)}`);
    break;
  }
  offset += 8 + sz;
}
