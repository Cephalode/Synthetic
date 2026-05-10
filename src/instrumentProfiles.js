/**
 * Instrument profiles for wavetable / additive synthesis.
 *
 * Each profile defines:
 *   - id / name / category        — metadata
 *   - real / imag                  — harmonic amplitudes & phases for PeriodicWave (wavetable mode)
 *   - harmonics[]                  — per-harmonic amplitude envelopes for additive mode
 *                                     { amplitude, attack, decay, sustain, release }
 *   - noise                        — noise layer config (null if none)
 *                                     { type, frequency, Q, attack, decay, sustain, release, gain }
 *   - envelope                     — global ADSR fallback defaults
 */

// ─── Helper ────────────────────────────────────────────────────────────────────
// Build `real` array from an amplitude map so the data is easy to read above.
// Web Audio PeriodicWave: real[0]=DC offset (0), real[n]=cos coefficient for harmonic n
// We keep imag = all zeros (sine phase) which is the standard approach.
function buildRealImag(amplitudes, phases) {
  const len = amplitudes.length
  const real = new Array(len).fill(0)
  const imag = new Array(len).fill(0)
  for (let i = 1; i < len; i++) {
    real[i] = amplitudes[i] || 0
    imag[i] = phases ? (phases[i] || 0) : 0
  }
  return { real, imag }
}

// ─── 1. Trumpet ─────────────────────────────────────────────────────────────────
// Bright brass: strong low harmonics with gradual roll-off, formant emphasis ~3rd-5th
const TrumpetProfile = {
  id: 'trumpet',
  name: 'Trumpet',
  category: 'brass',

  // Harmonic amplitudes for PeriodicWave (indices = harmonic number, 0 = DC)
  // Strong fundamental, relatively bright with odd-weighted content
  ...buildRealImag(
    [0, 1.0, 0.7, 0.55, 0.4, 0.35, 0.25, 0.18, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.005],
    null
  ),

  harmonics: [
    // harmonic 1 (fundamental)
    { amplitude: 1.0,  attack: 0.012, decay: 0.08, sustain: 0.75, release: 0.15 },
    // harmonic 2
    { amplitude: 0.70, attack: 0.008, decay: 0.06, sustain: 0.70, release: 0.12 },
    // harmonic 3 — formant emphasis region
    { amplitude: 0.55, attack: 0.010, decay: 0.07, sustain: 0.65, release: 0.14 },
    // harmonic 4
    { amplitude: 0.40, attack: 0.008, decay: 0.05, sustain: 0.55, release: 0.12 },
    // harmonic 5
    { amplitude: 0.35, attack: 0.008, decay: 0.05, sustain: 0.50, release: 0.10 },
    // harmonic 6
    { amplitude: 0.25, attack: 0.006, decay: 0.04, sustain: 0.40, release: 0.09 },
    // harmonic 7
    { amplitude: 0.18, attack: 0.006, decay: 0.04, sustain: 0.35, release: 0.08 },
    // harmonic 8
    { amplitude: 0.12, attack: 0.005, decay: 0.03, sustain: 0.25, release: 0.07 },
    // harmonic 9
    { amplitude: 0.08, attack: 0.005, decay: 0.03, sustain: 0.20, release: 0.06 },
    // harmonic 10
    { amplitude: 0.05, attack: 0.004, decay: 0.02, sustain: 0.15, release: 0.05 },
    // 11-12 (brightness)
    { amplitude: 0.03, attack: 0.004, decay: 0.02, sustain: 0.10, release: 0.05 },
    { amplitude: 0.02, attack: 0.003, decay: 0.02, sustain: 0.08, release: 0.04 },
  ],

  noise: {
    type: 'bandpass',    // BiquadFilter type
    frequency: 2800,     // bright bark / formant region
    Q: 1.5,
    attack: 0.008,
    decay: 0.04,
    sustain: 0.12,
    release: 0.06,
    gain: 0.15,
  },

  envelope: { attack: 0.012, decay: 0.08, sustain: 0.75, release: 0.15 },
}

// ─── 2. Flute ───────────────────────────────────────────────────────────────────
// Fundamental dominant, weak 2nd & 3rd, breathy noise
const FluteProfile = {
  id: 'flute',
  name: 'Flute',
  category: 'woodwind',

  ...buildRealImag(
    [0, 1.0, 0.05, 0.03, 0.015, 0.01, 0.005, 0.003, 0.002],
    null
  ),

  harmonics: [
    { amplitude: 1.0,  attack: 0.04,  decay: 0.10, sustain: 0.85, release: 0.25 },
    { amplitude: 0.05, attack: 0.05,  decay: 0.08, sustain: 0.60, release: 0.20 },
    { amplitude: 0.03, attack: 0.06,  decay: 0.08, sustain: 0.50, release: 0.18 },
    { amplitude: 0.015,attack: 0.07,  decay: 0.06, sustain: 0.40, release: 0.15 },
    { amplitude: 0.01, attack: 0.08,  decay: 0.05, sustain: 0.30, release: 0.12 },
    { amplitude: 0.005,attack: 0.09,  decay: 0.04, sustain: 0.20, release: 0.10 },
  ],

  noise: {
    type: 'bandpass',
    frequency: 4000,     // breathy air noise
    Q: 0.6,
    attack: 0.06,
    decay: 0.10,
    sustain: 0.35,
    release: 0.20,
    gain: 0.12,
  },

  envelope: { attack: 0.04, decay: 0.10, sustain: 0.85, release: 0.25 },
}

// ─── 3. Clarinet ────────────────────────────────────────────────────────────────
// Odd harmonics dominant (1, 3, 5, 7), warm body, reedy noise
const ClarinetProfile = {
  id: 'clarinet',
  name: 'Clarinet',
  category: 'woodwind',

  // Odd harmonics only (1, 3, 5, 7, 9 ...) — signature clarinet timbre
  ...buildRealImag(
    [0, 1.0, 0.0, 0.55, 0.0, 0.35, 0.0, 0.22, 0.0, 0.12, 0.0, 0.06, 0.0, 0.03, 0.0, 0.015],
    null
  ),

  harmonics: [
    // 1 — fundamental (strong)
    { amplitude: 1.0,  attack: 0.018, decay: 0.08, sustain: 0.80, release: 0.18 },
    // 2 — suppressed
    { amplitude: 0.0,  attack: 0.02,  decay: 0.06, sustain: 0.50, release: 0.15 },
    // 3 — strong odd harmonic
    { amplitude: 0.55, attack: 0.015, decay: 0.07, sustain: 0.70, release: 0.16 },
    // 4 — suppressed
    { amplitude: 0.0,  attack: 0.02,  decay: 0.06, sustain: 0.40, release: 0.14 },
    // 5
    { amplitude: 0.35, attack: 0.014, decay: 0.06, sustain: 0.60, release: 0.14 },
    // 6
    { amplitude: 0.0,  attack: 0.02,  decay: 0.05, sustain: 0.35, release: 0.12 },
    // 7
    { amplitude: 0.22, attack: 0.012, decay: 0.05, sustain: 0.50, release: 0.12 },
    // 8
    { amplitude: 0.0,  attack: 0.02,  decay: 0.04, sustain: 0.30, release: 0.10 },
    // 9
    { amplitude: 0.12, attack: 0.010, decay: 0.04, sustain: 0.40, release: 0.10 },
    // 10
    { amplitude: 0.0,  attack: 0.02,  decay: 0.03, sustain: 0.25, release: 0.08 },
    // 11
    { amplitude: 0.06, attack: 0.008, decay: 0.03, sustain: 0.30, release: 0.08 },
    // 12
    { amplitude: 0.0,  attack: 0.015, decay: 0.03, sustain: 0.20, release: 0.06 },
  ],

  noise: {
    type: 'bandpass',
    frequency: 1800,     // reedy quality
    Q: 2.0,
    attack: 0.012,
    decay: 0.05,
    sustain: 0.18,
    release: 0.10,
    gain: 0.10,
  },

  envelope: { attack: 0.018, decay: 0.08, sustain: 0.80, release: 0.18 },
}

// ─── 4. Violin ──────────────────────────────────────────────────────────────────
// Rich spectrum all harmonics, slow bowed attack, no noise but slight vibrato
const ViolinProfile = {
  id: 'violin',
  name: 'Violin',
  category: 'strings',

  // All harmonics present, gradually decreasing — sawtooth-like but warmer
  ...buildRealImag(
    [0, 1.0, 0.8, 0.6, 0.45, 0.35, 0.25, 0.20, 0.15, 0.12, 0.09, 0.07, 0.05, 0.04, 0.03, 0.02],
    null
  ),

  harmonics: [
    { amplitude: 1.0,  attack: 0.12,  decay: 0.15, sustain: 0.80, release: 0.30 },
    { amplitude: 0.80, attack: 0.10,  decay: 0.12, sustain: 0.75, release: 0.28 },
    { amplitude: 0.60, attack: 0.09,  decay: 0.11, sustain: 0.70, release: 0.26 },
    { amplitude: 0.45, attack: 0.08,  decay: 0.10, sustain: 0.65, release: 0.24 },
    { amplitude: 0.35, attack: 0.08,  decay: 0.09, sustain: 0.60, release: 0.22 },
    { amplitude: 0.25, attack: 0.07,  decay: 0.08, sustain: 0.55, release: 0.20 },
    { amplitude: 0.20, attack: 0.06,  decay: 0.07, sustain: 0.50, release: 0.18 },
    { amplitude: 0.15, attack: 0.06,  decay: 0.06, sustain: 0.45, release: 0.16 },
    { amplitude: 0.12, attack: 0.05,  decay: 0.06, sustain: 0.40, release: 0.14 },
    { amplitude: 0.09, attack: 0.05,  decay: 0.05, sustain: 0.35, release: 0.12 },
    { amplitude: 0.07, attack: 0.04,  decay: 0.04, sustain: 0.30, release: 0.10 },
    { amplitude: 0.05, attack: 0.04,  decay: 0.04, sustain: 0.25, release: 0.09 },
    { amplitude: 0.04, attack: 0.03,  decay: 0.03, sustain: 0.20, release: 0.08 },
    { amplitude: 0.03, attack: 0.03,  decay: 0.03, sustain: 0.18, release: 0.07 },
    { amplitude: 0.02, attack: 0.03,  decay: 0.02, sustain: 0.15, release: 0.06 },
  ],

  noise: null,  // No noise — bowed string is deterministic

  // Vibrato is handled by the engine when it detects this profile
  vibrato: { rate: 5.5, depth: 4 }, // Hz, cents

  envelope: { attack: 0.12, decay: 0.15, sustain: 0.80, release: 0.30 },
}

// ─── 5. Organ ───────────────────────────────────────────────────────────────────
// Drawbar-style additive (1,2,3,4,6,8), no noise, instant attack
const OrganProfile = {
  id: 'organ',
  name: 'Organ',
  category: 'keyboard',

  // Drawbar registration: 16' + 8' + 4' + 2 2/3' + 2' + 1 1/3' + 1'
  // Harmonics: 1(fund), 2, 3, 4, 6, 8
  ...buildRealImag(
    [0, 0.8, 0.6, 0.4, 0.25, 0.0, 0.18, 0.0, 0.12, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    null
  ),

  harmonics: [
    // 1 — 8' drawbar (fundamental)
    { amplitude: 0.80, attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
    // 2 — 4' drawbar
    { amplitude: 0.60, attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
    // 3 — 2 2/3' drawbar
    { amplitude: 0.40, attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
    // 4 — 2' drawbar
    { amplitude: 0.25, attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
    // 5 — not used in this registration
    { amplitude: 0.0,  attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
    // 6 — 1 1/3' drawbar
    { amplitude: 0.18, attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
    // 7 — not used
    { amplitude: 0.0,  attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
    // 8 — 1' drawbar
    { amplitude: 0.12, attack: 0.002, decay: 0.01, sustain: 1.0,  release: 0.02 },
  ],

  noise: null,

  envelope: { attack: 0.002, decay: 0.01, sustain: 1.0, release: 0.02 },
}

// ─── 6. Electric Bass ───────────────────────────────────────────────────────────
// Strong fundamental + 2nd, muted attack noise, deep
const ElectricBassProfile = {
  id: 'electric-bass',
  name: 'Electric Bass',
  category: 'bass',

  ...buildRealImag(
    [0, 1.0, 0.65, 0.15, 0.08, 0.04, 0.02, 0.01],
    null
  ),

  harmonics: [
    // 1 — deep fundamental
    { amplitude: 1.0,  attack: 0.005, decay: 0.20, sustain: 0.55, release: 0.15 },
    // 2 — strong 2nd harmonic (pluck character)
    { amplitude: 0.65, attack: 0.003, decay: 0.25, sustain: 0.40, release: 0.12 },
    // 3
    { amplitude: 0.15, attack: 0.003, decay: 0.18, sustain: 0.25, release: 0.10 },
    // 4
    { amplitude: 0.08, attack: 0.002, decay: 0.15, sustain: 0.15, release: 0.08 },
    // 5
    { amplitude: 0.04, attack: 0.002, decay: 0.12, sustain: 0.10, release: 0.06 },
    // 6
    { amplitude: 0.02, attack: 0.002, decay: 0.10, sustain: 0.08, release: 0.05 },
    // 7
    { amplitude: 0.01, attack: 0.001, decay: 0.08, sustain: 0.05, release: 0.04 },
  ],

  noise: {
    type: 'lowpass',
    frequency: 800,      // thumpy muted attack
    Q: 0.8,
    attack: 0.002,
    decay: 0.08,
    sustain: 0.02,
    release: 0.04,
    gain: 0.25,
  },

  envelope: { attack: 0.005, decay: 0.20, sustain: 0.55, release: 0.15 },
}

// ─── 7. Brass Section ───────────────────────────────────────────────────────────
// Thick trumpet-like with more harmonics + slight detune spread for chorus effect
const BrassSectionProfile = {
  id: 'brass-section',
  name: 'Brass Section',
  category: 'brass',

  ...buildRealImag(
    [0, 1.0, 0.75, 0.65, 0.50, 0.40, 0.30, 0.25, 0.20, 0.15, 0.12, 0.09, 0.07, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01],
    null
  ),

  harmonics: [
    { amplitude: 1.0,  attack: 0.015, decay: 0.08, sustain: 0.75, release: 0.18 },
    { amplitude: 0.75, attack: 0.012, decay: 0.07, sustain: 0.70, release: 0.16 },
    { amplitude: 0.65, attack: 0.012, decay: 0.06, sustain: 0.65, release: 0.15 },
    { amplitude: 0.50, attack: 0.010, decay: 0.05, sustain: 0.58, release: 0.14 },
    { amplitude: 0.40, attack: 0.010, decay: 0.05, sustain: 0.52, release: 0.13 },
    { amplitude: 0.30, attack: 0.008, decay: 0.04, sustain: 0.45, release: 0.12 },
    { amplitude: 0.25, attack: 0.008, decay: 0.04, sustain: 0.40, release: 0.11 },
    { amplitude: 0.20, attack: 0.007, decay: 0.03, sustain: 0.35, release: 0.10 },
    { amplitude: 0.15, attack: 0.006, decay: 0.03, sustain: 0.30, release: 0.09 },
    { amplitude: 0.12, attack: 0.005, decay: 0.02, sustain: 0.25, release: 0.08 },
    { amplitude: 0.09, attack: 0.005, decay: 0.02, sustain: 0.20, release: 0.07 },
    { amplitude: 0.07, attack: 0.004, decay: 0.02, sustain: 0.18, release: 0.06 },
    { amplitude: 0.05, attack: 0.004, decay: 0.02, sustain: 0.15, release: 0.05 },
    { amplitude: 0.04, attack: 0.003, decay: 0.01, sustain: 0.12, release: 0.05 },
    { amplitude: 0.03, attack: 0.003, decay: 0.01, sustain: 0.10, release: 0.04 },
    { amplitude: 0.02, attack: 0.003, decay: 0.01, sustain: 0.08, release: 0.04 },
    { amplitude: 0.015,attack: 0.002, decay: 0.01, sustain: 0.06, release: 0.03 },
    { amplitude: 0.01, attack: 0.002, decay: 0.01, sustain: 0.05, release: 0.03 },
  ],

  noise: {
    type: 'bandpass',
    frequency: 2200,
    Q: 1.2,
    attack: 0.010,
    decay: 0.04,
    sustain: 0.15,
    release: 0.08,
    gain: 0.10,
  },

  // Detune spread for chorus/section effect — engine uses this to create
  // multiple slightly-detuned copies
  detune: { voices: 3, spread: 8 }, // 3 voices, ±8 cents spread

  envelope: { attack: 0.015, decay: 0.08, sustain: 0.75, release: 0.18 },
}

// ─── 8. Synth Pad ───────────────────────────────────────────────────────────────
// Slow attack, rich harmonics, no noise, evolving sustain
const SynthPadProfile = {
  id: 'synth-pad',
  name: 'Synth Pad',
  category: 'synth',

  ...buildRealImag(
    [0, 1.0, 0.6, 0.4, 0.35, 0.25, 0.20, 0.15, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04, 0.03, 0.025, 0.02],
    null
  ),

  harmonics: [
    { amplitude: 1.0,  attack: 0.50,  decay: 0.30, sustain: 0.70, release: 0.80 },
    { amplitude: 0.60, attack: 0.55,  decay: 0.35, sustain: 0.65, release: 0.85 },
    { amplitude: 0.40, attack: 0.60,  decay: 0.35, sustain: 0.60, release: 0.90 },
    { amplitude: 0.35, attack: 0.65,  decay: 0.40, sustain: 0.55, release: 0.90 },
    { amplitude: 0.25, attack: 0.70,  decay: 0.40, sustain: 0.50, release: 0.95 },
    { amplitude: 0.20, attack: 0.75,  decay: 0.45, sustain: 0.45, release: 1.0 },
    { amplitude: 0.15, attack: 0.80,  decay: 0.45, sustain: 0.40, release: 1.0 },
    { amplitude: 0.12, attack: 0.85,  decay: 0.50, sustain: 0.38, release: 1.0 },
    { amplitude: 0.10, attack: 0.90,  decay: 0.50, sustain: 0.35, release: 1.1 },
    { amplitude: 0.08, attack: 0.95,  decay: 0.55, sustain: 0.30, release: 1.1 },
    { amplitude: 0.06, attack: 1.0,   decay: 0.55, sustain: 0.28, release: 1.2 },
    { amplitude: 0.05, attack: 1.0,   decay: 0.60, sustain: 0.25, release: 1.2 },
    { amplitude: 0.04, attack: 1.1,   decay: 0.60, sustain: 0.22, release: 1.3 },
    { amplitude: 0.03, attack: 1.1,   decay: 0.65, sustain: 0.20, release: 1.3 },
    { amplitude: 0.025,attack: 1.2,   decay: 0.65, sustain: 0.18, release: 1.4 },
    { amplitude: 0.02, attack: 1.2,   decay: 0.70, sustain: 0.15, release: 1.4 },
  ],

  noise: null,

  envelope: { attack: 0.50, decay: 0.30, sustain: 0.70, release: 0.80 },
}

// ─── Export ──────────────────────────────────────────────────────────────────────
const instrumentProfiles = [
  TrumpetProfile,
  FluteProfile,
  ClarinetProfile,
  ViolinProfile,
  OrganProfile,
  ElectricBassProfile,
  BrassSectionProfile,
  SynthPadProfile,
]

export default instrumentProfiles

export {
  TrumpetProfile,
  FluteProfile,
  ClarinetProfile,
  ViolinProfile,
  OrganProfile,
  ElectricBassProfile,
  BrassSectionProfile,
  SynthPadProfile,
}
