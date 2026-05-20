/**
 * Additive synthesis engine — Web Audio API based.
 *
 * Provides pure DSP helper functions and the core note-on / note-off logic
 * for multi-layer additive / subtractive synthesis with unison, FM,
 * vibrato, tremolo, and noise layers.
 *
 * This module is stateless with respect to audio context; the caller
 * (typically a React hook) is responsible for managing the AudioContext
 * lifetime and active-voice map.
 */

import type {
  EnvelopeConfig,
  SynthLayer,
  ActiveVoice,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Floor value for exponentialRamp / setTargetAtTime (cannot target 0). */
const EPSILON = 0.00001;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Convert a MIDI note number to frequency in Hz.
 *
 * @param midi MIDI note number (69 = A4 = 440 Hz).
 * @returns Frequency in Hz.
 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Create (or retrieve) a 1-second white-noise AudioBuffer.
 *
 * The buffer is monophonic, matching the AudioContext sample rate, and
 * contains random samples in the range [−1, 1].  Callers should cache the
 * result rather than re-creating it on every note-on.
 *
 * @param ctx   AudioContext whose sample rate to use.
 * @param cache Optional mutable cache object; if the `'noise'` key is set it
 *              will be returned directly, otherwise the new buffer is stored.
 * @returns An AudioBuffer containing one second of white noise.
 */
export function createNoiseBuffer(
  ctx: BaseAudioContext,
  cache?: { noise?: AudioBuffer },
): AudioBuffer {
  if (cache?.noise) return cache.noise;

  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < sr; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  if (cache) cache.noise = buf;
  return buf;
}

// ---------------------------------------------------------------------------
// Envelope helpers
// ---------------------------------------------------------------------------

/**
 * Apply an ADSR attack-decay envelope to a GainNode.
 *
 * Schedules gain automation starting at `time`.  The attack ramps linearly
 * from 0 to `peak`; decay then exponentially approaches the sustain level.
 * For percussive voices the sustain level is forced to near-zero.
 *
 * @param gainNode   The GainNode whose `.gain` AudioParam to automate.
 * @param ctx        AudioContext (for future-proofing; currently unused).
 * @param env        ADSR envelope parameters.
 * @param time       Scheduler time at which the envelope begins.
 * @param peak       Peak gain value at the top of the attack.
 * @param percussive If `true`, sustain is forced to silence (one-shot).
 */
export function applyEnvelope(
  gainNode: GainNode,
  _ctx: BaseAudioContext,
  env: Partial<EnvelopeConfig>,
  time: number,
  peak: number,
  percussive: boolean,
): void {
  const { attack = 0.01, decay = 0.1, sustain = 0.7 } = env;
  const g = gainNode.gain;

  g.cancelScheduledValues(time);
  g.setValueAtTime(0, time);

  // Attack: linear ramp (standard for most synths)
  g.linearRampToValueAtTime(peak, time + attack);

  // Decay: exponential approach to sustain level
  const sustainLevel = percussive ? EPSILON : Math.max(peak * sustain, EPSILON);
  g.setTargetAtTime(sustainLevel, time + attack, Math.max(decay / 3, 0.001));
}

/**
 * Trigger the release phase of an ADSR envelope.
 *
 * Reads the current gain value, cancels all scheduled automation, and
 * applies an exponential decay to near-zero followed by a hard ramp to
 * absolute zero.
 *
 * @param gainNode The GainNode whose `.gain` AudioParam to release.
 * @param ctx      AudioContext (unused but kept for API symmetry).
 * @param env      Envelope containing the `release` time.
 * @param time     Scheduler time at which release begins.
 */
export function releaseEnvelope(
  gainNode: GainNode,
  _ctx: BaseAudioContext,
  env: Partial<EnvelopeConfig>,
  time: number,
): void {
  const g = gainNode.gain;

  // MUST read current value BEFORE cancelScheduledValues
  const currentVal = g.value;
  g.cancelScheduledValues(time);
  g.setValueAtTime(currentVal, time);

  const releaseTime = env.release ?? 0.3;

  // Exponential decay to silence
  g.setTargetAtTime(EPSILON, time, Math.max(releaseTime / 3, 0.001));

  // Ensure true zero after release finishes
  g.linearRampToValueAtTime(0, time + releaseTime + 0.05);
}

/**
 * Release a filter envelope back to its base frequency.
 *
 * @param filterNode  The BiquadFilterNode whose frequency to release.
 * @param baseFreq    The resting frequency to return to.
 * @param time        Scheduler time at which release begins.
 * @param releaseTime Release duration in seconds.
 */
export function releaseFilterEnvelope(
  filterNode: BiquadFilterNode,
  baseFreq: number,
  time: number,
  releaseTime: number,
): void {
  const f = filterNode.frequency;
  f.cancelScheduledValues(time);
  f.setTargetAtTime(baseFreq, time, Math.max(releaseTime / 3, 0.001));
}

// ---------------------------------------------------------------------------
// Voice management — noteOn / noteOff
// ---------------------------------------------------------------------------

/**
 * Start playing a note across the given layers.
 *
 * For each layer this creates the necessary Web Audio nodes (oscillators,
 * gains, filters, LFOs) and schedules the attack-decay envelope.  If a
 * note with the same MIDI number is already playing its voices are
 * immediately stolen and replaced.
 *
 * @param ctx       The AudioContext to use.
 * @param active    Mutable map of currently-active voices (keyed by note).
 * @param noiseBuf  Cached noise buffer (see `createNoiseBuffer`).
 * @param midiNote  MIDI note number.
 * @param layers    Array of synthesis layers to activate.
 */
export function noteOn(
  ctx: BaseAudioContext,
  active: Record<string, ActiveVoice[]>,
  noiseBuf: AudioBuffer,
  midiNote: number,
  layers: SynthLayer[],
): void {
  const key = `_global_${midiNote}`;

  // ── Retrigger: steal existing note if playing ──
  if (active[key]) {
    const oldVoices = active[key];
    const t = ctx.currentTime;
    for (const voice of oldVoices) {
      for (const node of voice.nodes) {
        try {
          if (
            node instanceof OscillatorNode ||
            node instanceof AudioBufferSourceNode
          )
            node.stop(t);
          node.disconnect();
        } catch {
          /* already stopped */
        }
      }
    }
    delete active[key];
  }

  const voices: ActiveVoice[] = [];

  for (const layer of layers) {
    const freq =
      midiToFreq(midiNote + ((layer.octave ?? 4) - 4) * 12) *
      (layer.harmonic ?? 1);
    const env: EnvelopeConfig = {
      attack: layer.attack ?? 0.01,
      decay: layer.decay ?? 0.1,
      sustain: layer.sustain ?? 0.7,
      release: layer.release ?? 0.3,
    };
    const peak = layer.gain ?? 1;
    const t = ctx.currentTime;

    // ── Noise layer ──────────────────────────────────────────────────
    if (layer.waveShape === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;

      const flt = ctx.createBiquadFilter();
      flt.type = layer.noiseFilterType ?? 'bandpass';
      flt.frequency.setValueAtTime(layer.noiseFilterFreq ?? 2000, t);
      flt.Q.setValueAtTime(layer.noiseFilterQ ?? 1, t);

      const gain = ctx.createGain();
      src.connect(flt);
      flt.connect(gain);
      gain.connect(ctx.destination);

      applyEnvelope(gain, ctx, env, t, peak, layer.percussive ?? false);
      src.start(t);

      voices.push({
        nodes: [src, flt, gain],
        envelope: { gainNode: gain, envelope: env },
        filterNode: null,
        filterBase: null,
      });

      continue; // next layer
    }

    // ── Oscillator layer ─────────────────────────────────────────────
    const uni = layer.unison ?? { voices: 1, detune: 0 };
    const nV = uni.voices ?? 1;
    const spread = uni.detune ?? 0;

    // Optional filter → destination
    let dest: AudioNode = ctx.destination;
    let filterNode: BiquadFilterNode | null = null;

    if (layer.filter) {
      filterNode = ctx.createBiquadFilter();
      filterNode.type = layer.filter.type ?? 'lowpass';
      filterNode.frequency.setValueAtTime(layer.filter.frequency ?? 5000, t);
      filterNode.Q.setValueAtTime(layer.filter.Q ?? 1, t);
      filterNode.connect(dest);
      dest = filterNode;

      if (layer.filterEnvelope) {
        const base = Math.max(layer.filter.frequency ?? 5000, 20); // ensure > 0
        const fe = layer.filterEnvelope;
        const f = filterNode.frequency;
        f.setValueAtTime(base, t);
        // Attack: exponential ramp up
        f.exponentialRampToValueAtTime(
          base + (fe.amount ?? 3000),
          t + (fe.attack ?? 0.01),
        );
        // Decay: exponential approach back to base
        const decayTime = fe.decay ?? 0.1;
        f.setTargetAtTime(
          base,
          t + (fe.attack ?? 0.01),
          Math.max(decayTime / 3, 0.001),
        );
      }
    }

    // Main gain node (ADSR envelope)
    const mainGain = ctx.createGain();
    mainGain.connect(dest);
    applyEnvelope(mainGain, ctx, env, t, peak, layer.percussive ?? false);

    const all: AudioNode[] = [mainGain];
    if (filterNode) all.push(filterNode);

    // Unison voices
    for (let v = 0; v < nV; v++) {
      const vg = ctx.createGain();
      vg.gain.setValueAtTime(1 / nV, t);
      vg.connect(mainGain);

      const osc = ctx.createOscillator();
      osc.type = (layer.waveShape as OscillatorType) ?? 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (nV > 1 && spread > 0) {
        osc.detune.setValueAtTime(
          -spread + (2 * spread * v) / (nV - 1),
          t,
        );
      }

      // ── FM modulation ─────────────────────────────────────────────
      if (layer.fm) {
        const mOsc = ctx.createOscillator();
        mOsc.type = 'sine';
        mOsc.frequency.setValueAtTime(freq * (layer.fm.ratio ?? 2), t);

        const mGain = ctx.createGain();
        const d = layer.fm.depth ?? 200;
        const a = layer.fm.attack ?? 0.01;
        const dc = layer.fm.decay ?? 0.15;

        mGain.gain.setValueAtTime(d, t);
        mGain.gain.setTargetAtTime(EPSILON, t + a, Math.max(dc / 3, 0.001));

        mOsc.connect(mGain);
        mGain.connect(osc.frequency);
        mOsc.start(t);
        all.push(mOsc, mGain);
      }

      // ── Vibrato LFO ──────────────────────────────────────────────
      if (layer.vibrato) {
        const amt =
          freq * Math.pow(2, (layer.vibrato.depth ?? 4) / 1200) - freq;

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(layer.vibrato.rate ?? 5.5, t);

        const lGain = ctx.createGain();
        const del = layer.vibratoDelay ?? 0;
        lGain.gain.setValueAtTime(0, t);
        if (del > 0) lGain.gain.setValueAtTime(0, t + del);
        lGain.gain.linearRampToValueAtTime(amt, t + del + 0.05);

        lfo.connect(lGain);
        lGain.connect(osc.frequency);
        lfo.start(t);
        all.push(lfo, lGain);
      }

      osc.connect(vg);
      osc.start(t);
      all.push(osc, vg);
    }

    // ── Tremolo LFO ────────────────────────────────────────────────
    if (layer.tremolo) {
      const tl = ctx.createOscillator();
      tl.type = 'sine';
      tl.frequency.setValueAtTime(layer.tremolo.rate ?? 4, t);

      const tg = ctx.createGain();
      tg.gain.setValueAtTime(layer.tremolo.depth ?? 0.15, t);

      tl.connect(tg);
      tg.connect(mainGain.gain);
      tl.start(t);
      all.push(tl, tg);
    }

    voices.push({
      nodes: all,
      envelope: { gainNode: mainGain, envelope: env },
      filterNode: filterNode ?? null,
      filterBase: layer.filter ? (layer.filter.frequency ?? 5000) : null,
    });
  }

  active[key] = voices;
}

/**
 * Release all voices for a given MIDI note.
 *
 * Applies the release envelope to each voice's gain and filter, schedules
 * source nodes to stop, and defers disconnection until the release tail
 * has finished playing.
 *
 * @param ctx      The AudioContext.
 * @param active   Mutable map of currently-active voices.
 * @param midiNote MIDI note number to release.
 */
export function noteOff(
  ctx: BaseAudioContext,
  active: Record<string, ActiveVoice[]>,
  midiNote: number,
): void {
  const key = `_global_${midiNote}`;
  const voices = active[key];
  if (!voices) return;

  const t = ctx.currentTime;

  for (const voice of voices) {
    releaseEnvelope(voice.envelope.gainNode, ctx, voice.envelope.envelope, t);

    if (voice.filterNode && voice.filterBase !== null) {
      releaseFilterEnvelope(
        voice.filterNode,
        voice.filterBase,
        t,
        voice.envelope.envelope.release ?? 0.3,
      );
    }

    const releaseTime = voice.envelope.envelope.release ?? 0.3;
    const stopTime = t + releaseTime + 0.05;

    for (const node of voice.nodes) {
      try {
        if (
          node instanceof OscillatorNode ||
          node instanceof AudioBufferSourceNode
        ) {
          node.stop(stopTime);
        }
      } catch {
        /* already stopped */
      }
    }

    // Delay disconnect until after release + stop have finished
    const nodes = voice.nodes;
    setTimeout(() => {
      for (const node of nodes) {
        try {
          node.disconnect();
        } catch {
          /* already disconnected */
        }
      }
    }, (releaseTime + 0.1) * 1000);
  }

  delete active[key];
}
