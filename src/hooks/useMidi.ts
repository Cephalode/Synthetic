/**
 * Web MIDI API integration hook.
 * Provides MIDI input access and connection status tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface MidiState {
  supported: boolean;
  enabled: boolean;
  inputs: string[];
  lastNote: number | null;
}

export interface UseMidiResult extends MidiState {
  requestAccess: () => void;
}

export function useMidi(
  onNoteOn: (note: number, velocity: number) => void,
  onNoteOff: (note: number) => void,
): UseMidiResult {
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator);
  const [enabled, setEnabled] = useState(false);
  const [inputs, setInputs] = useState<string[]>([]);
  const [lastNote, setLastNote] = useState<number | null>(null);
  const cbRef = useRef({ onNoteOn, onNoteOff });
  cbRef.current = { onNoteOn, onNoteOff };

  const bindInputs = useCallback((access: MIDIAccess) => {
    const names: string[] = [];

    const handleMsg = (e: MIDIMessageEvent) => {
      const d = e.data;
      if (!d) return;
      const status = d[0];
      const note = d[1];
      const velocity = d[2];
      const cmd = status & 0xf0;
      if (cmd === 0x90 && velocity > 0) {
        cbRef.current.onNoteOn(note, velocity / 127);
        setLastNote(note);
      } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
        cbRef.current.onNoteOff(note);
      }
    };

    access.inputs.forEach((input) => {
      names.push(input.name || 'Unknown');
      input.onmidimessage = handleMsg;
    });
    setInputs(names);
  }, []);

  const requestAccess = useCallback(() => {
    if (!supported) return;
    navigator.requestMIDIAccess({ sysex: false }).then((access) => {
      setEnabled(true);
      bindInputs(access);
      access.onstatechange = () => {
        bindInputs(access);
      };
    }).catch(() => {
      console.warn('MIDI access denied or unavailable');
    });
  }, [supported, bindInputs]);

  useEffect(() => {
    if (supported) {
      requestAccess();
    }
  }, [supported, requestAccess]);

  return { supported, enabled, inputs, lastNote, requestAccess };
}
