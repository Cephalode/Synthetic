/**
 * Local AI brain for instrument query parsing.
 * No API calls — all logic is local.
 *
 * Export: parseInstrumentQuery(query) → { layers, description }
 */

// ─── Instrument Definitions ──────────────────────────────────────────────────
// Each instrument has harmonics, envelope, noise, octave, waveShape,
// plus optional DSP features: filter, filterEnvelope, fm, vibrato,
// vibratoDelay, tremolo, unison, percussive.
//
// harmonics: array of { harmonic (freq multiplier), gain, role, waveShape?, decay? }
//   - waveShape overrides instrument.waveShape for this harmonic
//   - decay overrides instrument.envelope.decay for this harmonic
// noise: null or { noiseFilterFreq, noiseFilterQ, noiseFilterType?, gain, role,
//                  attack?, decay?, sustain?, release? }

const INSTRUMENTS = {
  trumpet: {
    name: 'Trumpet',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.6, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.4, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.25, role: '4th Harmonic (H4)' },
    ],
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.15 },
    filter: { type: 'lowpass', frequency: 4000, Q: 2 },
    filterEnvelope: { amount: 3000, attack: 0.01, decay: 0.1 },
    fm: { ratio: 1, depth: 150, attack: 0.01, decay: 0.15 },
    vibrato: { rate: 5, depth: 5 },
    vibratoDelay: 0.3,
    noise: {
      noiseFilterFreq: 3000, noiseFilterQ: 2, noiseFilterType: 'bandpass',
      gain: 0.15, role: 'Attack Bark',
      attack: 0.001, decay: 0.04, sustain: 0, release: 0.04,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Filter sweeps create the bright-attack-then-warm timbre. FM synthesis adds the characteristic brass "buzz" that decays after the initial hit. Late vibrato (0.3s delay) mimics a real player\'s technique. A short noise burst provides the attack "bark".',
  },

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

  clarinet: {
    name: 'Clarinet',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 3, gain: 0.55, role: '3rd Harmonic (H3)' },
      { harmonic: 5, gain: 0.35, role: '5th Harmonic (H5)' },
      { harmonic: 7, gain: 0.18, role: '7th Harmonic (H7)' },
      { harmonic: 9, gain: 0.08, role: '9th Harmonic (H9)' },
    ],
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.2 },
    filter: { type: 'bandpass', frequency: 2000, Q: 1.5 },
    fm: { ratio: 1, depth: 80, attack: 0.01, decay: 0.2 },
    noise: {
      noiseFilterFreq: 2000, noiseFilterQ: 2, noiseFilterType: 'bandpass',
      gain: 0.1, role: 'Reed Noise',
      attack: 0.005, decay: 0.06, sustain: 0, release: 0.06,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Odd harmonics only (H1, H3, H5, H7, H9) create the clarinet\'s distinctive woody, cylindrical-bore timbre. A bandpass filter at ~2000Hz emphasizes the formant region. Subtle FM adds reed buzz character.',
  },

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

  organ: {
    name: 'Organ',
    harmonics: [
      { harmonic: 0.5, gain: 0.6, role: 'Sub (16\')' },
      { harmonic: 1, gain: 1.0, role: 'Fundamental (8\')' },
      { harmonic: 2, gain: 0.8, role: 'Octave (4\')' },
      { harmonic: 3, gain: 0.5, role: '12th (2 2/3\')' },
      { harmonic: 4, gain: 0.4, role: '15th (2\')' },
      { harmonic: 6, gain: 0.25, role: '19th (1 1/3\')' },
      { harmonic: 8, gain: 0.15, role: '22nd (1\')' },
      { harmonic: 12, gain: 0.08, role: '26th (2/3\')' },
    ],
    envelope: { attack: 0.001, decay: 0.01, sustain: 1.0, release: 0.05 },
    noise: null,
    octave: 4,
    waveShape: 'sine',
    description: 'Pure sine waves in classic drawbar registration — the purest form of additive synthesis. Nearly instant attack, full sustain while held, quick release. No filter, no vibrato, no noise — just pure organ tone.',
  },

  'electric bass': {
    name: 'Electric Bass',
    harmonics: [
      { harmonic: 1, gain: 0.9, role: 'Fundamental (H1)', waveShape: 'sawtooth' },
      { harmonic: 2, gain: 0.4, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.15, role: '3rd Harmonic (H3)' },
    ],
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.2 },
    filter: { type: 'lowpass', frequency: 800, Q: 1 },
    filterEnvelope: { amount: 400, attack: 0.005, decay: 0.1 },
    noise: {
      noiseFilterFreq: 500, noiseFilterQ: 0.8, noiseFilterType: 'lowpass',
      gain: 0.12, role: 'Finger/String Noise',
      attack: 0.001, decay: 0.04, sustain: 0, release: 0.04,
    },
    octave: 2,
    waveShape: 'sine',
    description: 'A sawtooth fundamental with lowpass filtering at 800Hz creates the thumpy, round bass tone. The filter envelope opens briefly on attack for the initial "thwack". Low-frequency noise adds finger/string character.',
  },

  saxophone: {
    name: 'Saxophone',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.5, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.4, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.3, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.15, role: '5th Harmonic (H5)' },
      { harmonic: 6, gain: 0.08, role: '6th Harmonic (H6)' },
    ],
    envelope: { attack: 0.03, decay: 0.1, sustain: 0.75, release: 0.2 },
    filter: { type: 'lowpass', frequency: 3500, Q: 1.5 },
    filterEnvelope: { amount: 2000, attack: 0.01, decay: 0.15 },
    fm: { ratio: 1, depth: 100, attack: 0.01, decay: 0.2 },
    vibrato: { rate: 4.5, depth: 6 },
    vibratoDelay: 0.4,
    noise: {
      noiseFilterFreq: 2500, noiseFilterQ: 1.5, noiseFilterType: 'bandpass',
      gain: 0.1, role: 'Reed Breath Noise',
      attack: 0.005, decay: 0.06, sustain: 0, release: 0.06,
    },
    octave: 4,
    waveShape: 'sawtooth',
    description: 'Sawtooth harmonics filtered through a 3500Hz lowpass create the warm sax body. FM synthesis adds the reedy character that decays after attack. Filter envelope opens briefly for the tongued attack. Vibrato enters late (0.4s), mimicking a real saxophonist\'s style.',
  },

  piano: {
    name: 'Piano',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)', decay: 2.0 },
      { harmonic: 2.002, gain: 0.5, role: '2nd Inharmonic (H2)', decay: 1.5 },
      { harmonic: 3.006, gain: 0.3, role: '3rd Inharmonic (H3)', decay: 1.0 },
      { harmonic: 4.013, gain: 0.15, role: '4th Inharmonic (H4)', decay: 0.7 },
      { harmonic: 5.022, gain: 0.08, role: '5th Inharmonic (H5)', decay: 0.5 },
      { harmonic: 6.034, gain: 0.04, role: '6th Inharmonic (H6)', decay: 0.35 },
    ],
    envelope: { attack: 0.001, decay: 2.0, sustain: 0, release: 0.5 },
    filter: { type: 'lowpass', frequency: 6000, Q: 0.5 },
    unison: { voices: 3, detune: 3 },
    percussive: true,
    noise: {
      noiseFilterFreq: 8000, noiseFilterQ: 0.3, noiseFilterType: 'bandpass',
      gain: 0.12, role: 'Hammer Strike',
      attack: 0.001, decay: 0.03, sustain: 0, release: 0.02,
    },
    octave: 4,
    waveShape: 'sine',
    description: 'Inharmonic partials (slightly sharp upper harmonics) model the stiffness of real piano strings. 3-voice unison simulates the 3 strings per note with subtle detuning. Percussive envelope decays to silence — no sustain. Higher harmonics decay faster than lower ones, just like a real piano.',
  },
}

// ─── Alias Map (common typos / alternate names) ──────────────────────────────
const ALIASES = {
  // Trumpet
  trumet: 'trumpet', trumpt: 'trumpet', trum: 'trumpet', trup: 'trumpet',
  trupmet: 'trumpet', trompet: 'trumpet', horn: 'trumpet', brass: 'trumpet',

  // Flute
  flut: 'flute', fluite: 'flute', fluet: 'flute', recorder: 'flute',

  // Clarinet
  clarnet: 'clarinet', clarneet: 'clarinet',
  klarinet: 'clarinet', clarionet: 'clarinet',

  // Violin
  violen: 'violin', violine: 'violin',
  fiddle: 'violin', viola: 'violin', cello: 'violin',

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
}

// ─── Fuzzy Matching ──────────────────────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function findInstrument(query) {
  const q = query.toLowerCase().trim()

  if (INSTRUMENTS[q]) return INSTRUMENTS[q]
  if (ALIASES[q]) return INSTRUMENTS[ALIASES[q]]

  for (const [name, def] of Object.entries(INSTRUMENTS)) {
    if (name.startsWith(q) || q.startsWith(name)) return def
  }

  for (const [alias, target] of Object.entries(ALIASES)) {
    if (alias.startsWith(q) || q.startsWith(alias)) return INSTRUMENTS[target]
  }

  let bestMatch = null, bestDist = Infinity
  for (const [name, def] of Object.entries(INSTRUMENTS)) {
    const d = levenshtein(q, name)
    const threshold = name.length <= 5 ? 2 : 3
    if (d < bestDist && d <= threshold) {
      bestDist = d
      bestMatch = def
    }
  }

  return bestMatch
}

// ─── Modifier Detection ──────────────────────────────────────────────────────

const MODIFIER_WORDS = [
  'bright', 'warm', 'dark', 'soft', 'gentle', 'mellow',
  'harsh', 'sharp', 'hard', 'deep', 'rich', 'thin',
  'brighter', 'warmer', 'softer', 'harsher',
]

function detectModifiers(query) {
  const q = query.toLowerCase()
  const mods = {}
  if (/\bbright\b/.test(q) || /\bbrighter\b/.test(q)) mods.bright = true
  if (/\bwarm\b/.test(q) || /\bdark\b/.test(q) || /\bwarmer\b/.test(q)) mods.warm = true
  if (/\bsoft\b/.test(q) || /\bgentle\b/.test(q) || /\bmellow\b/.test(q) || /\bsofter\b/.test(q)) mods.soft = true
  if (/\bharsh\b/.test(q) || /\bsharp\b/.test(q) || /\bhard\b/.test(q) || /\bharsher\b/.test(q)) mods.harsh = true
  if (/\bdeep\b/.test(q)) mods.warm = true
  if (/\brich\b/.test(q)) mods.bright = true
  if (/\bthin\b/.test(q)) mods.soft = true
  return mods
}

function stripModifiers(query) {
  let q = query.toLowerCase().trim()
  for (const word of MODIFIER_WORDS) {
    q = q.replace(new RegExp('\\b' + word + '\\b', 'g'), '')
  }
  return q.replace(/\s+/g, ' ').trim()
}

// ─── Build Layers ────────────────────────────────────────────────────────────

function buildLayers(instrument, modifiers) {
  const layers = []
  const env = { ...instrument.envelope }

  if (modifiers.soft) {
    env.attack = Math.min(env.attack * 3, 0.5)
    env.release = Math.min(env.release * 1.5, 1.0)
  }
  if (modifiers.harsh) {
    env.attack = Math.max(env.attack * 0.5, 0.001)
  }

  // Compute modifier-adjusted filter (bright/warm shift the cutoff frequency)
  let adjustedFilter = instrument.filter ? { ...instrument.filter } : null
  let adjustedFilterEnv = instrument.filterEnvelope ? { ...instrument.filterEnvelope } : null
  if (adjustedFilter && modifiers.bright) {
    adjustedFilter.frequency = Math.min(adjustedFilter.frequency * 2, 20000)
    if (adjustedFilterEnv) adjustedFilterEnv.amount = Math.min(adjustedFilterEnv.amount * 1.5, 10000)
  }
  if (adjustedFilter && modifiers.warm) {
    adjustedFilter.frequency = Math.max(adjustedFilter.frequency * 0.6, 300)
    if (adjustedFilterEnv) adjustedFilterEnv.amount = Math.max(adjustedFilterEnv.amount * 0.6, 50)
  }
  if (adjustedFilter && modifiers.harsh) {
    adjustedFilter.Q = Math.min(adjustedFilter.Q * 1.5, 20)
    if (adjustedFilterEnv) adjustedFilterEnv.amount = Math.min(adjustedFilterEnv.amount * 1.8, 10000)
  }
  if (adjustedFilter && modifiers.soft) {
    adjustedFilter.Q = Math.max(adjustedFilter.Q * 0.5, 0.1)
  }

  // Harmonic layers — copy DSP features from instrument to each layer
  for (const h of instrument.harmonics) {
    let gain = h.gain
    const hn = h.harmonic

    if (modifiers.bright && hn > 1) gain = Math.min(gain * 2.0, 1.0)
    if (modifiers.warm && hn > 2) gain *= 0.4
    if (modifiers.warm && hn > 4) gain *= 0.3
    if (modifiers.soft && hn > 2) gain *= 0.5
    if (modifiers.soft && hn > 4) gain *= 0.3
    if (modifiers.harsh && hn > 1) gain = Math.min(gain * 1.5, 1.0)

    layers.push({
      waveShape: h.waveShape || instrument.waveShape,
      octave: instrument.octave,
      attack: env.attack,
      decay: h.decay != null ? h.decay : env.decay,
      sustain: env.sustain,
      release: env.release,
      gain: Math.round(gain * 100) / 100,
      harmonic: hn,
      role: h.role,
      ...(adjustedFilter && { filter: adjustedFilter }),
      ...(adjustedFilterEnv && { filterEnvelope: adjustedFilterEnv }),
      ...(instrument.vibrato && { vibrato: instrument.vibrato }),
      ...(instrument.vibratoDelay != null && { vibratoDelay: instrument.vibratoDelay }),
      ...(instrument.tremolo && { tremolo: instrument.tremolo }),
      ...(instrument.unison && { unison: instrument.unison }),
      ...(instrument.fm && { fm: instrument.fm }),
      ...(instrument.percussive && { percussive: instrument.percussive }),
    })
  }

  // Noise layer
  if (instrument.noise) {
    let noiseGain = instrument.noise.gain
    if (modifiers.harsh) noiseGain = Math.min(noiseGain * 2.0, 1.0)
    if (modifiers.soft) noiseGain *= 0.3

    layers.push({
      waveShape: 'noise',
      octave: instrument.octave,
      attack: instrument.noise.attack ?? env.attack * 0.3,
      decay: instrument.noise.decay ?? env.decay * 0.5,
      sustain: instrument.noise.sustain ?? 0,
      release: instrument.noise.release ?? env.release * 0.3,
      gain: Math.round(noiseGain * 100) / 100,
      harmonic: 1,
      role: instrument.noise.role,
      noiseFilterFreq: instrument.noise.noiseFilterFreq,
      noiseFilterQ: instrument.noise.noiseFilterQ,
      ...(instrument.noise.noiseFilterType && { noiseFilterType: instrument.noise.noiseFilterType }),
    })
  }

  return layers
}

// ─── Build Description ───────────────────────────────────────────────────────

function buildDescription(instrument, layers, modifiers) {
  const modKeys = Object.keys(modifiers)
  const modText = modKeys.length > 0
    ? ` — ${modKeys.join(', ')} modifier${modKeys.length > 1 ? 's' : ''} applied`
    : ''
  const hLayers = layers.filter((l) => l.waveShape !== 'noise')
  const nLayers = layers.filter((l) => l.waveShape === 'noise')

  // Detect active DSP features
  const hasFilter = hLayers.some((l) => l.filter)
  const hasFM = hLayers.some((l) => l.fm)
  const hasVibrato = hLayers.some((l) => l.vibrato)
  const hasUnison = hLayers.some((l) => l.unison && l.unison.voices > 1)
  const hasPercussive = hLayers.some((l) => l.percussive)

  let desc = `🎵 **${instrument.name}**${modText}\n\n`
  desc += `Created ${layers.length} layers: ${hLayers.length} harmonic partial`
  desc += hLayers.length !== 1 ? 's' : ''
  desc += ` (${hLayers.map((l) => 'H' + l.harmonic).join(', ')})`

  const features = []
  if (hasFilter) features.push('filter sweeps')
  if (hasFM) features.push('FM synthesis')
  if (hasVibrato) features.push('vibrato')
  if (hasUnison) features.push('unison detuning')
  if (hasPercussive) features.push('percussive envelope')
  if (features.length > 0) desc += ` with ${features.join(', ')}`
  desc += '.'

  if (nLayers.length > 0) {
    desc += `\n• ${nLayers.map((l) => l.role).join(', ')}`
  }

  // Explain modifier effects clearly
  if (modKeys.length > 0) {
    desc += '\n\n**Modifier effects:**'
    if (modifiers.bright) desc += '\n• **Bright** — boosted upper harmonics, filter opened wider for more high-frequency content'
    if (modifiers.warm) desc += '\n• **Warm** — reduced upper harmonics, filter lowered for a darker, mellower tone'
    if (modifiers.soft) desc += '\n• **Soft** — slower attack, reduced harmonics & noise, gentler filter resonance'
    if (modifiers.harsh) desc += '\n• **Harsh** — faster attack, boosted harmonics & noise, sharper filter resonance'
  }

  desc += `\n\nADSR: A=${instrument.envelope.attack}s, D=${instrument.envelope.decay}s, S=${Math.round(instrument.envelope.sustain * 100)}%, R=${instrument.envelope.release}s`
  desc += `\nBase octave: ${instrument.octave}, Wave: ${instrument.waveShape}`

  if (instrument.description) {
    desc += '\n\n' + instrument.description
  }

  desc += '\n\nPlay the keyboard to hear the result! Each layer is independently editable.'

  return desc
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function parseInstrumentQuery(query) {
  if (!query || !query.trim()) {
    return {
      layers: [],
      description: 'Please type an instrument name (e.g. "trumpet", "piano", "flute").',
    }
  }

  const modifiers = detectModifiers(query)
  const cleanedQuery = stripModifiers(query)
  const instrument = findInstrument(cleanedQuery)

  if (!instrument) {
    const available = Object.values(INSTRUMENTS).map((i) => i.name).join(', ')
    return {
      layers: [],
      description: `❓ I couldn't identify "${query}". Try one of: ${available}`,
    }
  }

  const layers = buildLayers(instrument, modifiers)
  const description = buildDescription(instrument, layers, modifiers)

  return { layers, description }
}

export default parseInstrumentQuery
