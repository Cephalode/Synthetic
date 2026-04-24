import { useRef, useCallback } from 'react'

// MIDI note number → frequency
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Apply ADSR envelope to a gain node
function applyEnvelope(gainNode, ctx, envelope, time = ctx.currentTime) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.3 } = envelope
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(0, time)
  g.linearRampToValueAtTime(1, time + attack)
  g.linearRampToValueAtTime(sustain, time + attack + decay)
}

function releaseEnvelope(gainNode, ctx, envelope, time = ctx.currentTime) {
  const { release = 0.3 } = envelope
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(g.value, time)
  g.linearRampToValueAtTime(0, time + release)
}

export default function useSynthEngine() {
  const ctxRef = useRef(null)
  const activeRef = useRef({}) // { "layerId-midiNote": { oscs, gains } }

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const noteOn = useCallback((midiNote, layers) => {
    const ctx = getCtx()
    const key = `_global_${midiNote}`

    if (activeRef.current[key]) return // already playing

    const layerEntries = []

    layers.forEach((layer) => {
      const freq = midiToFreq(midiNote + (layer.octave - 4) * 12)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = layer.waveShape
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      // Light detune for richness (±5 cents per layer based on id)
      osc.detune.setValueAtTime(((layer.id * 7) % 11) - 5, ctx.currentTime)

      osc.connect(gain)
      gain.connect(ctx.destination)

      applyEnvelope(gain, ctx, {
        attack: layer.attack,
        decay: layer.decay,
        sustain: layer.sustain,
        release: layer.release,
      })

      osc.start(ctx.currentTime)
      layerEntries.push({ osc, gain, envelope: { attack: layer.attack, decay: layer.decay, sustain: layer.sustain, release: layer.release } })
    })

    activeRef.current[key] = layerEntries
  }, [getCtx])

  const noteOff = useCallback((midiNote) => {
    const key = `_global_${midiNote}`
    const entries = activeRef.current[key]
    if (!entries) return

    const ctx = getCtx()
    entries.forEach(({ osc, gain, envelope }) => {
      releaseEnvelope(gain, ctx, envelope)
      osc.stop(ctx.currentTime + envelope.release + 0.05)
    })

    delete activeRef.current[key]
  }, [getCtx])

  return { noteOn, noteOff }
}
