/**
 * React hook wrapping the additive-synthesis engine.
 *
 * Manages AudioContext lifetime, a cached noise buffer, and the active-voice
 * map.  Returns `{ noteOn, noteOff }` callbacks that are safe to call from
 * event handlers or keyboard listeners.
 *
 * @example
 * ```tsx
 * const { noteOn, noteOff } = useAdditiveSynth();
 *
 * const handleKeyDown = (midi) => {
 *   noteOn(midi, layers);
 * };
 * const handleKeyUp = (midi) => {
 *   noteOff(midi);
 * };
 * ```
 */

import { useRef, useCallback } from 'react';
import type { SynthLayer, ActiveVoice } from '../types';
import {
  noteOn as engineNoteOn,
  noteOff as engineNoteOff,
  createNoiseBuffer,
} from '../engine/additive-synth';

/** Return type of the {@link useAdditiveSynth} hook. */
export interface UseAdditiveSynthResult {
  /**
   * Start playing a note.
   *
   * @param midiNote MIDI note number (60 = C4).
   * @param layers   Synthesis layers to activate.
   */
  noteOn: (midiNote: number, layers: SynthLayer[]) => void;

  /**
   * Release a playing note (triggers release envelope).
   *
   * @param midiNote MIDI note number to release.
   */
  noteOff: (midiNote: number) => void;
}

/**
 * Hook providing additive-synthesis `noteOn` / `noteOff` callbacks.
 *
 * Internally holds a singleton AudioContext (recreated if closed), a cached
 * noise buffer, and a map of active voices keyed by MIDI note number.
 */
export function useAdditiveSynth(): UseAdditiveSynthResult {
  const ctxRef = useRef<AudioContext | null>(null);
  const activeRef = useRef<Record<string, ActiveVoice[]>>({});
  const noiseCacheRef = useRef<{ noise?: AudioBuffer }>({});

  /** Lazily create or resume the AudioContext. */
  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const handleNoteOn = useCallback(
    (midiNote: number, layers: SynthLayer[]) => {
      const ctx = getCtx();
      const noiseBuf = createNoiseBuffer(ctx, noiseCacheRef.current);
      engineNoteOn(ctx, activeRef.current, noiseBuf, midiNote, layers);
    },
    [getCtx],
  );

  const handleNoteOff = useCallback(
    (midiNote: number) => {
      const ctx = getCtx();
      engineNoteOff(ctx, activeRef.current, midiNote);
    },
    [getCtx],
  );

  return { noteOn: handleNoteOn, noteOff: handleNoteOff };
}

export default useAdditiveSynth;
