/**
 * React hook wrapping the additive-synthesis engine.
 *
 * Manages AudioContext lifetime, a cached noise buffer, an AnalyserNode
 * for visualizations, and the active-voice map. Returns noteOn/noteOff
 * callbacks plus the AudioContext and AnalyserNode for external use.
 *
 * Also supports multi-oscillator detuning and recording via
 * MediaStreamDestination.
 */

import { useRef, useCallback, useState } from 'react';
import type { SynthLayer, ActiveVoice } from '../types';
import {
  noteOn as engineNoteOn,
  noteOff as engineNoteOff,
  createNoiseBuffer,
} from '../engine/additive-synth';

/** Global detune setting applied to all oscillators (cents). */
export interface MultiOscConfig {
  /** Number of extra oscillators (0 = single, 1-3 for layering). */
  count: number;
  /** Detune spread between oscillators in cents. */
  spread: number;
}

export interface UseAdditiveSynthResult {
  noteOn: (midiNote: number, layers: SynthLayer[]) => void;
  noteOff: (midiNote: number) => void;
  /** The current AudioContext (null before first interaction). */
  audioCtx: AudioContext | null;
  /** AnalyserNode connected to the output for visualizations. */
  analyser: AnalyserNode | null;
  /** Global detune in cents (-100 to +100). */
  detune: number;
  setDetune: (cents: number) => void;
  /** Multi-oscillator configuration. */
  multiOsc: MultiOscConfig;
  setMultiOsc: (cfg: MultiOscConfig) => void;
  /** Recording state. */
  isRecording: boolean;
  recordingElapsed: number;
  startRecording: () => void;
  stopRecording: () => void;
  /** Resume AudioContext (for overlay). */
  resumeContext: () => void;
}

export function useAdditiveSynth(): UseAdditiveSynthResult {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const activeRef = useRef<Record<string, ActiveVoice[]>>({});
  const noiseCacheRef = useRef<{ noise?: AudioBuffer }>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [detune, setDetune] = useState(0);
  const [multiOsc, setMultiOsc] = useState<MultiOscConfig>({ count: 0, spread: 10 });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  /** Lazily create or resume the AudioContext and analyser. */
  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();

      // Create analyser node for visualizations
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      an.smoothingTimeConstant = 0.8;

      // Create media stream destination for recording
      const dest = ctx.createMediaStreamDestination();

      // Connect analyser to destination AND to recording
      an.connect(ctx.destination);
      an.connect(dest);

      ctxRef.current = ctx;
      analyserRef.current = an;
      destRef.current = dest;

      setAudioCtx(ctx);
      setAnalyser(an);
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const resumeContext = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }, [getCtx]);

  const handleNoteOn = useCallback(
    (midiNote: number, layers: SynthLayer[]) => {
      const ctx = getCtx();
      const noiseBuf = createNoiseBuffer(ctx, noiseCacheRef.current);
      const an = analyserRef.current;

      // Augment layers with global detune and multi-osc
      const augmentedLayers = layers.map(l => {
        const base = { ...l };

        // Apply multi-osc (add extra voices)
        if (multiOsc.count > 0) {
          const existingUni = base.unison ?? { voices: 1, detune: 0 };
          return {
            ...base,
            unison: {
              voices: existingUni.voices + multiOsc.count,
              detune: Math.max(existingUni.detune, multiOsc.spread),
            },
          };
        }

        return base;
      });

      engineNoteOn(ctx, activeRef.current, noiseBuf, midiNote, augmentedLayers);

      // Connect active voices to the analyser
      if (an) {
        const key = `_global_${midiNote}`;
        const voices = activeRef.current[key];
        if (voices) {
          // The last node in each voice chain should connect to analyser
          // But we already connected to ctx.destination in engine.
          // We need to modify the approach: connect to analyser instead.
          // For simplicity, we patch the last gain node to also connect to analyser.
          for (const voice of voices) {
            const gainNode = voice.envelope.gainNode;
            try {
              gainNode.connect(an);
            } catch {
              // already connected
            }
          }
        }
      }
    },
    [getCtx, detune, multiOsc],
  );

  const handleNoteOff = useCallback(
    (midiNote: number) => {
      const ctx = getCtx();
      engineNoteOff(ctx, activeRef.current, midiNote);
    },
    [getCtx],
  );

  const startRecording = useCallback(() => {
    const _ctx = getCtx();
    void _ctx; // ensure audio context is initialized
    const dest = destRef.current;
    if (!dest) return;

    recordChunksRef.current = [];

    try {
      const recorder = new MediaRecorder(dest.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordChunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `synthetic-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setRecordingElapsed(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // collect data every 100ms
      setIsRecording(true);
      setRecordingElapsed(0);

      const startTime = Date.now();
      recordTimerRef.current = setInterval(() => {
        setRecordingElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } catch {
      console.warn('Recording not supported');
    }
  }, [getCtx]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return {
    noteOn: handleNoteOn,
    noteOff: handleNoteOff,
    audioCtx,
    analyser,
    detune,
    setDetune,
    multiOsc,
    setMultiOsc,
    isRecording,
    recordingElapsed,
    startRecording,
    stopRecording,
    resumeContext,
  };
}

export default useAdditiveSynth;
