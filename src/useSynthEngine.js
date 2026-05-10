import { useRef, useCallback } from 'react'
import instrumentProfiles from './instrumentProfiles'

// ─── Helpers ────────────────────────────────────────────────────────────────────

// MIDI note number → frequency (Hz)
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Apply ADSR envelope to a GainNode (attack → decay → sustain level)
function applyEnvelope(gainNode, ctx, envelope, time = ctx.currentTime, peak = 1) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7 } = envelope
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(0, time)
  g.linearRampToValueAtTime(peak, time + attack)
  g.linearRampToValueAtTime(peak * sustain, time + attack + decay)
}

// Release phase of ADSR
function releaseEnvelope(gainNode, ctx, envelope, time = ctx.currentTime) {
  const { release = 0.3 } = envelope
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(g.value, time)
  g.linearRampToValueAtTime(0, time + release)
}

// Find profile by id from the registry
function getProfileById(id) {
  return instrumentProfiles.find((p) => p.id === id) || null
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export default function useSynthEngine() {
  const ctxRef = useRef(null)
  const activeRef = useRef({}) // { key: VoiceData[] }
  const noiseBufferRef = useRef(null) // shared white-noise buffer, created lazily

  // ── Audio context singleton ──────────────────────────────────────────────────

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  // ── Shared noise buffer (1 second of white noise, reused) ────────────────────

  const getNoiseBuffer = useCallback((ctx) => {
    if (noiseBufferRef.current) return noiseBufferRef.current
    const sampleRate = ctx.sampleRate
    const length = sampleRate // 1 second
    const buffer = ctx.createBuffer(1, length, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    noiseBufferRef.current = buffer
    return buffer
  }, [])

  // ── Create additive voice (multi-sine oscillators, one per harmonic) ─────────

  const createAdditiveVoice = useCallback((ctx, freq, profile, masterGain) => {
    const harmonics = profile.harmonics || []
    const maxHarmonics = Math.min(harmonics.length, 20)
    const time = ctx.currentTime

    const nodes = [] // track everything for cleanup
    const envelopes = [] // { gainNode, envelope } for release

    for (let h = 0; h < maxHarmonics; h++) {
      const harm = harmonics[h]
      if (!harm || harm.amplitude <= 0) continue

      const harmFreq = freq * (h + 1)

      // Skip harmonics that would alias above Nyquist
      if (harmFreq > ctx.sampleRate / 2) continue

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(harmFreq, time)

      // Slight natural detune on upper harmonics
      if (h > 0) {
        osc.detune.setValueAtTime((Math.random() - 0.5) * 2, time)
      }

      gain.gain.setValueAtTime(0, time)
      osc.connect(gain)
      gain.connect(masterGain)

      // Per-harmonic ADSR envelope
      applyEnvelope(gain, ctx, harm, time, harm.amplitude)

      osc.start(time)

      nodes.push(osc, gain)
      envelopes.push({ gainNode: gain, envelope: harm })
    }

    // ── Detune chorus (brass section etc.) ─────────────────────────────────────
    if (profile.detune && profile.detune.voices > 1) {
      const { voices, spread } = profile.detune
      for (let v = 1; v < voices; v++) {
        const detuneCents = (v / (voices - 1)) * spread * 2 - spread // -spread to +spread
        for (let h = 0; h < maxHarmonics; h++) {
          const harm = harmonics[h]
          if (!harm || harm.amplitude <= 0) continue

          const harmFreq = freq * (h + 1)
          if (harmFreq > ctx.sampleRate / 2) continue

          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.setValueAtTime(harmFreq, time)
          osc.detune.setValueAtTime(detuneCents + (Math.random() - 0.5) * 2, time)

          gain.gain.setValueAtTime(0, time)
          osc.connect(gain)
          gain.connect(masterGain)

          // Slightly lower amplitude for chorus copies
          applyEnvelope(gain, ctx, harm, time, harm.amplitude * 0.5)

          osc.start(time)

          nodes.push(osc, gain)
          envelopes.push({ gainNode: gain, envelope: harm })
        }
      }
    }

    // ── Vibrato LFO (violin etc.) ──────────────────────────────────────────────
    if (profile.vibrato) {
      const { rate, depth } = profile.vibrato
      // Apply vibrato to the fundamental harmonic oscillators (first N)
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.setValueAtTime(rate, time)
      lfoGain.gain.setValueAtTime(0, time)
      // Fade in vibrato over ~0.5s for natural feel
      lfoGain.gain.linearRampToValueAtTime(depth, time + 0.5)

      // Connect LFO to the first oscillator's frequency (fundamental)
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] instanceof OscillatorNode) {
          lfo.connect(lfoGain)
          lfoGain.connect(nodes[i].frequency)
          break
        }
      }

      lfo.start(time)

      nodes.push(lfo, lfoGain)
      envelopes.push({ gainNode: null, envelope: { release: profile.envelope.release } })
    }

    return { nodes, envelopes }
  }, [])

  // ── Create noise layer ───────────────────────────────────────────────────────

  const createNoiseVoice = useCallback((ctx, noiseConfig, masterGain) => {
    if (!noiseConfig || noiseConfig.gain <= 0) return null

    const time = ctx.currentTime
    const buffer = getNoiseBuffer(ctx)

    // AudioBufferSourceNode → BiquadFilter → GainNode → masterGain
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = noiseConfig.type || 'bandpass'
    filter.frequency.setValueAtTime(noiseConfig.frequency || 1000, time)
    filter.Q.setValueAtTime(noiseConfig.Q || 1, time)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, time)

    source.connect(filter)
    filter.connect(gain)
    gain.connect(masterGain)

    // Noise ADSR envelope
    applyEnvelope(gain, ctx, noiseConfig, time, noiseConfig.gain)

    source.start(time)

    return {
      nodes: [source, filter, gain],
      envelopes: [{ gainNode: gain, envelope: noiseConfig }],
    }
  }, [getNoiseBuffer])

  // ── Create wavetable voice (single PeriodicWave oscillator — lightweight) ────

  const createWavetableVoice = useCallback((ctx, freq, profile, gainNode) => {
    const time = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'sine' // custom wave overrides this

    const real = new Float32Array(profile.real.length)
    const imag = new Float32Array(profile.imag.length)
    for (let i = 0; i < profile.real.length; i++) {
      real[i] = profile.real[i] || 0
      imag[i] = profile.imag[i] || 0
    }

    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false })
    osc.setPeriodicWave(wave)

    osc.frequency.setValueAtTime(freq, time)
    osc.detune.setValueAtTime((Math.random() - 0.5) * 2, time)

    osc.connect(gainNode)
    osc.start(time)

    return {
      nodes: [osc],
      envelopes: [{ gainNode, envelope: profile.envelope }],
    }
  }, [])

  // ── Create basic oscillator voice (existing behaviour) ───────────────────────

  const createBasicVoice = useCallback((ctx, freq, layer) => {
    const time = ctx.currentTime
    const envelope = {
      attack: layer.attack,
      decay: layer.decay,
      sustain: layer.sustain,
      release: layer.release,
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = layer.waveShape || 'sine'
    osc.frequency.setValueAtTime(freq, time)

    // Light detune for richness (±5 cents per layer based on id)
    osc.detune.setValueAtTime(((layer.id * 7) % 11) - 5, time)

    osc.connect(gain)
    gain.connect(ctx.destination)

    applyEnvelope(gain, ctx, envelope)

    osc.start(time)

    return {
      nodes: [osc, gain],
      envelopes: [{ gainNode: gain, envelope }],
      // Legacy cleanup style: osc.stop after release
      legacy: true,
      osc,
      gain,
    }
  }, [])

  // ── noteOn ───────────────────────────────────────────────────────────────────

  const noteOn = useCallback((midiNote, layers) => {
    const ctx = getCtx()
    const key = `_global_${midiNote}`

    if (activeRef.current[key]) return // already playing

    const voiceData = [] // one entry per layer

    layers.forEach((layer) => {
      const freq = midiToFreq(midiNote + (layer.octave - 4) * 12)
      const profileId = layer.instrumentProfile
      const profile = profileId ? getProfileById(profileId) : null

      if (profile) {
        // ── Instrument profile mode ──────────────────────────────────────────

        // Master gain for this voice
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(1, ctx.currentTime)
        masterGain.connect(ctx.destination)

        const allNodes = []
        const allEnvelopes = []
        let maxRelease = 0

        // Primary: additive synthesis (multi-sine oscillators)
        const additiveVoice = createAdditiveVoice(ctx, freq, profile, masterGain)
        if (additiveVoice) {
          allNodes.push(...additiveVoice.nodes)
          allEnvelopes.push(...additiveVoice.envelopes)
        }

        // Noise layer
        const noiseVoice = createNoiseVoice(ctx, profile.noise, masterGain)
        if (noiseVoice) {
          allNodes.push(...noiseVoice.nodes)
          allEnvelopes.push(...noiseVoice.envelopes)
        }

        // Track max release time for cleanup
        for (const env of allEnvelopes) {
          const r = env.envelope.release || 0.3
          if (r > maxRelease) maxRelease = r
        }

        voiceData.push({
          type: 'profile',
          nodes: allNodes,
          envelopes: allEnvelopes,
          masterGain,
          maxRelease,
        })
      } else {
        // ── Basic oscillator mode (existing behaviour) ───────────────────────
        const voice = createBasicVoice(ctx, freq, layer)
        voiceData.push({
          type: 'basic',
          ...voice,
        })
      }
    })

    activeRef.current[key] = voiceData
  }, [getCtx, createAdditiveVoice, createNoiseVoice, createBasicVoice])

  // ── noteOff ──────────────────────────────────────────────────────────────────

  const noteOff = useCallback((midiNote) => {
    const key = `_global_${midiNote}`
    const voiceData = activeRef.current[key]
    if (!voiceData) return

    const ctx = getCtx()
    const time = ctx.currentTime

    voiceData.forEach((voice) => {
      if (voice.type === 'profile') {
        // Release all envelopes
        voice.envelopes.forEach(({ gainNode, envelope }) => {
          if (gainNode) {
            releaseEnvelope(gainNode, ctx, envelope, time)
          }
        })

        // Fade out master gain as safety net
        const mg = voice.masterGain
        if (mg) {
          mg.gain.cancelScheduledValues(time)
          mg.gain.setValueAtTime(mg.gain.value, time)
          mg.gain.linearRampToValueAtTime(0, time + voice.maxRelease + 0.05)
        }

        // Stop and disconnect all nodes after release
        const stopTime = time + voice.maxRelease + 0.1
        voice.nodes.forEach((node) => {
          try {
            if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
              node.stop(stopTime)
            }
            node.disconnect()
          } catch {
            // Already stopped/disconnected — ignore
          }
        })

        // Disconnect master gain
        if (mg) {
          try {
            mg.disconnect()
          } catch {
            // ignore
          }
        }
      } else if (voice.type === 'basic') {
        // Legacy basic oscillator cleanup
        const envelope = voice.envelopes[0].envelope
        releaseEnvelope(voice.gain, ctx, envelope, time)
        voice.osc.stop(time + envelope.release + 0.05)
      }
    })

    delete activeRef.current[key]
  }, [getCtx])

  // ── Expose API ───────────────────────────────────────────────────────────────

  // Utility: create a wavetable voice (for preview / lightweight mode)
  const playWavetableNote = useCallback((midiNote, profileId, duration = 0.5) => {
    const ctx = getCtx()
    const profile = getProfileById(profileId)
    if (!profile) return

    const freq = midiToFreq(midiNote)
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    const voice = createWavetableVoice(ctx, freq, profile, gain)
    applyEnvelope(gain, ctx, profile.envelope, ctx.currentTime, 0.5)

    const maxRelease = profile.envelope.release || 0.3
    setTimeout(() => {
      releaseEnvelope(gain, ctx, profile.envelope)
      voice.nodes.forEach((node) => {
        try {
          if (node instanceof OscillatorNode) node.stop(ctx.currentTime + maxRelease + 0.05)
          node.disconnect()
        } catch { /* noop */ }
      })
      try { gain.disconnect() } catch { /* noop */ }
    }, duration * 1000)
  }, [getCtx, createWavetableVoice])

  return { noteOn, noteOff, playWavetableNote }
}
