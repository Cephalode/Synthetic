/**
 * Local AI brain for instrument query parsing.
 * No API calls — all logic is local.
 *
 * Export: parseInstrumentQuery(query) → { layers, description }
 */

// ─── Instrument Definitions ──────────────────────────────────────────────────
// Each instrument: { harmonics, envelope, noise, octave, waveShape }
// harmonics: array of { harmonic (freq multiplier), gain, role }
// noise: null or { noiseFilterFreq, noiseFilterQ, gain, role }

const INSTRUMENTS = {
  trumpet: {
    name: 'Trumpet',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.7, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.55, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.4, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.35, role: '5th Harmonic (H5)' },
      { harmonic: 6, gain: 0.25, role: '6th Harmonic (H6)' },
      { harmonic: 7, gain: 0.18, role: '7th Harmonic (H7)' },
    ],
    envelope: { attack: 0.012, decay: 0.08, sustain: 0.75, release: 0.15 },
    noise: { noiseFilterFreq: 2800, noiseFilterQ: 1.5, gain: 0.15, role: 'Breath Noise' },
    octave: 4,
    waveShape: 'sawtooth',
  },

  flute: {
    name: 'Flute',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.3, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.1, role: '3rd Harmonic (H3)' },
    ],
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 },
    noise: { noiseFilterFreq: 4000, noiseFilterQ: 0.6, gain: 0.12, role: 'Breath Noise' },
    octave: 5,
    waveShape: 'sine',
  },

  clarinet: {
    name: 'Clarinet',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 3, gain: 0.65, role: '3rd Harmonic (H3)' },
      { harmonic: 5, gain: 0.4, role: '5th Harmonic (H5)' },
      { harmonic: 7, gain: 0.2, role: '7th Harmonic (H7)' },
      { harmonic: 9, gain: 0.1, role: '9th Harmonic (H9)' },
    ],
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.2 },
    noise: { noiseFilterFreq: 1800, noiseFilterQ: 2.0, gain: 0.1, role: 'Reed Noise' },
    octave: 4,
    waveShape: 'sawtooth',
  },

  violin: {
    name: 'Violin',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.8, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.6, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.4, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.3, role: '5th Harmonic (H5)' },
      { harmonic: 6, gain: 0.2, role: '6th Harmonic (H6)' },
    ],
    envelope: { attack: 0.15, decay: 0.1, sustain: 0.85, release: 0.4 },
    noise: null,
    octave: 4,
    waveShape: 'sawtooth',
  },

  organ: {
    name: 'Organ',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.8, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.6, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.4, role: '4th Harmonic (H4)' },
      { harmonic: 6, gain: 0.3, role: '6th Harmonic (H6)' },
      { harmonic: 8, gain: 0.2, role: '8th Harmonic (H8)' },
    ],
    envelope: { attack: 0.001, decay: 0.01, sustain: 1.0, release: 0.05 },
    noise: null,
    octave: 4,
    waveShape: 'sine',
  },

  'electric bass': {
    name: 'Electric Bass',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.6, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.2, role: '3rd Harmonic (H3)' },
    ],
    envelope: { attack: 0.005, decay: 0.15, sustain: 0.5, release: 0.2 },
    noise: { noiseFilterFreq: 800, noiseFilterQ: 0.8, gain: 0.2, role: 'Muted String Noise' },
    octave: 2,
    waveShape: 'sawtooth',
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
    noise: { noiseFilterFreq: 2000, noiseFilterQ: 1.5, gain: 0.1, role: 'Reed Noise' },
    octave: 4,
    waveShape: 'sawtooth',
  },

  piano: {
    name: 'Piano',
    harmonics: [
      { harmonic: 1, gain: 1.0, role: 'Fundamental (H1)' },
      { harmonic: 2, gain: 0.5, role: '2nd Harmonic (H2)' },
      { harmonic: 3, gain: 0.3, role: '3rd Harmonic (H3)' },
      { harmonic: 4, gain: 0.15, role: '4th Harmonic (H4)' },
      { harmonic: 5, gain: 0.08, role: '5th Harmonic (H5)' },
    ],
    envelope: { attack: 0.001, decay: 0.3, sustain: 0.3, release: 1.0 },
    noise: null,
    octave: 4,
    waveShape: 'triangle',
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
  clarinet: 'clarinet', clarnet: 'clarinet', clarneet: 'clarinet',
  klarinet: 'clarinet', clarionet: 'clarinet',

  // Violin
  violen: 'violin', violin: 'violin', violine: 'violin',
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

  // Direct match
  if (INSTRUMENTS[q]) return INSTRUMENTS[q]

  // Alias match
  if (ALIASES[q]) return INSTRUMENTS[ALIASES[q]]

  // Partial match (query is prefix of instrument name, or vice versa)
  for (const [name, def] of Object.entries(INSTRUMENTS)) {
    if (name.startsWith(q) || q.startsWith(name)) return def
  }

  // Alias partial match
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (alias.startsWith(q) || q.startsWith(alias)) return INSTRUMENTS[target]
  }

  // Fuzzy match via Levenshtein (distance ≤ 3 for short names, ≤ 2 for longer)
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

function detectModifiers(query) {
  const q = query.toLowerCase()
  const mods = {}
  if (/\bbright\b/.test(q)) mods.bright = true
  if (/\bwarm\b/.test(q) || /\bdark\b/.test(q)) mods.warm = true
  if (/\bsoft\b/.test(q) || /\bgentle\b/.test(q) || /\bmellow\b/.test(q)) mods.soft = true
  if (/\bharsh\b/.test(q) || /\bsharp\b/.test(q) || /\bhard\b/.test(q)) mods.harsh = true
  return mods
}

// ─── Build Layers ────────────────────────────────────────────────────────────

function buildLayers(instrument, modifiers) {
  const layers = []
  const env = { ...instrument.envelope }

  // Apply envelope modifiers
  if (modifiers.soft) {
    env.attack = Math.min(env.attack * 3, 0.5)
  }
  if (modifiers.harsh) {
    env.attack = Math.max(env.attack * 0.5, 0.001)
  }

  // Harmonic layers
  for (const h of instrument.harmonics) {
    let gain = h.gain
    const harmonicNum = h.harmonic

    // Apply harmonic modifiers
    if (modifiers.bright && harmonicNum > 1) {
      gain = Math.min(gain * 1.5, 1.0)
    }
    if (modifiers.warm && harmonicNum > 2) {
      gain *= 0.5
    }
    if (modifiers.soft && harmonicNum > 3) {
      gain *= 0.3
    }
    if (modifiers.harsh && harmonicNum > 1) {
      gain = Math.min(gain * 1.3, 1.0)
    }

    layers.push({
      waveShape: instrument.waveShape,
      octave: instrument.octave,
      attack: env.attack,
      decay: env.decay,
      sustain: env.sustain,
      release: env.release,
      gain: Math.round(gain * 100) / 100,
      harmonic: harmonicNum,
      role: h.role,
    })
  }

  // Noise layer
  if (instrument.noise) {
    let noiseGain = instrument.noise.gain
    if (modifiers.harsh) noiseGain = Math.min(noiseGain * 1.5, 1.0)
    if (modifiers.soft) noiseGain *= 0.5

    layers.push({
      waveShape: 'noise',
      octave: instrument.octave,
      attack: env.attack,
      decay: env.decay,
      sustain: env.sustain,
      release: env.release,
      gain: Math.round(noiseGain * 100) / 100,
      harmonic: 1,
      role: instrument.noise.role,
      noiseFilterFreq: instrument.noise.noiseFilterFreq,
      noiseFilterQ: instrument.noise.noiseFilterQ,
    })
  }

  return layers
}

// ─── Build Description ───────────────────────────────────────────────────────

function buildDescription(instrument, layers, modifiers) {
  const modText = Object.keys(modifiers).length > 0
    ? ` (${Object.keys(modifiers).join(', ')})`
    : ''
  const harmonicLayers = layers.filter((l) => l.waveShape !== 'noise')
  const noiseLayers = layers.filter((l) => l.waveShape === 'noise')
  const harmonicCount = harmonicLayers.length
  const hasNoise = noiseLayers.length > 0

  let desc = `🎵 **${instrument.name}**${modText} — Created ${layers.length} layers:\n`
  desc += `• ${harmonicCount} harmonic partial${harmonicCount !== 1 ? 's' : ''} (`
  desc += harmonicLayers.map((l) => `H${l.harmonic}`).join(', ')
  desc += ')'
  if (hasNoise) {
    desc += `\n• ${noiseLayers.map((l) => l.role).join(', ')}`
  }
  desc += `\n\nADSR: A=${instrument.envelope.attack}s, D=${instrument.envelope.decay}s, S=${Math.round(instrument.envelope.sustain * 100)}%, R=${instrument.envelope.release}s`
  desc += `\nBase octave: ${instrument.octave}, Wave: ${instrument.waveShape}`
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
  const instrument = findInstrument(query)

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
