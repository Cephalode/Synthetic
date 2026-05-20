/**
 * Radix-2 Cooley-Tukey FFT implementation (in-place, decimation-in-time).
 *
 * All public functions accept / return Float32Array for zero-copy
 * interop with Web Audio API buffers.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the smallest power of two ≥ n. */
function nextPowerOfTwo(n: number): number {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Bit-reversal permutation.
 * Rearranges `re` and `im` in-place so that index i is swapped with
 * the index whose binary representation is the reverse of i.
 */
function bitReversePermute(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      // swap real
      const tmpR = re[i];
      re[i] = re[j];
      re[j] = tmpR;
      // swap imag
      const tmpI = im[i];
      im[i] = im[j];
      im[j] = tmpI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the forward FFT of a real-valued input signal.
 *
 * The input is automatically zero-padded to the next power of two.
 *
 * @param input  Real-valued time-domain samples.
 * @returns An object with `real` and `imag` Float32Arrays of length N
 *          (the power-of-two size used internally).
 */
export function fft(input: Float32Array): { real: Float32Array; imag: Float32Array } {
  const N = nextPowerOfTwo(input.length);
  const re = new Float32Array(N);
  const im = new Float32Array(N);

  // Copy input (zero-padding is implicit – Float32Array is initialised to 0)
  for (let i = 0; i < input.length; i++) {
    re[i] = input[i];
  }

  // Bit-reversal permutation
  bitReversePermute(re, im);

  // Butterfly stages
  for (let size = 2; size <= N; size <<= 1) {
    const halfSize = size >> 1;
    const angleStep = -2 * Math.PI / size;
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);

        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;

        const tR = wr * re[oddIdx] - wi * im[oddIdx];
        const tI = wr * im[oddIdx] + wi * re[oddIdx];

        re[oddIdx] = re[evenIdx] - tR;
        im[oddIdx] = im[evenIdx] - tI;

        re[evenIdx] = re[evenIdx] + tR;
        im[evenIdx] = im[evenIdx] + tI;
      }
    }
  }

  return { real: re, imag: im };
}

/**
 * Compute the inverse FFT.
 *
 * Uses the conjugate trick: IFFT(X) = conj(FFT(conj(X))) / N.
 *
 * @param real  Real part of the frequency-domain input.
 * @param imag  Imaginary part of the frequency-domain input.
 * @returns Real-valued time-domain samples (Float32Array).
 */
export function ifft(real: Float32Array, imag: Float32Array): Float32Array {
  const N = real.length;
  if (N === 0) return new Float32Array(0);

  // Conjugate the input
  const conjIm = new Float32Array(N);
  for (let i = 0; i < N; i++) conjIm[i] = -imag[i];

  // Forward FFT on the conjugated input
  const { real: resR } = fftFromArrays(real, conjIm);

  // Conjugate and scale
  const output = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    output[i] = resR[i] / N;
  }
  return output;
}

/**
 * Internal helper: FFT that takes pre-allocated real/imag arrays
 * (avoids the padding + copy path of the public `fft`).
 */
function fftFromArrays(re: Float32Array, im: Float32Array): {
  real: Float32Array;
  imag: Float32Array;
} {
  const N = re.length;

  // Bit-reversal
  bitReversePermute(re, im);

  // Butterfly stages
  for (let size = 2; size <= N; size <<= 1) {
    const halfSize = size >> 1;
    const angleStep = -2 * Math.PI / size;
    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);

        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;

        const tR = wr * re[oddIdx] - wi * im[oddIdx];
        const tI = wr * im[oddIdx] + wi * re[oddIdx];

        re[oddIdx] = re[evenIdx] - tR;
        im[oddIdx] = im[evenIdx] - tI;

        re[evenIdx] = re[evenIdx] + tR;
        im[evenIdx] = im[evenIdx] + tI;
      }
    }
  }

  return { real: re, imag: im };
}

/**
 * Compute the magnitude spectrum from complex FFT output.
 *
 * @param real  Real part of FFT bins.
 * @param imag  Imaginary part of FFT bins.
 * @returns Float32Array where each element = sqrt(re² + im²).
 */
export function magnitude(real: Float32Array, imag: Float32Array): Float32Array {
  const len = real.length;
  const mag = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return mag;
}

/**
 * Compute the phase spectrum from complex FFT output.
 *
 * @param real  Real part of FFT bins.
 * @param imag  Imaginary part of FFT bins.
 * @returns Float32Array where each element = atan2(im, re).
 */
export function phase(real: Float32Array, imag: Float32Array): Float32Array {
  const len = real.length;
  const ph = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    ph[i] = Math.atan2(imag[i], real[i]);
  }
  return ph;
}
