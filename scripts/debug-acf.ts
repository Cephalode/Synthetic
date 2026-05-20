// Debug ACF for piano
import * as fs from 'fs';

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

    // Replicate ACF logic
    const sampleRate = 44100;
    const segLen = Math.min(data.length, Math.floor(sampleRate * 0.1));
    const minLag = Math.max(1, Math.floor(sampleRate / 5000));
    const maxLag = Math.min(Math.floor(sampleRate / 20), segLen >> 1);
    
    console.log('segLen:', segLen, 'minLag:', minLag, 'maxLag:', maxLag);
    
    let bestLag = minLag;
    let bestCorr = -Infinity;
    const acf = new Float32Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < segLen - lag; i++) {
        sum += data[i] * data[i + lag];
      }
      acf[lag] = sum;
      if (sum > bestCorr) {
        bestCorr = sum;
        bestLag = lag;
      }
    }
    
    // Parabolic interpolation
    let freq = sampleRate / bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
      const y1 = acf[bestLag - 1];
      const y2 = acf[bestLag];
      const y3 = acf[bestLag + 1];
      const denom = 2 * (2 * y2 - y1 - y3);
      if (Math.abs(denom) > 1e-10) {
        const delta = (y3 - y1) / denom;
        if (Math.abs(delta) < 1) {
          freq = sampleRate / (bestLag + delta);
        }
      }
    }
    
    console.log('ACF bestLag:', bestLag, '=> freq:', freq.toFixed(2), 'Hz');
    console.log('Expected: ~261.63 Hz (lag ~168)');
    console.log('ACF at lag 168:', acf[168].toFixed(6));
    console.log('ACF at lag 169:', acf[169].toFixed(6));
    
    // Show top 5 lags
    const lags = [];
    for (let l = minLag; l <= maxLag; l++) lags.push({ lag: l, corr: acf[l] });
    lags.sort((a, b) => b.corr - a.corr);
    console.log('\nTop 10 ACF lags:');
    for (let i = 0; i < 10; i++) {
      const f = sampleRate / lags[i].lag;
      console.log(`  lag ${lags[i].lag} = ${f.toFixed(1)} Hz  corr=${lags[i].corr.toFixed(6)}`);
    }
    break;
  }
  offset += 8 + sz;
}
