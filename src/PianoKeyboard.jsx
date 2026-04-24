import { useState, useEffect, useCallback, useRef } from 'react'

// Build 2 octaves of keyboard mapping
// White keys: A S D F G H J   K L ; '  (C D E F G A B  C D E F)
// Black keys: W E   T Y U   O P   (C# D#  F# G# A#  C# D#)

const KEY_MAP = {
  'a': 0,   // C
  'w': 1,   // C#
  's': 2,   // D
  'e': 3,   // D#
  'd': 4,   // E
  'f': 5,   // F
  't': 6,   // F#
  'g': 7,   // G
  'y': 8,   // G#
  'h': 9,   // A
  'u': 10,  // A#
  'j': 11,  // B
  'k': 12,  // C
  'o': 13,  // C#
  'l': 14,  // D
  'p': 15,  // D#
  ';': 16,  // E
  "'": 17,  // F (was previously mapped incorrectly)
}

// Keyboard key labels for display
const KEY_LABELS = {
  0: 'A', 1: 'W', 2: 'S', 3: 'E', 4: 'D', 5: 'F', 6: 'T',
  7: 'G', 8: 'Y', 9: 'H', 10: 'U', 11: 'J', 12: 'K', 13: 'O',
  14: 'L', 15: 'P', 16: ';', 17: "'",
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export default function PianoKeyboard({ baseOctave, noteOn, noteOff, layers }) {
  const [activeNotes, setActiveNotes] = useState(new Set())
  const pressedKeysRef = useRef(new Set())

  // 2 octaves = 24 notes, starting at C(baseOctave)
  // MIDI: C4 = 60
  const startMidi = 60 + (baseOctave - 4) * 12

  const triggerOn = useCallback((semiTone) => {
    const midi = startMidi + semiTone
    setActiveNotes((prev) => new Set(prev).add(semiTone))
    if (layers.length > 0) {
      noteOn(midi, layers)
    }
  }, [startMidi, noteOn, layers])

  const triggerOff = useCallback((semiTone) => {
    const midi = startMidi + semiTone
    setActiveNotes((prev) => {
      const next = new Set(prev)
      next.delete(semiTone)
      return next
    })
    noteOff(midi)
  }, [startMidi, noteOff])

  // Computer keyboard handling
  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      if (KEY_MAP[key] !== undefined && !pressedKeysRef.current.has(key)) {
        pressedKeysRef.current.add(key)
        triggerOn(KEY_MAP[key])
      }
    }
    const up = (e) => {
      const key = e.key.toLowerCase()
      if (KEY_MAP[key] !== undefined) {
        pressedKeysRef.current.delete(key)
        triggerOff(KEY_MAP[key])
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [triggerOn, triggerOff])

  // Build key layout for 2 octaves
  const whiteNotes = []
  const blackNotes = []

  for (let i = 0; i < 25; i++) {
    const noteInOctave = i % 12
    const octaveNum = baseOctave + Math.floor(i / 12)
    const name = NOTE_NAMES[noteInOctave] + octaveNum
    const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave)

    if (isBlack) {
      blackNotes.push({ semiTone: i, name, isBlack: true })
    } else {
      whiteNotes.push({ semiTone: i, name, isBlack: false })
    }
  }

  // Position black keys relative to white keys
  // Black keys sit between white keys. We compute their left offset.
  const WHITE_KEY_WIDTH = 48
  const BLACK_KEY_WIDTH = 30

  // Map white note index → which black key sits to its right
  // Pattern per octave: C→C#, D→D#, (skip E), F→F#, G→G#, A→A#, (skip B)
  const blackAfterWhite = { 0: true, 1: true, 3: true, 4: true, 5: true } // index in octave

  return (
    <div className="keyboard-section">
      <h2>Keyboard — Octave {baseOctave}–{baseOctave + 1}</h2>
      <div className="keyboard" onMouseLeave={() => {
        // Release all on mouse leave
        activeNotes.forEach((s) => triggerOff(s))
      }}>
        {/* White keys */}
        {whiteNotes.map((note, wi) => {
          const isActive = activeNotes.has(note.semiTone)
          const kbKey = KEY_LABELS[note.semiTone]
          return (
            <div
              key={note.semiTone}
              className={`key-white ${isActive ? 'active' : ''}`}
              onMouseDown={() => triggerOn(note.semiTone)}
              onMouseUp={() => triggerOff(note.semiTone)}
              onMouseLeave={() => { if (activeNotes.has(note.semiTone)) triggerOff(note.semiTone) }}
            >
              <span className="note-name">{note.name}</span>
              {kbKey && <span className="key-binding">{kbKey}</span>}
            </div>
          )
        })}

        {/* Black keys */}
        {(() => {
          const blacks = []
          let whiteIndex = 0
          for (let i = 0; i < 25; i++) {
            const noteInOctave = i % 12
            const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave)
            if (!isBlack) {
              // Check if next note is a black key
              const nextNoteInOctave = (noteInOctave + 1) % 12
              if ([1, 3, 6, 8, 10].includes((i + 1) < 25 ? (i + 1) % 12 : -1) && i + 1 < 25) {
                const semi = i + 1
                const octaveNum = baseOctave + Math.floor(semi / 12)
                const name = NOTE_NAMES[semi % 12] + octaveNum
                const kbKey = KEY_LABELS[semi]
                const isActive = activeNotes.has(semi)
                const leftPos = (whiteIndex + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2 - 1
                blacks.push(
                  <div
                    key={semi}
                    className={`key-black ${isActive ? 'active' : ''}`}
                    style={{ left: `${leftPos}px` }}
                    onMouseDown={(e) => { e.stopPropagation(); triggerOn(semi) }}
                    onMouseUp={() => triggerOff(semi)}
                    onMouseLeave={() => { if (activeNotes.has(semi)) triggerOff(semi) }}
                  >
                    {kbKey && <span className="key-binding">{kbKey}</span>}
                  </div>
                )
              }
              whiteIndex++
            }
          }
          return blacks
        })()}
      </div>
    </div>
  )
}
