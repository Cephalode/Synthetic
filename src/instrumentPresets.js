/**
 * Instrument preset definitions for Synthetic synthesizer.
 * Each instrument has harmonics, envelope, noise, octave, waveShape,
 * plus optional DSP features: filter, filterEnvelope, fm, vibrato,
 * vibratoDelay, tremolo, unison, percussive.
 *
 * harmonics: array of { harmonic (freq multiplier), gain, role, waveShape?, decay? }
 *   - waveShape overrides instrument.waveShape for this harmonic
 *   - decay overrides instrument.envelope.decay for this harmonic
 * noise: null or { noiseFilterFreq, noiseFilterQ, noiseFilterType?, gain, role,
 *                  attack?, decay?, sustain?, release? }
 */

export const INSTRUMENTS = {
  // ─── Brass ────────────────────────────────────────────────────────────────

  trumpet: {
    name: 'Trumpet',
    harmonics: [
      { harmonic: 1, gain: 0.65, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.38, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.22, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.1, role: '4th Harmonic (H4)' },
    ],
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.15 },
    filter: { type: 'lowpass', frequency: 4000, Q: 2 },
    filterEnvelope: { amount: 3000, attack: 0.01, decay: 0.1 },
    fm: { ratio: 1, depth: 150, attack: 0.01, decay: 0.15 },
    vibrato: { rate: 5, depth: 5 },
    vibratoDelay: 0.3,
    noise: {
      noiseFilterFreq: 3000, noiseFilterQ: 2, noiseFilterType: 'bandpass',
      gain: 0.1, role: 'Attack Bark',
      attack: 0.001, decay: 0.04, sustain: 0, release: 0.04,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Filter sweeps create the bright-attack-then-warm timbre. FM synthesis adds the characteristic brass "buzz" that decays after the initial hit. Late vibrato (0.3s delay) mimics a real player\'s technique. A short noise burst provides the attack "bark".',
  },

  trombone: {
    name: 'Trombone',
    harmonics: [
      { harmonic: 1, gain: 0.58, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.38, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.24, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.11, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.05, role: '5th Harmonic (H5)' },
    ],
    envelope: { attack: 0.025, decay: 0.12, sustain: 0.72, release: 0.2 },
    filter: { type: 'lowpass', frequency: 3000, Q: 1.8 },
    filterEnvelope: { amount: 2500, attack: 0.015, decay: 0.12 },
    fm: { ratio: 1, depth: 120, attack: 0.01, decay: 0.2 },
    vibrato: { rate: 4.5, depth: 6 },
    vibratoDelay: 0.4,
    noise: {
      noiseFilterFreq: 2500, noiseFilterQ: 1.5, noiseFilterType: 'bandpass',
      gain: 0.08, role: 'Attack Blat',
      attack: 0.002, decay: 0.05, sustain: 0, release: 0.05,
    },
    octave: 3,
    waveShape: 'sine',
    description: 'The trombone\'s cylindrical bore produces a broader, warmer spectrum than the trumpet. The filter sits lower (3000Hz) reflecting the darker timbre. Slightly slower attack (0.025s) models the larger lip aperture needed. FM buzz is slightly less intense than trumpet. Octave 3 places it in the correct tenor/alto range. The "blat" noise transient is slightly longer and lower-pitched than the trumpet\'s bark, matching the larger mouthpiece.',
  },

  'french horn': {
    name: 'French Horn',
    harmonics: [
      { harmonic: 1, gain: 0.60, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.28, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.16, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.07, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.04, role: '5th Harmonic (H5)' },
      { harmonic: 6, gain: 0.02, role: '6th Harmonic (H6)' },
    ],
    envelope: { attack: 0.03, decay: 0.12, sustain: 0.72, release: 0.35 },
    filter: { type: 'lowpass', frequency: 2000, Q: 1.0 },
    filterEnvelope: { amount: 1500, attack: 0.015, decay: 0.15 },
    fm: { ratio: 1, depth: 80, attack: 0.01, decay: 0.25 },
    vibrato: { rate: 4.5, depth: 7 },
    vibratoDelay: 0.5,
    noise: {
      noiseFilterFreq: 1800, noiseFilterQ: 1.0, noiseFilterType: 'bandpass',
      gain: 0.06, role: 'Attack Blurp',
      attack: 0.002, decay: 0.04, sustain: 0, release: 0.04,
    },
    octave: 3,
    waveShape: 'sine',
    description: 'The French horn\'s hand-in-bell technique creates the darkest, warmest timbre of the brass family. The low filter cutoff (2000Hz) models how the hand dampens higher harmonics. FM depth is lower than trumpet/trombone (80 vs 120-150) reflecting the mellower character. Wider vibrato (7 cents) with 0.5s delay matches typical horn technique. The "blurp" noise transient is softer and lower-pitched than other brass, muffled by the hand. Octave 3 covers the standard horn range (B1-D5).',
  },

  // ─── Strings (bowed) ──────────────────────────────────────────────────────

  violin: {
    name: 'Violin',
    harmonics: [
      { harmonic: 1, gain: 0.75, role: 'Fundamental (H1)', waveShape: 'sawtooth' },
      { harmonic: 2, gain: 0.28, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.18, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.09, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.05, role: '5th Harmonic (H5)' },
    ],
    envelope: { attack: 0.12, decay: 0.1, sustain: 0.85, release: 0.4 },
    filter: { type: 'lowpass', frequency: 4500, Q: 1.2 },
    vibrato: { rate: 5.5, depth: 12 },
    vibratoDelay: 0.5,
    noise: {
      noiseFilterFreq: 2500, noiseFilterQ: 0.8, noiseFilterType: 'bandpass',
      gain: 0.03, role: 'Bow Friction',
      attack: 0.06, decay: 0.08, sustain: 0.15, release: 0.15,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'A sawtooth fundamental provides the rich, bowed-string spectrum. Sine harmonic reinforcements shape the upper partials. The filter at 4500Hz with Q=1.2 creates a subtle resonance peak suggesting body cavity formants around 1000-1500Hz. Wide vibrato (12 cents) with a 0.5s delay mimics an expressive player. The slow 0.12s attack simulates the bow grabbing the string. Subtle bow friction noise adds realism to the sustained tone.',
  },

  cello: {
    name: 'Cello',
    harmonics: [
      { harmonic: 1, gain: 0.7, role: 'Fundamental (H1)', waveShape: 'sawtooth' },
      { harmonic: 2, gain: 0.28, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.18, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.1, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.05, role: '5th Harmonic (H5)' },
      { harmonic: 6, gain: 0.03, role: '6th Harmonic (H6)' },
    ],
    envelope: { attack: 0.18, decay: 0.15, sustain: 0.82, release: 0.5 },
    filter: { type: 'lowpass', frequency: 3000, Q: 1.2 },
    vibrato: { rate: 5.0, depth: 10 },
    vibratoDelay: 0.6,
    noise: {
      noiseFilterFreq: 2000, noiseFilterQ: 0.8, noiseFilterType: 'bandpass',
      gain: 0.04, role: 'Bow Friction',
      attack: 0.08, decay: 0.1, sustain: 0.2, release: 0.2,
    },
    octave: 3,
    waveShape: 'sine',
    description: 'Sawtooth fundamental produces the rich bowed-string spectrum. The cello has a warm, dark tone due to its large resonant body — the lowpass filter at 3000Hz with Q=1.2 creates a subtle resonance peak suggesting body cavity formants. Slower attack than violin (0.18s) reflects the heavier bow-on-string response. Vibrato at 5Hz with 0.6s delay mimics a cellist\'s expressive technique. Subtle bow friction noise adds realism. Octave 3 places it in the correct C2-C5 range.',
  },

  // ─── Strings (plucked) ────────────────────────────────────────────────────

  'acoustic guitar': {
    name: 'Acoustic Guitar',
    harmonics: [
      { harmonic: 1, gain: 0.8, role: 'Fundamental (H1)', decay: 1.5 },
      { harmonic: 2, gain: 0.3, role: '2nd Harmonic (H2)', decay: 1.2 },
      { harmonic: 3, gain: 0.15, role: '3rd Harmonic (H3)', decay: 0.9 },
      { harmonic: 4, gain: 0.07, role: '4th Harmonic (H4)', decay: 0.6 },
      { harmonic: 5, gain: 0.03, role: '5th Harmonic (H5)', decay: 0.4 },
    ],
    envelope: { attack: 0.002, decay: 0.8, sustain: 0.15, release: 0.3 },
    filter: { type: 'lowpass', frequency: 3500, Q: 0.6 },
    filterEnvelope: { amount: 1500, attack: 0.002, decay: 0.3 },
    percussive: true,
    noise: {
      noiseFilterFreq: 4000, noiseFilterQ: 1.0, noiseFilterType: 'bandpass',
      gain: 0.08, role: 'Pluck Transient',
      attack: 0.001, decay: 0.02, sustain: 0, release: 0.01,
    },
    octave: 3,
    waveShape: 'triangle',
    description: 'Triangle wave provides the warm, woody body of a nylon/steel-string guitar. The filter starts open during the pluck attack and closes quickly, mimicking how a real guitar note is bright on attack then mellows. A very short noise burst simulates the pluck transient of the fingertip or pick on the string. Percussive envelope with low sustain models the natural exponential decay of a plucked string.',
  },

  banjo: {
    name: 'Banjo',
    harmonics: [
      { harmonic: 1, gain: 0.48, role: 'Fundamental (H1)', decay: 0.8 },
      { harmonic: 2, gain: 0.32, role: '2nd Harmonic (H2)', decay: 0.6 },
      { harmonic: 3, gain: 0.22, role: '3rd Harmonic (H3)', decay: 0.4 },
      { harmonic: 4, gain: 0.14, role: '4th Harmonic (H4)', decay: 0.25 },
      { harmonic: 5, gain: 0.08, role: '5th Harmonic (H5)', decay: 0.15 },
      { harmonic: 6, gain: 0.04, role: '6th Harmonic (H6)', decay: 0.1 },
    ],
    envelope: { attack: 0.001, decay: 0.5, sustain: 0.05, release: 0.15 },
    filter: { type: 'lowpass', frequency: 6000, Q: 0.5 },
    filterEnvelope: { amount: 3000, attack: 0.001, decay: 0.15 },
    percussive: true,
    noise: {
      noiseFilterFreq: 5000, noiseFilterQ: 1.2, noiseFilterType: 'bandpass',
      gain: 0.12, role: 'Pluck/Head Snap',
      attack: 0.001, decay: 0.015, sustain: 0, release: 0.01,
    },
    octave: 4,
    waveShape: 'triangle',
    description: 'The banjo\'s drum-head body creates a bright, snappy, percussive tone with more prominent upper harmonics than a guitar. The high filter cutoff (6000Hz) preserves brightness. Very fast attack and short decay model the rapid note decay from the drum head. Strong H2-H4 harmonics (0.4, 0.3, 0.2) create the characteristic nasal, cutting quality. The pluck/head snap noise is brighter and louder than a guitar (12% gain, 5kHz center). Triangle wave gives the right balance of warmth and brightness.',
  },

  harp: {
    name: 'Harp',
    harmonics: [
      { harmonic: 1, gain: 0.7, role: 'Fundamental (H1)', decay: 3.0 },
      { harmonic: 2, gain: 0.3, role: '2nd Harmonic (H2)', decay: 2.5 },
      { harmonic: 3, gain: 0.15, role: '3rd Harmonic (H3)', decay: 2.0 },
      { harmonic: 4, gain: 0.07, role: '4th Harmonic (H4)', decay: 1.5 },
      { harmonic: 5, gain: 0.03, role: '5th Harmonic (H5)', decay: 1.0 },
    ],
    envelope: { attack: 0.005, decay: 2.5, sustain: 0.05, release: 1.0 },
    filter: { type: 'lowpass', frequency: 5000, Q: 0.3 },
    percussive: true,
    noise: {
      noiseFilterFreq: 3000, noiseFilterQ: 0.6, noiseFilterType: 'bandpass',
      gain: 0.05, role: 'Pluck/Fingernail',
      attack: 0.001, decay: 0.015, sustain: 0, release: 0.01,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Pure sine harmonics create the harp\'s crystalline, ethereal quality. Very long decay (3s for fundamental) with near-zero sustain models the free-ringing string. Gentle lowpass filter at 5000Hz with low Q preserves the natural warmth. A very brief pluck transient adds the fingernail/fingertip attack. Long release (1s) simulates the natural ring-off when the player releases the string.',
  },

  // ─── Woodwinds (reed) ────────────────────────────────────────────────────

  clarinet: {
    name: 'Clarinet',
    harmonics: [
      { harmonic: 1, gain: 0.65, role: 'Fundamental (H1)' },
      { harmonic: 3, gain: 0.35, role: '3rd Harmonic (H3)' },
      { harmonic: 5, gain: 0.2, role: '5th Harmonic (H5)' },
      { harmonic: 7, gain: 0.1, role: '7th Harmonic (H7)' },
      { harmonic: 9, gain: 0.05, role: '9th Harmonic (H9)' },
    ],
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.2 },
    filter: { type: 'bandpass', frequency: 2000, Q: 1.5 },
    fm: { ratio: 1, depth: 80, attack: 0.01, decay: 0.2 },
    noise: {
      noiseFilterFreq: 2000, noiseFilterQ: 2, noiseFilterType: 'bandpass',
      gain: 0.08, role: 'Reed Noise',
      attack: 0.005, decay: 0.06, sustain: 0, release: 0.06,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Odd harmonics only (H1, H3, H5, H7, H9) create the clarinet\'s distinctive woody, cylindrical-bore timbre. A bandpass filter at ~2000Hz emphasizes the formant region. Subtle FM adds reed buzz character.',
  },

  saxophone: {
    name: 'Saxophone',
    harmonics: [
      { harmonic: 1, gain: 0.6, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.3, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.22, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.15, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.08, role: '5th Harmonic (H5)' },
      { harmonic: 6, gain: 0.04, role: '6th Harmonic (H6)' },
    ],
    envelope: { attack: 0.03, decay: 0.1, sustain: 0.75, release: 0.2 },
    filter: { type: 'lowpass', frequency: 3500, Q: 1.5 },
    filterEnvelope: { amount: 2000, attack: 0.01, decay: 0.15 },
    fm: { ratio: 1, depth: 100, attack: 0.01, decay: 0.2 },
    vibrato: { rate: 4.5, depth: 6 },
    vibratoDelay: 0.4,
    noise: {
      noiseFilterFreq: 2500, noiseFilterQ: 1.5, noiseFilterType: 'bandpass',
      gain: 0.08, role: 'Reed Breath Noise',
      attack: 0.005, decay: 0.06, sustain: 0, release: 0.06,
    },
    octave: 4,
    waveShape: 'sawtooth',
    description: 'Sawtooth harmonics filtered through a 3500Hz lowpass create the warm sax body. FM synthesis adds the reedy character that decays after attack. Filter envelope opens briefly for the tongued attack. Vibrato enters late (0.4s), mimicking a real saxophonist\'s style.',
  },

  oboe: {
    name: 'Oboe',
    harmonics: [
      { harmonic: 1, gain: 0.48, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.3, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.25, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.15, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.1, role: '5th Harmonic (H5)' },
      { harmonic: 6, gain: 0.05, role: '6th Harmonic (H6)' },
    ],
    envelope: { attack: 0.025, decay: 0.08, sustain: 0.75, release: 0.25 },
    filter: { type: 'bandpass', frequency: 2500, Q: 2.0 },
    fm: { ratio: 1, depth: 180, attack: 0.005, decay: 0.15 },
    vibrato: { rate: 5.0, depth: 7 },
    vibratoDelay: 0.35,
    noise: {
      noiseFilterFreq: 3000, noiseFilterQ: 2.0, noiseFilterType: 'bandpass',
      gain: 0.07, role: 'Double Reed Crow',
      attack: 0.003, decay: 0.04, sustain: 0, release: 0.04,
    },
    octave: 5,
    waveShape: 'sawtooth',
    description: 'The oboe\'s conical bore with double reed produces a bright, penetrating tone with strong harmonics through H5. The bandpass filter at 2500Hz with high Q (2.0) models the distinctive formant "pinch" that gives the oboe its nasal character. Strong FM depth (180) simulates the intense double-reed buzz — higher than single-reed instruments. The double reed crow noise is brief and higher-pitched than single-reed noise. Octave 5 places it correctly in the soprano range.',
  },

  // ─── Woodwinds (flute) ───────────────────────────────────────────────────

  flute: {
    name: 'Flute',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.2, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.06, role: '3rd Harmonic (H3)' },
    ],
    envelope: { attack: 0.06, decay: 0.1, sustain: 0.8, release: 0.3 },
    filter: { type: 'lowpass', frequency: 6000, Q: 0.7 },
    vibrato: { rate: 5, depth: 8 },
    vibratoDelay: 0.4,
    noise: {
      noiseFilterFreq: 5000, noiseFilterQ: 0.5, noiseFilterType: 'highpass',
      gain: 0.08, role: 'Breath Noise',
      attack: 0.04, decay: 0.08, sustain: 0.3, release: 0.15,
    },
    octave: 5,
    waveShape: 'sine',
    description: 'Pure sine harmonics with a gentle lowpass filter create the flute\'s warm, airy tone. Slow vibrato with a 0.4s delay mimics a flautist\'s natural breathing technique. Highpass-filtered noise adds breathiness and realism.',
  },

  // ─── Keyboard ────────────────────────────────────────────────────────────

  piano: {
    name: 'Piano',
    harmonics: [
      { harmonic: 1, gain: 0.65, role: 'Fundamental (H1)', decay: 2.0 },
      { harmonic: 2.002, gain: 0.32, role: '2nd Inharmonic (H2)', decay: 1.5 },
      { harmonic: 3.006, gain: 0.18, role: '3rd Inharmonic (H3)', decay: 1.0 },
      { harmonic: 4.013, gain: 0.09, role: '4th Inharmonic (H4)', decay: 0.7 },
      { harmonic: 5.022, gain: 0.05, role: '5th Inharmonic (H5)', decay: 0.5 },
      { harmonic: 6.034, gain: 0.03, role: '6th Inharmonic (H6)', decay: 0.35 },
    ],
    envelope: { attack: 0.001, decay: 2.0, sustain: 0, release: 0.5 },
    filter: { type: 'lowpass', frequency: 6000, Q: 0.5 },
    unison: { voices: 3, detune: 3 },
    percussive: true,
    noise: {
      noiseFilterFreq: 8000, noiseFilterQ: 0.3, noiseFilterType: 'bandpass',
      gain: 0.1, role: 'Hammer Strike',
      attack: 0.001, decay: 0.03, sustain: 0, release: 0.02,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Inharmonic partials (slightly sharp upper harmonics) model the stiffness of real piano strings. 3-voice unison simulates the 3 strings per note with subtle detuning. Percussive envelope decays to silence — no sustain. Higher harmonics decay faster than lower ones, just like a real piano.',
  },

  'electric piano': {
    name: 'Electric Piano (Rhodes)',
    harmonics: [
      { harmonic: 1, gain: 0.7, role: 'Fundamental (H1)', decay: 2.5 },
      { harmonic: 2.0, gain: 0.2, role: '2nd Harmonic (H2)', decay: 2.0 },
      { harmonic: 3.02, gain: 0.28, role: '3rd Inharmonic (H3)', decay: 1.5 },
      { harmonic: 5.04, gain: 0.1, role: '5th Inharmonic (H5)', decay: 1.0 },
    ],
    envelope: { attack: 0.001, decay: 1.8, sustain: 0.1, release: 0.4 },
    filter: { type: 'lowpass', frequency: 4000, Q: 0.4 },
    fm: { ratio: 1, depth: 60, attack: 0.001, decay: 0.4 },
    percussive: true,
    unison: { voices: 2, detune: 2 },
    noise: {
      noiseFilterFreq: 6000, noiseFilterQ: 0.5, noiseFilterType: 'bandpass',
      gain: 0.05, role: 'Tine Strike',
      attack: 0.001, decay: 0.015, sustain: 0, release: 0.01,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'The Rhodes tine produces a bell-like tone with inharmonic partials — the 3rd harmonic is unusually prominent (from the tine striking the tone bar). FM synthesis adds the characteristic "bite" that decays quickly. 2-voice subtle unison simulates the stereo chorus of a Rhodes through a amplifier. Percussive envelope with low sustain models the natural decay. A brief tine strike noise transient adds attack realism.',
  },

  organ: {
    name: 'Organ',
    harmonics: [
      { harmonic: 0.5, gain: 0.2, role: 'Sub (16\')' },
      { harmonic: 1, gain: 0.35, role: 'Fundamental (8\')' },
      { harmonic: 2, gain: 0.28, role: 'Octave (4\')' },
      { harmonic: 3, gain: 0.18, role: '12th (2 2/3\')' },
      { harmonic: 4, gain: 0.14, role: '15th (2\')' },
      { harmonic: 6, gain: 0.08, role: '19th (1 1/3\')' },
      { harmonic: 8, gain: 0.05, role: '22nd (1\')' },
      { harmonic: 12, gain: 0.03, role: '26th (2/3\')' },
    ],
    envelope: { attack: 0.001, decay: 0.01, sustain: 1.0, release: 0.05 },
    tremolo: { rate: 6.8, depth: 0.2 },
    noise: null,
    octave: 4,
    waveShape: 'sine',
    description: 'Pure sine waves in classic drawbar registration — the purest form of additive synthesis. Nearly instant attack, full sustain while held, quick release. Tremolo at 6.8Hz simulates the Leslie speaker\'s rotating horn effect. No filter, no vibrato — just pure organ tone with rotary modulation.',
  },

  harpsichord: {
    name: 'Harpsichord',
    harmonics: [
      { harmonic: 1, gain: 0.48, role: 'Fundamental (H1)', decay: 2.0 },
      { harmonic: 2, gain: 0.30, role: '2nd Harmonic (H2)', decay: 1.6 },
      { harmonic: 3, gain: 0.22, role: '3rd Harmonic (H3)', decay: 1.2 },
      { harmonic: 4, gain: 0.13, role: '4th Harmonic (H4)', decay: 0.8 },
      { harmonic: 5, gain: 0.08, role: '5th Harmonic (H5)', decay: 0.5 },
      { harmonic: 6, gain: 0.05, role: '6th Harmonic (H6)', decay: 0.35 },
      { harmonic: 8, gain: 0.03, role: '8th Harmonic (H8)', decay: 0.2 },
    ],
    envelope: { attack: 0.001, decay: 1.5, sustain: 0.05, release: 0.3 },
    filter: { type: 'lowpass', frequency: 7000, Q: 0.6 },
    filterEnvelope: { amount: 3000, attack: 0.001, decay: 0.2 },
    percussive: true,
    unison: { voices: 2, detune: 2 },
    noise: {
      noiseFilterFreq: 7000, noiseFilterQ: 0.8, noiseFilterType: 'bandpass',
      gain: 0.08, role: 'Plectrum Pluck',
      attack: 0.001, decay: 0.01, sustain: 0, release: 0.005,
    },
    octave: 4,
    waveShape: 'square',
    description: 'The harpsichord plucks strings with a plectrum (crow quill or delrin), producing a bright, twangy tone with rich upper harmonics. Square wave models the sharp pluck transient and bright timbre. 2-voice unison with 2-cent detuning simulates the two strings per note typical of harpsichords. Very high filter cutoff (7000Hz) preserves the bright, metallic character. Per-harmonic decay (higher harmonics faster) models the string\'s natural decay. Near-zero sustain with percussive envelope — the harpsichord cannot sustain notes like a piano. Brief plectrum noise adds attack realism. Octave 4 covers the standard harpsichord range.',
  },

  // ─── Percussion (pitched) ────────────────────────────────────────────────

  marimba: {
    name: 'Marimba',
    harmonics: [
      { harmonic: 1, gain: 0.9, role: 'Fundamental (H1)', decay: 1.2 },
      { harmonic: 4, gain: 0.3, role: '4th Harmonic (H4) — octave', decay: 0.6 },
      { harmonic: 9.4, gain: 0.08, role: 'Inharmonic partial (9.4x)', decay: 0.3 },
      { harmonic: 10.2, gain: 0.04, role: 'Inharmonic partial (10.2x)', decay: 0.2 },
    ],
    envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.3 },
    filter: { type: 'lowpass', frequency: 5000, Q: 0.5 },
    percussive: true,
    noise: {
      noiseFilterFreq: 7000, noiseFilterQ: 0.8, noiseFilterType: 'bandpass',
      gain: 0.08, role: 'Mallet Strike',
      attack: 0.001, decay: 0.01, sustain: 0, release: 0.005,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Marimba bars vibrate with a prominent 4th harmonic (two octaves above fundamental) due to the bar\'s transverse vibration modes. Higher inharmonic partials at ~9.4x are characteristic of tuned bar percussion. The mallet strike noise is brief and high-frequency. Percussive envelope with zero sustain models the natural exponential decay of a struck bar. The resonator tube amplifies the fundamental, making it dominant.',
  },

  vibraphone: {
    name: 'Vibraphone',
    harmonics: [
      { harmonic: 1, gain: 0.75, role: 'Fundamental (H1)', decay: 2.5 },
      { harmonic: 4, gain: 0.25, role: '4th Harmonic (H4)', decay: 1.8 },
      { harmonic: 9.4, gain: 0.06, role: 'Inharmonic partial', decay: 0.8 },
    ],
    envelope: { attack: 0.001, decay: 1.5, sustain: 0.1, release: 0.8 },
    filter: { type: 'lowpass', frequency: 5500, Q: 0.4 },
    tremolo: { rate: 5.5, depth: 0.25 },
    percussive: true,
    noise: {
      noiseFilterFreq: 6000, noiseFilterQ: 0.6, noiseFilterType: 'bandpass',
      gain: 0.06, role: 'Mallet Strike',
      attack: 0.001, decay: 0.015, sustain: 0, release: 0.008,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'The vibraphone shares the marimba\'s bar vibration physics (prominent 4th harmonic, inharmonic at ~9.4x) but with a longer sustain and slower decay from the metal bars. The key feature is tremolo at 5.5Hz with 25% depth, simulating the motor-driven rotating resonator discs that create the classic "shimmer." Longer release (0.8s) allows the metal bars to ring naturally. The mallet noise is slightly softer and shorter than marimba, reflecting the use of yarn-wound mallets on metal.',
  },

  glockenspiel: {
    name: 'Glockenspiel',
    harmonics: [
      { harmonic: 1, gain: 0.75, role: 'Fundamental (H1)', decay: 1.2 },
      { harmonic: 2.76, gain: 0.22, role: 'Inharmonic (2.76x) — 1st overtone', decay: 0.6 },
      { harmonic: 5.4, gain: 0.10, role: 'Inharmonic (5.4x) — 2nd overtone', decay: 0.3 },
    ],
    envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.5 },
    filter: { type: 'lowpass', frequency: 9000, Q: 0.4 },
    percussive: true,
    noise: {
      noiseFilterFreq: 9000, noiseFilterQ: 0.5, noiseFilterType: 'bandpass',
      gain: 0.04, role: 'Mallet Strike',
      attack: 0.001, decay: 0.005, sustain: 0, release: 0.003,
    },
    octave: 5,
    waveShape: 'sine',
    description: 'The glockenspiel produces pure, bright, bell-like tones from struck metal bars. Sine wave is essential for the crystalline quality. Inharmonic overtones at 2.76x and 5.4x are transverse vibration modes of free-free metal bars — these non-integer ratios give the distinctive bell-like character (same physics as xylophone/marimba bars but metal). High octave (5) places it in the correct range (G5-C8). Very high filter (9000Hz) preserves brightness. Minimal mallet noise — hard mallet on metal creates almost no transient. Fast percussive decay with zero sustain.',
  },

  // ─── Electric Bass ───────────────────────────────────────────────────────

  'electric bass': {
    name: 'Electric Bass',
    harmonics: [
      { harmonic: 1, gain: 0.7, role: 'Fundamental (H1)', waveShape: 'sawtooth' },
      { harmonic: 2, gain: 0.3, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.12, role: '3rd Harmonic (H3)' },
    ],
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.2 },
    filter: { type: 'lowpass', frequency: 800, Q: 1 },
    filterEnvelope: { amount: 400, attack: 0.005, decay: 0.1 },
    noise: {
      noiseFilterFreq: 500, noiseFilterQ: 0.8, noiseFilterType: 'lowpass',
      gain: 0.1, role: 'Finger/String Noise',
      attack: 0.001, decay: 0.04, sustain: 0, release: 0.04,
    },
    octave: 2,
    waveShape: 'sine',
    description: 'A sawtooth fundamental with lowpass filtering at 800Hz creates the thumpy, round bass tone. The filter envelope opens briefly on attack for the initial "thwack". Low-frequency noise adds finger/string character.',
  },

  // ─── Strings (plucked) — electric ──────────────────────────────────────

  'electric guitar': {
    name: 'Electric Guitar',
    harmonics: [
      { harmonic: 1, gain: 0.53, role: 'Fundamental (H1)', decay: 1.8, waveShape: 'sawtooth' },
      { harmonic: 2, gain: 0.33, role: '2nd Harmonic (H2)', decay: 1.4 },
      { harmonic: 3, gain: 0.24, role: '3rd Harmonic (H3)', decay: 1.0 },
      { harmonic: 4, gain: 0.14, role: '4th Harmonic (H4)', decay: 0.7 },
      { harmonic: 5, gain: 0.07, role: '5th Harmonic (H5)', decay: 0.5 },
      { harmonic: 6, gain: 0.04, role: '6th Harmonic (H6)', decay: 0.35 },
    ],
    envelope: { attack: 0.001, decay: 0.6, sustain: 0.2, release: 0.4 },
    filter: { type: 'lowpass', frequency: 4500, Q: 1.2 },
    filterEnvelope: { amount: 2500, attack: 0.001, decay: 0.2 },
    percussive: true,
    unison: { voices: 2, detune: 4 },
    noise: {
      noiseFilterFreq: 6000, noiseFilterQ: 1.0, noiseFilterType: 'bandpass',
      gain: 0.1, role: 'Pick Transient',
      attack: 0.001, decay: 0.015, sustain: 0, release: 0.01,
    },
    octave: 3,
    waveShape: 'triangle',
    description: 'Sawtooth fundamental models the rich harmonic content of magnetic pickup induction. Electric guitar has stronger upper harmonics than acoustic guitar (pickup captures full string vibration vs soundboard resonance). The filter sits higher (4500Hz) and uses moderate Q for the characteristic pickup position coloration. 2-voice unison with 4-cent detune simulates chorus effect from slightly out-of-tune strings. Filter envelope sweeps from bright attack to warm sustain. Triangle wave harmonics fill out the midrange body. Octave 3 covers the standard guitar range E2-E5.',
  },

  // ─── Woodwinds (flute) — recorder ─────────────────────────────────────

  recorder: {
    name: 'Recorder',
    harmonics: [
      { harmonic: 1, gain: 0.85, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.12, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.04, role: '3rd Harmonic (H3)' },
    ],
    envelope: { attack: 0.05, decay: 0.08, sustain: 0.78, release: 0.25 },
    filter: { type: 'lowpass', frequency: 4500, Q: 0.5 },
    noise: {
      noiseFilterFreq: 3500, noiseFilterQ: 0.4, noiseFilterType: 'highpass',
      gain: 0.06, role: 'Windway Breath Noise',
      attack: 0.03, decay: 0.06, sustain: 0.25, release: 0.1,
    },
    octave: 5,
    waveShape: 'sine',
    description: 'The recorder is an internal-duct (fipple) flute with a nearly pure sinusoidal tone. Its spectrum is even simpler than the concert flute — the cylindrical bore and windway design produce weaker harmonics (H2 at only 0.12 vs flute\'s 0.20). Slightly slower attack (0.05s) than flute models the windway airstream buildup. No vibrato — recorder players traditionally use no vibrato (unlike modern flute technique). Lower filter cutoff (4500Hz) reflects the softer, more rounded timbre. Subtle highpass windway breath noise is softer and lower-pitched than flute\'s (the windway dampens breath turbulence). Octave 5 is correct for soprano recorder range C5-D7.',
  },

  // ─── Percussion (pitched) — timpani ───────────────────────────────────

  timpani: {
    name: 'Timpani',
    harmonics: [
      { harmonic: 1, gain: 0.8, role: 'Fundamental (H1)', decay: 3.0 },
      { harmonic: 1.5, gain: 0.25, role: 'Inharmonic partial (1.5x)', decay: 2.0 },
      { harmonic: 2.0, gain: 0.15, role: '2nd mode (2.0x)', decay: 1.5 },
    ],
    envelope: { attack: 0.003, decay: 2.5, sustain: 0, release: 0.8 },
    filter: { type: 'lowpass', frequency: 1200, Q: 0.6 },
    percussive: true,
    noise: {
      noiseFilterFreq: 1500, noiseFilterQ: 0.5, noiseFilterType: 'lowpass',
      gain: 0.12, role: 'Felt Mallet Strike',
      attack: 0.001, decay: 0.025, sustain: 0, release: 0.015,
    },
    octave: 2,
    waveShape: 'sine',
    description: 'Timpani (kettledrum) produces a definite pitch from a stretched membrane over a resonating bowl. The spectrum is dominated by the fundamental with inharmonic partials at ~1.5x and 2.0x — these are membrane vibration modes that don\'t follow integer harmonic ratios. The lowpass filter at 1200Hz keeps the tone deep and focused. Long decay (3s for H1) with zero sustain and percussive envelope models the natural exponential ring of a large drumhead. Low-frequency felt mallet noise adds the characteristic "thud" attack. Octave 2 places it in the correct bass range (D2-A3 for standard timpani). The 1.5x partial is a key distinguishing feature of membrane instruments.',
  },

  // ─── Electronic ──────────────────────────────────────────────────────

  '808 bass': {
    name: '808 Bass',
    harmonics: [
      { harmonic: 1, gain: 0.9, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.35, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.12, role: '3rd Harmonic (H3)' },
    ],
    envelope: { attack: 0.001, decay: 0.8, sustain: 0.6, release: 0.15 },
    filter: { type: 'lowpass', frequency: 500, Q: 4 },
    filterEnvelope: { amount: 600, attack: 0.001, decay: 0.08 },
    noise: null,
    octave: 1,
    waveShape: 'sine',
    description: 'The Roland TR-808 kick/bass is iconic in electronic music. Pure sine wave with a resonant lowpass filter (Q=4) creates the punchy, focused low-end. The filter envelope sweeps from 1100Hz down to 500Hz for the characteristic "punch" at attack. Very low octave (1) produces sub-bass frequencies. Sine wave is essential — the real 808 uses a sine oscillator with a short pitch sweep. Higher sustain (0.6) allows sustained bass notes unlike percussive 808 kicks. No noise — the 808 bass is purely synthetic and clean. The resonant filter (Q=4) is key to the 808\'s distinctive focused, slightly nasal tone.',
  },

  'synth pad': {
    name: 'Synth Pad',
    harmonics: [
      { harmonic: 1, gain: 0.4, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.25, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.18, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.1, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.05, role: '5th Harmonic (H5) — shimmer' },
    ],
    envelope: { attack: 0.8, decay: 0.5, sustain: 0.85, release: 1.5 },
    filter: { type: 'lowpass', frequency: 2500, Q: 0.8 },
    filterEnvelope: { amount: 1500, attack: 0.6, decay: 0.8 },
    unison: { voices: 5, detune: 12 },
    vibrato: { rate: 4.0, depth: 3 },
    vibratoDelay: 1.0,
    noise: null,
    octave: 4,
    waveShape: 'sawtooth',
    description: 'A classic analog-style synth pad with slow evolving timbre. Slow attack (0.8s) and long release (1.5s) create the characteristic "wash" of sound that fades in and out smoothly. 5-voice unison with 12-cent detune produces a rich, wide, chorused ensemble effect — this is the key to the pad\'s lush, thick character. Sawtooth wave provides rich harmonic content that the filter shapes over time. The filter envelope slowly opens and closes (1.5s sweep) creating an evolving timbral movement. Very subtle vibrato (3 cents) with long delay (1.0s) adds gentle movement after the pad has fully developed. High sustain (0.85) keeps the pad at full volume while held.',
  },
}

// ─── Alias Map (common typos / alternate names) ──────────────────────────────
export const ALIASES = {
  // Trumpet
  trumet: 'trumpet', trumpt: 'trumpet', trum: 'trumpet', trup: 'trumpet',
  trupmet: 'trumpet', trompet: 'trumpet', brass: 'trumpet',

  // Trombone
  trombon: 'trombone', trom: 'trombone', bone: 'trombone',

  // French Horn
  horn: 'french horn', 'frenchhorn': 'french horn', 'fr horn': 'french horn',
  frhorn: 'french horn', 'f horn': 'french horn', cor: 'french horn',

  // Flute
  flut: 'flute', fluite: 'flute', fluet: 'flute',

  // Clarinet
  clarnet: 'clarinet', clarneet: 'clarinet',
  klarinet: 'clarinet', clarionet: 'clarinet',

  // Oboe
  obo: 'oboe', hoboe: 'oboe', hautboy: 'oboe',

  // Violin
  violen: 'violin', violine: 'violin',
  fiddle: 'violin',

  // Cello
  violincelo: 'cello', violoncello: 'cello', violoncelo: 'cello',
  chelo: 'cello',

  // Organ
  chursh: 'organ', church: 'organ', pipe: 'organ',

  // Electric Bass
  bass: 'electric bass', 'elec bass': 'electric bass', 'e bass': 'electric bass',
  bassguitar: 'electric bass', 'bass guitar': 'electric bass',

  // Saxophone
  sax: 'saxophone', saxaphone: 'saxophone', saksophone: 'saxophone',
  saxofon: 'saxophone', saxes: 'saxophone',

  // Piano
  pian: 'piano', pianoo: 'piano', keyb: 'piano', keys: 'piano',
  keyboard: 'piano', piani: 'piano',

  // Acoustic Guitar
  guitar: 'acoustic guitar', 'ac guitar': 'acoustic guitar',
  'accoustic guitar': 'acoustic guitar', acustic: 'acoustic guitar',
  gitar: 'acoustic guitar',

  // Banjo
  banj: 'banjo', banjoo: 'banjo',

  // Electric Piano
  rhodes: 'electric piano', wurli: 'electric piano', wurlitzer: 'electric piano',
  'elec piano': 'electric piano', 'e piano': 'electric piano',
  epiano: 'electric piano', 'ep': 'electric piano',

  // Harp
  harps: 'harp',

  // Marimba
  marimbe: 'marimba',

  // Vibraphone
  vibes: 'vibraphone', vibraphon: 'vibraphone', vibe: 'vibraphone',

  // Electric Guitar
  'elec guitar': 'electric guitar', 'e guitar': 'electric guitar',
  'electric gtr': 'electric guitar', eguitar: 'electric guitar',
  'elec gtr': 'electric guitar',

  // Recorder
  recordr: 'recorder', 'block flute': 'recorder',
  'english flute': 'recorder', 'fipple flute': 'recorder',

  // Timpani
  timpano: 'timpani', kettle: 'timpani', kettledrum: 'timpani',
  'kettle drum': 'timpani', timp: 'timpani',

  // 808 Bass
  '808': '808 bass', '808bass': '808 bass', '808 kick': '808 bass',
  'tr808': '808 bass', subbass: '808 bass', 'sub bass': '808 bass',

  // Synth Pad
  pad: 'synth pad', 'synthpad': 'synth pad',
  'string pad': 'synth pad', 'analog pad': 'synth pad',

  // Harpsichord
  harpsicord: 'harpsichord', harpschor: 'harpsichord',
  cembalo: 'harpsichord', cemb: 'harpsichord',

  // Glockenspiel
  glock: 'glockenspiel', glockenspeil: 'glockenspiel',
  bells: 'glockenspiel', 'orchestral bells': 'glockenspiel',
}
