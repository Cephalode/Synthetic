/**
 * Local AI brain for instrument query parsing.
 * No API calls — all logic is local.
 *
 * Export: parseInstrumentQuery(query) → { layers, description }
 */

import { INSTRUMENTS, ALIASES } from './instrumentPresets.js'

// ─── Fuzzy Matching ─────────────────────────────────────────────────────────

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
  const hasTremolo = hLayers.some((l) => l.tremolo)
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
  if (hasTremolo) features.push('tremolo')
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
