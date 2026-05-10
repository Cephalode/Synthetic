import { useRef, useCallback } from 'react'

const EPSILON = 0.00001  // floor for exponentialRamp (can't target 0)

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function applyEnvelope(gainNode, ctx, env, time, peak, percussive) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7 } = env
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(0, time)
  // Attack: linear is fine (most synths use linear attack)
  g.linearRampToValueAtTime(peak, time + attack)
  // Decay: exponential approach to sustain level
  const sustainLevel = percussive ? EPSILON : Math.max(peak * sustain, EPSILON)
  g.setTargetAtTime(sustainLevel, time + attack, Math.max(decay / 3, 0.001))
}

function releaseEnvelope(gainNode, ctx, env, time) {
  const g = gainNode.gain
  // MUST read current value BEFORE cancelScheduledValues
  const currentVal = g.value
  g.cancelScheduledValues(time)
  g.setValueAtTime(currentVal, time)
  const releaseTime = env.release || 0.3
  // Exponential decay to silence using setTargetAtTime
  g.setTargetAtTime(EPSILON, time, Math.max(releaseTime / 3, 0.001))
  // Ensure we hit true zero after release is done
  g.linearRampToValueAtTime(0, time + releaseTime + 0.05)
}

function releaseFilterEnvelope(filterNode, baseFreq, time, releaseTime) {
  const f = filterNode.frequency
  f.cancelScheduledValues(time)
  f.setTargetAtTime(baseFreq, time, Math.max(releaseTime / 3, 0.001))
}

export default function useSynthEngine() {
  const ctxRef = useRef(null)
  const activeRef = useRef({})
  const noiseBufferRef = useRef(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed')
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }, [])

  const getNoiseBuffer = useCallback((ctx) => {
    if (noiseBufferRef.current) return noiseBufferRef.current
    const sr = ctx.sampleRate, buf = ctx.createBuffer(1, sr, sr)
    const d = buf.getChannelData(0)
    for (let i = 0; i < sr; i++) d[i] = Math.random() * 2 - 1
    noiseBufferRef.current = buf
    return buf
  }, [])

  const noteOn = useCallback((midiNote, layers) => {
    const ctx = getCtx()
    const key = `_global_${midiNote}`
    // Retrigger: steal existing note if playing
    if (activeRef.current[key]) {
      const oldVoices = activeRef.current[key]
      const t = ctx.currentTime
      for (const voice of oldVoices) {
        for (const node of voice.nodes) {
          try {
            if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) node.stop(t)
            node.disconnect()
          } catch { /* already stopped */ }
        }
      }
      delete activeRef.current[key]
    }
    const voices = []

    for (const layer of layers) {
      const freq = midiToFreq(midiNote + (layer.octave - 4) * 12) * (layer.harmonic || 1)
      const env = { attack: layer.attack, decay: layer.decay, sustain: layer.sustain, release: layer.release }
      const peak = layer.gain || 1
      const t = ctx.currentTime

      if (layer.waveShape === 'noise') {
        // ── Noise layer: buffer → filter → gain → destination ──
        const src = ctx.createBufferSource()
        src.buffer = getNoiseBuffer(ctx); src.loop = true
        const flt = ctx.createBiquadFilter()
        flt.type = layer.noiseFilterType || 'bandpass'
        flt.frequency.setValueAtTime(layer.noiseFilterFreq || 2000, t)
        flt.Q.setValueAtTime(layer.noiseFilterQ || 1, t)
        const gain = ctx.createGain()
        src.connect(flt); flt.connect(gain); gain.connect(ctx.destination)
        applyEnvelope(gain, ctx, env, t, peak, layer.percussive)
        src.start(t)
        voices.push({
          nodes: [src, flt, gain],
          envelope: { gainNode: gain, envelope: env },
          filterNode: null,
          filterBase: null,
        })
      } else {
        // ── Oscillator layer with optional DSP features ──
        const uni = layer.unison || { voices: 1, detune: 0 }
        const nV = uni.voices || 1, spread = uni.detune || 0

        // Optional filter → destination
        let dest = ctx.destination, filterNode = null
        if (layer.filter) {
          filterNode = ctx.createBiquadFilter()
          filterNode.type = layer.filter.type || 'lowpass'
          filterNode.frequency.setValueAtTime(layer.filter.frequency || 5000, t)
          filterNode.Q.setValueAtTime(layer.filter.Q || 1, t)
          filterNode.connect(dest); dest = filterNode
          if (layer.filterEnvelope) {
            const base = Math.max(layer.filter.frequency || 5000, 20)  // ensure > 0
            const fe = layer.filterEnvelope
            const f = filterNode.frequency
            f.setValueAtTime(base, t)
            // Attack: exponential ramp up
            f.exponentialRampToValueAtTime(base + (fe.amount || 3000), t + (fe.attack || 0.01))
            // Decay: exponential approach back to base
            const decayTime = fe.decay || 0.1
            f.setTargetAtTime(base, t + (fe.attack || 0.01), Math.max(decayTime / 3, 0.001))
          }
        }

        // Main gain node (ADSR envelope)
        const mainGain = ctx.createGain()
        mainGain.connect(dest)
        applyEnvelope(mainGain, ctx, env, t, peak, layer.percussive)

        const all = [mainGain]
        if (filterNode) all.push(filterNode)

        // Unison voices
        for (let v = 0; v < nV; v++) {
          const vg = ctx.createGain()
          vg.gain.setValueAtTime(1 / nV, t)
          vg.connect(mainGain)

          const osc = ctx.createOscillator()
          osc.type = layer.waveShape || 'sine'
          osc.frequency.setValueAtTime(freq, t)
          if (nV > 1 && spread > 0)
            osc.detune.setValueAtTime(-spread + (2 * spread * v) / (nV - 1), t)

          // FM modulation: modulator osc → gain (envelope) → carrier frequency
          if (layer.fm) {
            const mOsc = ctx.createOscillator()
            mOsc.type = 'sine'
            mOsc.frequency.setValueAtTime(freq * (layer.fm.ratio || 2), t)
            const mGain = ctx.createGain()
            const d = layer.fm.depth || 200
            const a = layer.fm.attack || 0.01, dc = layer.fm.decay || 0.15
            mGain.gain.setValueAtTime(d, t)
            // Use setTargetAtTime for exponential FM depth decay
            mGain.gain.setTargetAtTime(EPSILON, t + a, Math.max(dc / 3, 0.001))
            mOsc.connect(mGain); mGain.connect(osc.frequency)
            mOsc.start(t)
            all.push(mOsc, mGain)
          }

          // Vibrato: LFO → gain → oscillator frequency (with optional delay)
          if (layer.vibrato) {
            const amt = freq * Math.pow(2, (layer.vibrato.depth || 4) / 1200) - freq
            const lfo = ctx.createOscillator()
            lfo.type = 'sine'
            lfo.frequency.setValueAtTime(layer.vibrato.rate || 5.5, t)
            const lGain = ctx.createGain()
            const del = layer.vibratoDelay || 0
            lGain.gain.setValueAtTime(0, t)
            if (del > 0) lGain.gain.setValueAtTime(0, t + del)
            lGain.gain.linearRampToValueAtTime(amt, t + del + 0.05)
            lfo.connect(lGain); lGain.connect(osc.frequency)
            lfo.start(t)
            all.push(lfo, lGain)
          }

          osc.connect(vg); osc.start(t)
          all.push(osc, vg)
        }

        // Tremolo: LFO → gain → mainGain.gain
        if (layer.tremolo) {
          const tl = ctx.createOscillator()
          tl.type = 'sine'
          tl.frequency.setValueAtTime(layer.tremolo.rate || 4, t)
          const tg = ctx.createGain()
          tg.gain.setValueAtTime(layer.tremolo.depth || 0.15, t)
          tl.connect(tg); tg.connect(mainGain.gain)
          tl.start(t)
          all.push(tl, tg)
        }

        voices.push({
          nodes: all,
          envelope: { gainNode: mainGain, envelope: env },
          filterNode: filterNode || null,
          filterBase: layer.filter ? (layer.filter.frequency || 5000) : null,
        })
      }
    }

    activeRef.current[key] = voices
  }, [getCtx, getNoiseBuffer])

  const noteOff = useCallback((midiNote) => {
    const key = `_global_${midiNote}`
    const voices = activeRef.current[key]
    if (!voices) return
    const ctx = getCtx(), t = ctx.currentTime

    for (const voice of voices) {
      releaseEnvelope(voice.envelope.gainNode, ctx, voice.envelope.envelope, t)
      if (voice.filterNode && voice.filterBase) {
        releaseFilterEnvelope(voice.filterNode, voice.filterBase, t, voice.envelope.envelope.release || 0.3)
      }
      const releaseTime = voice.envelope.envelope.release || 0.3
      const stopTime = t + releaseTime + 0.05
      for (const node of voice.nodes) {
        try {
          if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
            node.stop(stopTime)
          }
        } catch { /* already stopped */ }
      }
      // Delay disconnect until after release + stop have finished
      const nodes = voice.nodes
      setTimeout(() => {
        for (const node of nodes) {
          try { node.disconnect() } catch { /* already disconnected */ }
        }
      }, (releaseTime + 0.1) * 1000)
    }

    delete activeRef.current[key]
  }, [getCtx])

  return { noteOn, noteOff }
}
