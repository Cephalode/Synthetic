/**
 * Visual piano keyboard component (2 octaves, C4-B5).
 * Clickable and keyboard-playable. Teal accent on active keys.
 */

import { useCallback, useMemo } from 'react';

interface PianoKeyboardProps {
  activeNotes: Set<number>;
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
  startOctave?: number;
  octaves?: number;
}

interface KeyDef {
  midi: number;
  note: string;
  isBlack: boolean;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function buildKeys(startOctave: number, octaves: number): KeyDef[] {
  const keys: KeyDef[] = [];
  for (let o = 0; o < octaves; o++) {
    const oct = startOctave + o;
    for (let n = 0; n < 12; n++) {
      const midi = (oct + 1) * 12 + n; // MIDI: C4 = 60
      const noteName = NOTE_NAMES[n] + oct;
      const isBlack = [1, 3, 6, 8, 10].includes(n);
      keys.push({ midi, note: noteName, isBlack });
    }
  }
  // Add final C
  const finalOct = startOctave + octaves;
  keys.push({ midi: (finalOct + 1) * 12, note: 'C' + finalOct, isBlack: false });
  return keys;
}

export default function PianoKeyboard({
  activeNotes,
  onNoteOn,
  onNoteOff,
  startOctave = 4,
  octaves = 2,
}: PianoKeyboardProps) {
  const keys = useMemo(() => buildKeys(startOctave, octaves), [startOctave, octaves]);
  const whiteKeys = useMemo(() => keys.filter(k => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter(k => k.isBlack), [keys]);

  const handleMouseDown = useCallback((midi: number) => {
    onNoteOn(midi);
  }, [onNoteOn]);

  const handleMouseUp = useCallback((midi: number) => {
    onNoteOff(midi);
  }, [onNoteOff]);

  // Map black keys to positions relative to white keys
  // Black keys sit between: C-C#, D-D#, F-F#, G-G#, A-A#
  const blackKeyPositions: Record<string, number> = {
    'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5,
  };

  const whiteKeyWidth = 100 / whiteKeys.length;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Keyboard</h4>
      <div className="relative" style={{ height: 120 }}>
        {/* White keys */}
        {whiteKeys.map((key, i) => {
          const isActive = activeNotes.has(key.midi);
          return (
            <div
              key={key.midi}
              className={`absolute top-0 bottom-0 border border-slate-500 rounded-b cursor-pointer transition-colors select-none
                ${isActive
                  ? 'bg-teal-400 border-teal-500'
                  : 'bg-slate-200 hover:bg-slate-100'
                }`}
              style={{
                left: `${i * whiteKeyWidth}%`,
                width: `${whiteKeyWidth}%`,
              }}
              onMouseDown={(e) => { e.preventDefault(); handleMouseDown(key.midi); }}
              onMouseUp={() => handleMouseUp(key.midi)}
              onMouseLeave={() => { if (activeNotes.has(key.midi)) handleMouseUp(key.midi); }}
              role="button"
              aria-label={key.note}
              aria-pressed={isActive}
            >
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-medium">
                {key.note}
              </span>
            </div>
          );
        })}

        {/* Black keys */}
        {blackKeys.map((key) => {
          const noteName = key.note.replace(/\d+$/, '');
          const pos = blackKeyPositions[noteName];
          if (pos === undefined) return null;

          // Find which white key index this is relative to
          const whiteIndex = Math.floor((key.midi - 12) / 12) * 7 + pos;
          const isActive = activeNotes.has(key.midi);

          return (
            <div
              key={key.midi}
              className={`absolute top-0 rounded-b cursor-pointer z-10 transition-colors select-none
                ${isActive
                  ? 'bg-teal-500 border-teal-600'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-600'
                }`}
              style={{
                left: `${(whiteIndex + 0.65) * whiteKeyWidth}%`,
                width: `${whiteKeyWidth * 0.6}%`,
                height: '60%',
              }}
              onMouseDown={(e) => { e.preventDefault(); handleMouseDown(key.midi); }}
              onMouseUp={() => handleMouseUp(key.midi)}
              onMouseLeave={() => { if (activeNotes.has(key.midi)) handleMouseUp(key.midi); }}
              role="button"
              aria-label={key.note}
              aria-pressed={isActive}
            />
          );
        })}
      </div>
    </div>
  );
}
