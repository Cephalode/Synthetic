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

  // ─── Strings (bowed) ──────────────────────────────────────────────────────

  violin: {
    name: 'Violin',
    harmonics: [
      { harmonic: 1, gain: 0.8, role: 'Fundamental (H1)', waveShape: 'sawtooth' },
      { harmonic: 2, gain: 0.3, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.2, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.1, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.06, role: '5th Harmonic (H5)' },
    ],
    envelope: { attack: 0.12, decay: 0.1, sustain: 0.85, release: 0.4 },
    filter: { type: 'lowpass', frequency: 5000, Q: 0.7 },
    vibrato: { rate: 5.5, depth: 12 },
    vibratoDelay: 0.5,
    noise: null,
    octave: 4,
    waveShape: 'sine',
    description: 'A sawtooth fundamental provides the rich, bowed-string spectrum. Sine harmonic reinforcements shape the upper partials. Wide vibrato (12 cents) with a 0.5s delay mimics an expressive player. The slow 0.12s attack simulates the bow grabbing the string.',
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
    filter: { type: 'lowpass', frequency: 3500, Q: 0.8 },
    vibrato: { rate: 5.0, depth: 10 },
    vibratoDelay: 0.6,
    noise: {
      noiseFilterFreq: 2000, noiseFilterQ: 0.8, noiseFilterType: 'bandpass',
      gain: 0.04, role: 'Bow Friction',
      attack: 0.08, decay: 0.1, sustain: 0.2, release: 0.2,
    },
    octave: 3,
    waveShape: 'sine',
    description: 'Sawtooth fundamental produces the rich bowed-string spectrum. The cello has a warm, dark tone due to its large resonant body — the lowpass filter at 3500Hz shapes this. Slower attack than violin (0.18s) reflects the heavier bow-on-string response. Vibrato at 5Hz with 0.6s delay mimics a cellist\'s expressive technique. Subtle bow friction noise adds realism. Octave 3 places it in the correct C2-C5 range.',
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

  // ─── Percussion (pitched) ────────────────────────────────────────────────

  marimba: {
    name: 'Marimba',
    harmonics: [
      { harmonic: 1, gain: 0.9, role: 'Fundamental (H1)', decay: 1.2 },
      { harmonic: 4, gain: 0.3, role: '4th Harmonic (H4) — octave', decay: 0.6 },
      { harmonic: 9.4, gain: 0.08, role: 'Inharmonic partial', decay: 0.3 },
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
}

// ─── Alias Map (common typos / alternate names) ──────────────────────────────
export const ALIASES = {
  // Trumpet
  trumet: 'trumpet', trumpt: 'trumpet', trum: 'trumpet', trup: 'trumpet',
  trupmet: 'trumpet', trompet: 'trumpet', horn: 'trumpet', brass: 'trumpet',

  // Trombone
  trombon: 'trombone', trom: 'trombone', bone: 'trombone',

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
}
