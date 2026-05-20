# Fourier Synth Accuracy Improvements Plan

## Task 1: Fix Fundamental Detection (analyzer.ts)
**File:** `src/engine/analyzer.ts`
**What:** Replace naive loudest-bin detection (lines 179-184) with HPS + autocorrelation fallback.

### Implementation:
Add two new functions BEFORE `analyzeSample()`:

```typescript
/** Harmonic Product Spectrum — compresses spectrum by down-sampling and multiplying.
 *  Peaks at the fundamental even when overtones are louder. */
function detectFundamentalHPS(
  magHalf: Float32Array,
  sampleRate: number,
  N: number,
  minFreq: number = 20,
  maxFreq: number = 5000,
  harmonics: number = 5,
): number {
  // Only search bins in [minFreq, maxFreq] range
  const minBin = Math.max(1, Math.floor(minFreq * N / sampleRate));
  const maxBin = Math.min(magHalf.length - 1, Math.floor(maxFreq * N / sampleRate));
  
  // Compute HPS: product of downsampled spectra
  let bestBin = minBin;
  let bestScore = -Infinity;
  for (let b = minBin; b <= maxBin; b++) {
    let product = magHalf[b];
    for (let d = 2; d <= harmonics; d++) {
      const idx = Math.floor(b / d);
      if (idx >= magHalf.length || idx < 1) { product = 0; break; }
      product *= magHalf[idx];
    }
    if (product > bestScore) {
      bestScore = product;
      bestBin = b;
    }
  }
  return bestBin;
}

/** Autocorrelation-based pitch detection — robust for periodic signals.
 *  Returns fundamental frequency, or 0 if no clear pitch. */
function detectFundamentalACF(
  audioData: Float32Array,
  sampleRate: number,
  minFreq: number = 20,
  maxFreq: number = 5000,
): number {
  // Use a segment of the audio (first 100ms or full signal)
  const segLen = Math.min(audioData.length, Math.floor(sampleRate * 0.1));
  if (segLen < 64) return 0;
  
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.min(Math.floor(sampleRate / minFreq), segLen >> 1);
  
  // Compute autocorrelation for lags in [minLag, maxLag]
  let bestLag = minLag;
  let bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < segLen - lag; i++) {
      sum += audioData[i] * audioData[i + lag];
    }
    if (sum > bestCorr) {
      bestCorr = sum;
      bestLag = lag;
    }
  }
  return sampleRate / bestLag;
}
```

Then in `analyzeSample()`, replace lines 179-184 with:
```typescript
// --- Fundamental detection (HPS primary, ACF fallback) ---
const minBin = Math.max(1, Math.floor(20 * N / sampleRate));
let peakBin = detectFundamentalHPS(magHalf, sampleRate, N);
let fundamentalFreq = ((peakBin + parabolicInterpolate(magHalf, peakBin)) * sampleRate) / N;

// Validate with autocorrelation — if HPS gives a wildly different answer, use ACF
const acfFreq = detectFundamentalACF(audioData, sampleRate);
if (acfFreq > 0) {
  // If HPS and ACF disagree by more than 20%, prefer ACF
  const ratio = fundamentalFreq / acfFreq;
  if (ratio < 0.8 || ratio > 1.25) {
    fundamentalFreq = acfFreq;
    peakBin = Math.round(fundamentalFreq * N / sampleRate);
  }
}
```

---

## Task 2: Fix Double Envelope Normalization (analyzer.ts + fourier-synth.ts)

### Problem:
In analyzer.ts lines 239-256, per-harmonic envelopes are normalized so each peak=1.0.
Then in fourier-synth.ts line 143, `applyRMSEnvelope` multiplies everything again.
The synthesis uses `amplitude * envAmp` where amplitude is already normalized relative to max harmonic.
The RMS envelope then distorts the relative harmonic balance.

### Fix in analyzer.ts:
Keep the raw envelopes (don't normalize per-harmonic peaks to 1.0). Instead, normalize all envelopes relative to the global max across ALL harmonics and frames. This preserves relative amplitude relationships.

Replace lines 243-256 with:
```typescript
// Find global peak across all envelopes (preserves relative balance)
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
```

### Fix in fourier-synth.ts:
Remove `applyRMSEnvelope` call (line 143). The per-harmonic envelopes already capture the temporal shape. The RMS envelope was double-shaping. Remove the function too (lines 236-242).

Also: In `synthesizeAdditive()`, the envelope interpolation maps sample index to frame index using `totalSamples`. It should use the actual STFT parameters. But since `interpEnvelope(envelope, n, totalSamples)` maps proportionally, this is approximately correct — leave as-is.

---

## Task 3: Bump Analyzer Max Harmonics 32 → 64 (analyzer.ts)

### Fix:
In `analyzeSample()` line 163, change default from 32 to 64:
```typescript
export function analyzeSample(
  audioData: Float32Array,
  sampleRate: number,
  maxHarmonics: number = 64,  // was 32
): AnalysisResult {
```

Also increase the STFT frame size cap for better high-frequency resolution:
Change line 226-233 to use 8192 instead of 4096:
```typescript
const stftFrameSize = Math.min(
  audioData.length,
  Math.max(2048, Math.min(8192, ...))
);
```

Also widen the harmonic search window from ±3 to ±5 bins for better inharmonicity capture (lines 132-133 and 204):
```typescript
const windowSize = 5; // was 3
```

---

## Task 4: Add Noise/Residual Layer (fourier-synth.ts + types.ts)

### Approach:
After additive synthesis, compute the residual (original minus reconstruction), extract its spectral characteristics (bandwidth, energy level), and add a shaped noise layer to the output.

### Add to types.ts AnalysisResult:
```typescript
/** Residual analysis — noise floor characteristics for non-harmonic content */
residualAnalysis?: {
  /** Overall energy of the residual (RMS), normalized 0-1 */
  energy: number;
  /** Spectral centroid of the residual in Hz */
  centroid: number;
  /** Bandwidth (Q factor for bandpass filter) */
  bandwidth: number;
  /** Center frequency for bandpass filter in Hz */
  centerFreq: number;
  /** Per-frame envelope of residual energy */
  envelope: Float32Array;
};
```

### Add to analyzer.ts (at end of analyzeSample, before return):
After harmonics are extracted and normalized, compute residual:
```typescript
// --- Residual analysis (noise layer) ---
// Quick offline synthesis of harmonic content only
const quickRecon = new Float32Array(audioData.length);
for (let n = 0; n < audioData.length; n++) {
  let s = 0;
  for (let h = 0; h < harmonics.length; h++) {
    s += harmonics[h].amplitude * Math.cos(2 * Math.PI * harmonics[h].frequency * n / sampleRate + harmonics[h].phase);
  }
  quickRecon[n] = s;
}

// Compute residual
const residual = new Float32Array(audioData.length);
let resEnergy = 0;
for (let n = 0; n < audioData.length; n++) {
  residual[n] = audioData[n] - quickRecon[n];
  resEnergy += residual[n] * residual[n];
}
resEnergy = Math.sqrt(resEnergy / audioData.length);

// Get residual spectral characteristics
let origEnergy = 0;
for (let n = 0; n < audioData.length; n++) origEnergy += audioData[n] * audioData[n];
origEnergy = Math.sqrt(origEnergy / audioData.length);

const { real: resRe, imag: resIm } = fft(residual);
const resMag = magnitude(resRe, resIm);
const resHalf = resMag.slice(0, (resRe.length >> 1) + 1);
const resCentroid = computeSpectralCentroid(resHalf, sampleRate, resRe.length);

// Residual envelope from STFT
const resEnvFrames = Math.max(1, Math.floor((audioData.length - frameSize) / hopSize) + 1);
const residualEnvelope = new Float32Array(resEnvFrames);
for (let f = 0; f < resEnvFrames; f++) {
  const offset = f * hopSize;
  let sum = 0;
  for (let i = 0; i < frameSize && offset + i < audioData.length; i++) {
    const r = residual[offset + i] || 0;
    sum += r * r;
  }
  residualEnvelope[f] = Math.sqrt(sum / frameSize);
}
// Normalize residual envelope
let resEnvPeak = 0;
for (let i = 0; i < residualEnvelope.length; i++) {
  if (residualEnvelope[i] > resEnvPeak) resEnvPeak = residualEnvelope[i];
}
if (resEnvPeak > 0) {
  for (let i = 0; i < residualEnvelope.length; i++) residualEnvelope[i] /= resEnvPeak;
}
```

### Add to fourier-synth.ts synthesize():
After the switch block and BEFORE normalise(), add noise synthesis:
```typescript
// Add noise/residual layer if available
if (analysis.residualAnalysis && analysis.residualAnalysis.energy > 0.001) {
  const res = analysis.residualAnalysis;
  const noiseBuffer = createWhiteNoise(numSamples);
  // Bandpass filter the noise (simple one-pole approximation)
  const bandwidth = Math.max(100, res.bandwidth);
  const q = res.centerFreq / bandwidth;
  // Simple biquad bandpass via direct Form II
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const w0 = 2 * Math.PI * res.centerFreq / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  
  for (let n = 0; n < numSamples; n++) {
    const x0 = noiseBuffer[n];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    
    // Apply residual envelope
    const envAmp = res.envelope.length > 0 ? interpEnvelope(res.envelope, n, numSamples) : 1;
    output[n] += res.energy * envAmp * y0;
  }
}
```

Add helper:
```typescript
function createWhiteNoise(length: number): Float32Array {
  const noise = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    noise[i] = Math.random() * 2 - 1;
  }
  return noise;
}
```

---

## Task 5: Temporal Alignment via Cross-Correlation (similarity.ts)

### Add before computeSimilarity's metrics:
```typescript
/** 
 * Find the time offset that maximizes cross-correlation between two signals.
 * Returns the offset (in samples) to shift `reconstructed` for best alignment.
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
```

Then in `computeSimilarity()`, after computing `len` and before MSE:
```typescript
// Align signals via cross-correlation
const shift = findBestAlignment(original, reconstructed);
const alignedRecon = new Float32Array(reconstructed.length);
for (let i = 0; i < reconstructed.length; i++) {
  alignedRecon[i] = (i - shift >= 0 && i - shift < reconstructed.length) 
    ? reconstructed[i - shift] : 0;
}
// Use alignedRecon instead of reconstructed for all subsequent metrics
```

Also add to SimilarityResult type in types.ts:
```typescript
/** Time alignment offset applied (samples) */
alignmentShift: number;
```

---

## Commit Strategy
Each task = one commit:
1. `fix: improve fundamental detection with HPS + autocorrelation`
2. `fix: remove double envelope normalization for accurate harmonic balance`
3. `improve: bump max harmonics to 64, widen search window`
4. `feat: add noise/residual layer for non-harmonic content`
5. `feat: add temporal alignment via cross-correlation to similarity metrics`
