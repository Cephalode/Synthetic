import { useRef, useCallback } from 'react'

// ─── Helpers ────────────────────────────────────────────────────────────────

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function applyEnvelope(gainNode, ctx, envelope, time = ctx.currentTime, peak = 1) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7 } = envelope
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(0, time)
  g.linearRampToValueAtTime(peak, time + attack)
  g.linearRampToValueAtTime(peak * sustain, time + attack + decay)
}

function releaseEnvelope(gainNode, ctx, envelope, time = ctx.currentTime) {
  const { release = 0.3 } = envelope
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(g.value, time)
  g.linearRampToValueAtTime(0, time + release)
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export default function useSynthEngine() {
  const ctxRef = useRef(null)
  const activeRef = useRef({})
  const noiseBufferRef = useRef(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const getNoiseBuffer = useCallback((ctx) => {
    if (noiseBufferRef.current) return noiseBufferRef.current
    const sr = ctx.sampleRate
    const buffer = ctx.createBuffer(1, sr, sr)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < sr; i++) data[i] = Math.random() * 2 - 1
    noiseBufferRef.current = buffer
    return buffer
  }, [])

  // ── noteOn ────────────────────────────────────────────────────────────────

  const noteOn = useCallback((midiNote, layers) => {
    const ctx = getCtx()
    const key = `_global_${midiNote}`
    if (activeRef.current[key]) return

    const voices = []

    layers.forEach((layer) => {
      const freq = midiToFreq(midiNote + (layer.octave - 4) * 12) * (layer.harmonic || 1)
      const envelope = {
        attack: layer.attack,
        decay: layer.decay,
        sustain: layer.sustain,
        release: layer.release,
      }
      const peak = layer.gain || 1
      const time = ctx.currentTime

      if (layer.waveShape === 'noise') {
        // Noise layer: buffer source → bandpass filter → gain → destination
        const source = ctx.createBufferSource()
        source.buffer = getNoiseBuffer(ctx)
        source.loop = true

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(layer.noiseFilterFreq || 2000, time)
        filter.Q.setValueAtTime(layer.noiseFilterQ || 1, time)

        const gain = ctx.createGain()
        source.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)
        applyEnvelope(gain, ctx, envelope, time, peak)
        source.start(time)

        voices.push({ nodes: [source, filter, gain], envelope: { gainNode: gain, envelope } })
      } else {
        // Regular oscillator layer
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = layer.waveShape || 'sine'
        osc.frequency.setValueAtTime(freq, time)
        osc.connect(gain)
        gain.connect(ctx.destination)
        applyEnvelope(gain, ctx, envelope, time, peak)
        osc.start(time)

        voices.push({ nodes: [osc, gain], envelope: { gainNode: gain, envelope }, osc, gain })
      }
    })

    activeRef.current[key] = voices
  }, [getCtx, getNoiseBuffer])

  // ── noteOff ───────────────────────────────────────────────────────────────

  const noteOff = useCallback((midiNote) => {
    const key = `_global_${midiNote}`
    const voices = activeRef.current[key]
    if (!voices) return

    const ctx = getCtx()
    const time = ctx.currentTime

    voices.forEach((voice) => {
      releaseEnvelope(voice.envelope.gainNode, ctx, voice.envelope.envelope, time)
      const rel = voice.envelope.envelope.release || 0.3
      const stopTime = time + rel + 0.05

      voice.nodes.forEach((node) => {
        try {
          if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
            node.stop(stopTime)
          }
          node.disconnect()
        } catch { /* already stopped */ }
      })
    })

    delete activeRef.current[key]
  }, [getCtx])

  return { noteOn, noteOff }
}
