# ADSR Envelope Fix Plan

## Summary

The ADSR implementation in `useSynthEngine.js` has multiple bugs causing unnatural
sound, audible clicks/pops during note-off, inability to retrigger notes, and
incorrect envelope curves. This plan addresses every issue with exact line-level
changes.

---

## File: `src/useSynthEngine.js`

### Bug 1 — `applyEnvelope` uses `linearRampToValueAtTime` for all segments (lines 7–14)

**Problem:** Linear ramps produce mechanical, unnatural-sounding envelopes.
Decay and release should approximate exponential curves (natural acoustic decay).
Attack can remain linear (many synths use linear attack).

**Current code (lines 7–14):**
```js
function applyEnvelope(gainNode, ctx, env, time, peak, percussive) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7 } = env
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(0, time)
  g.linearRampToValueAtTime(peak, time + attack)
  g.linearRampToValueAtTime(percussive ? 0 : peak * sustain, time + attack + decay)
}
```

**Fix:** Use `setTargetAtTime` for decay. `setTargetAtTime(timeConstant)` produces
an exponential approach: `v(t) = target + (start - target) * e^{-t/τ}`. This is
the standard Web Audio technique for natural envelopes.

- `timeConstant` (τ) of `decay / 3` means the value reaches ~95% of the way to
  the target within `decay` seconds — a good approximation.
- `exponentialRampToValueAtTime` cannot ramp **to** 0, so for percussive (sustain=0),
  we ramp to a tiny epsilon and schedule a final `linearRampToValueAtTime(0)` after.

**Replacement code:**
```js
const EPSILON = 0.00001  // floor for exponentialRamp (can't target 0)

function applyEnvelope(gainNode, ctx, env, time, peak, percussive) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7 } = env
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(0, time)
  // Attack: linear is fine (most synths use linear attack)
  g.linearRampToValueAtTime(peak, time + attack)

  const sustainLevel = percussive ? EPSILON : peak * sustain
  // Decay: exponential approach to sustain level
  g.setTargetAtTime(sustainLevel, time + attack, Math.max(decay / 3, 0.001))
}
```

**Why `setTargetAtTime` instead of `exponentialRampToValueAtTime`:**
- `exponentialRampToValueAtTime` requires a prior `setValueAtTime` at the start
  time and ramps geometrically — but it cannot cross zero and the curve shape
  depends heavily on the start/end ratio.
- `setTargetAtTime` is the standard choice for synth envelopes because it
  produces a smooth exponential approach that works regardless of start value,
  handles retriggering gracefully, and has a single intuitive parameter (τ).

---

### Bug 2 — `releaseEnvelope` captures wrong value after `cancelScheduledValues` (lines 16–21)

**Problem:** This is the **most audible bug**. `cancelScheduledValues(time)` removes
all scheduled events at or after `time`, but the AudioParam's "current value" after
cancellation reverts to the value at the **last `setValueAtTime` call**, NOT the
currently-audible interpolated value. This means:

- If release is called during attack: `g.value` jumps back to `0` (the last
  `setValueAtTime`), causing a click.
- If release is called during decay: `g.value` may jump to the sustain level or
  peak depending on timing.

**Current code (lines 16–21):**
```js
function releaseEnvelope(gainNode, ctx, env, time) {
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(g.value, time)
  g.linearRampToValueAtTime(0, time + (env.release || 0.3))
}
```

**Fix:** Capture the current value *before* cancelling, then use that as the
release start point. Use `setTargetAtTime` for natural release.

```js
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
```

**Critical ordering:** `g.value` must be read **before** `cancelScheduledValues`.
In the current code, `g.value` is read on the same line as `setValueAtTime` but
*after* the cancel — the cancel mutates the nominal value.

---

### Bug 3 — Note retriggering blocked (line 47)

**Problem:** `if (activeRef.current[key]) return` silently drops `noteOn` if the
note is already registered as active. This means:
- Rapid retriggering of the same note is impossible.
- If `noteOff` deletes the key (line 184) but audio is still in release phase,
  retriggering works — but if the user holds the key and the note hasn't been
  released yet, the note is stuck.

**Current code (line 47):**
```js
if (activeRef.current[key]) return
```

**Fix:** Instead of returning, steal the existing note: force-release it first,
then proceed with the new note.

```js
// Retrigger: steal existing note if playing
if (activeRef.current[key]) {
  // Force-release the old note before starting new one
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
```

---

### Bug 4 — Nodes disconnected during release phase (lines 176–180)

**Problem:** In `noteOff`, `node.disconnect()` is called immediately after
scheduling the release envelope and `node.stop(stop)`. However, `disconnect()`
severs the audio graph immediately — the release envelope's output has nowhere
to go, so the sound cuts off abruptly (no release is actually heard).

**Current code (lines 173–181):**
```js
for (const voice of voices) {
  releaseEnvelope(voice.envelope.gainNode, ctx, voice.envelope.envelope, t)
  const stop = t + (voice.envelope.envelope.release || 0.3) + 0.05
  for (const node of voice.nodes) {
    try {
      if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) node.stop(stop)
      node.disconnect()
    } catch { /* already stopped */ }
  }
}
```

**Fix:** Don't disconnect immediately. Only disconnect nodes after `stop` time
has passed. Use `setTimeout` to delay disconnect.

```js
for (const voice of voices) {
  releaseEnvelope(voice.envelope.gainNode, ctx, voice.envelope.envelope, t)
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
```

---

### Bug 5 — Filter envelope uses `linearRampToValueAtTime` (lines 82–88)

**Problem:** Filter frequency should use exponential ramps — frequency perception
is logarithmic, so linear frequency changes sound unnatural.

**Current code (lines 82–88):**
```js
if (layer.filterEnvelope) {
  const base = layer.filter.frequency || 5000
  const fe = layer.filterEnvelope
  const f = filterNode.frequency
  f.setValueAtTime(base, t)
  f.linearRampToValueAtTime(base + (fe.amount || 3000), t + (fe.attack || 0.01))
  f.linearRampToValueAtTime(base, t + (fe.attack || 0.01) + (fe.decay || 0.1))
}
```

**Fix:** Use `exponentialRampToValueAtTime` for frequency ramps. Also, filter
envelope should track the gain envelope's release — currently there's no release
for the filter (it's stuck at `base` after decay, which is fine for sustain, but
if the note is released during the attack/decay phase, the filter frequency is
orphaned at whatever value it was at).

```js
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
```

**Additionally:** The filter envelope needs a release handler in `releaseEnvelope`.
This requires storing the filter node reference alongside the gain node.

---

### Bug 6 — FM modulation envelope uses linear decay (lines 120–122)

**Problem:** FM depth should decay exponentially for natural timbral evolution.

**Current code:**
```js
mGain.gain.setValueAtTime(d, t)
mGain.gain.setValueAtTime(d, t + a)
mGain.gain.linearRampToValueAtTime(0, t + a + dc)
```

**Note:** There's also a redundant `setValueAtTime(d, t + a)` on line 121 — this
sets the same value at a later time, which is harmless but unnecessary.

**Fix:**
```js
mGain.gain.setValueAtTime(d, t)
// Use setTargetAtTime for exponential FM depth decay
mGain.gain.setTargetAtTime(EPSILON, t + a, Math.max(dc / 3, 0.001))
```

---

### Bug 7 — No filter release tracking

**Problem:** When `releaseEnvelope` fires, only the gain node's envelope is
released. The filter frequency stays wherever it was, which can cause a tonal
"hang" — the filter stays open/closed while the volume fades. Real synths close
the filter during release.

**Fix:** Extend the voice data structure to include filter nodes and their base
frequency, then apply a release ramp to the filter in `releaseEnvelope`.

In `applyEnvelope` area, add a new function:

```js
function releaseFilterEnvelope(filterNode, baseFreq, time, releaseTime) {
  const f = filterNode.frequency
  f.cancelScheduledValues(time)
  f.setTargetAtTime(baseFreq, time, Math.max(releaseTime / 3, 0.001))
}
```

Modify voice data structure at the push sites (lines 68, 160):

```js
// Current:
voices.push({ nodes: [src, flt, gain], envelope: { gainNode: gain, envelope: env } })

// New:
voices.push({
  nodes: [src, flt, gain],
  envelope: { gainNode: gain, envelope: env },
  filterNode: null,  // noise layers don't have filter envelope
  filterBase: null,
})
```

For oscillator layers (line 160):
```js
voices.push({
  nodes: all,
  envelope: { gainNode: mainGain, envelope: env },
  filterNode: filterNode || null,
  filterBase: layer.filter ? (layer.filter.frequency || 5000) : null,
})
```

Then in `noteOff` loop:
```js
for (const voice of voices) {
  releaseEnvelope(voice.envelope.gainNode, ctx, voice.envelope.envelope, t)
  if (voice.filterNode && voice.filterBase) {
    releaseFilterEnvelope(voice.filterNode, voice.filterBase, t, voice.envelope.envelope.release || 0.3)
  }
  // ... rest of noteOff logic
}
```

---

### Bug 8 — Percussive decay targets 0 with linearRamp

**Problem:** When `percussive` is true (e.g., piano), the decay ramps to `0`
using `linearRampToValueAtTime`. This is actually the same issue as Bug 1, but
worth calling out because `exponentialRampToValueAtTime` **cannot** ramp to `0`
(it throws or produces no output). The fix in Bug 1 already handles this by
using `setTargetAtTime` with `EPSILON` as the target.

Additionally, for percussive envelopes, the decay time should be longer (piano
has `decay: 2.0`). The current code correctly reads from `env.decay`, so no fix
needed there — just confirming the fix from Bug 1 handles percussive correctly.

---

## Complete Replacement: `applyEnvelope` and `releaseEnvelope`

Here is the complete replacement block for lines 1–21:

```js
import { useRef, useCallback } from 'react'

const EPSILON = 0.00001

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function applyEnvelope(gainNode, ctx, env, time, peak, percussive) {
  const { attack = 0.01, decay = 0.1, sustain = 0.7 } = env
  const g = gainNode.gain
  g.cancelScheduledValues(time)
  g.setValueAtTime(0, time)
  g.linearRampToValueAtTime(peak, time + attack)
  const sustainLevel = percussive ? EPSILON : Math.max(peak * sustain, EPSILON)
  g.setTargetAtTime(sustainLevel, time + attack, Math.max(decay / 3, 0.001))
}

function releaseEnvelope(gainNode, ctx, env, time) {
  const g = gainNode.gain
  const currentVal = g.value            // read BEFORE cancel
  g.cancelScheduledValues(time)
  g.setValueAtTime(currentVal, time)
  const releaseTime = env.release || 0.3
  g.setTargetAtTime(EPSILON, time, Math.max(releaseTime / 3, 0.001))
  g.linearRampToValueAtTime(0, time + releaseTime + 0.05)
}

function releaseFilterEnvelope(filterNode, baseFreq, time, releaseTime) {
  const f = filterNode.frequency
  f.cancelScheduledValues(time)
  f.setTargetAtTime(baseFreq, time, Math.max(releaseTime / 3, 0.001))
}
```

---

## File: `src/LayerCard.jsx` — No changes required

The UI correctly exposes attack/decay/sustain/release sliders with appropriate
ranges (attack 0.001–2, decay 0.001–2, sustain 0–1, release 0.001–5). The min
values of `0.001` prevent zero-duration segments that could cause issues with
`setTargetAtTime`. No changes needed.

---

## File: `src/instrumentKnowledge.js` — Minor improvements (optional)

These are not bugs but would improve instrument presets:

1. **Piano noise layer (line 188):** `sustain: 0` with `decay: 0.03` is extremely
   short. With the fixed exponential decay, the noise burst will sound more
   natural. No code change needed — the Bug 1 fix improves this for free.

2. **Organ (line 118):** `attack: 0.001, decay: 0.01, sustain: 1.0, release: 0.05`
   — with `setTargetAtTime`, the near-instant attack works fine. No change needed.

3. **All instruments:** The `sustain: 0` values in noise layers (trumpet line 37,
   clarinet line 80, etc.) will now correctly use exponential decay to EPSILON
   instead of a jarring linear drop to 0. This is a pure improvement.

---

## Edge Cases to Handle

| Scenario | Current Behavior | Fixed Behavior |
|---|---|---|
| Release during attack | Gain jumps to 0 (click) | Smooth release from current value |
| Release during decay | Gain jumps to sustain or peak (click) | Smooth release from current value |
| Rapid note retrigger (same note) | Second noteOn silently dropped | Old note killed, new note starts |
| Note held past decay end | Sustain holds at correct level | Same (no regression) |
| Percussive note (sustain=0) | Linear fade sounds mechanical | Exponential decay sounds natural |
| Release during filter sweep | Filter frequency frozen at random point | Filter exponentially returns to base |
| Very short attack (< 1ms) | Works | Works — `Math.max(τ, 0.001)` prevents zero τ |
| Zero sustain level | `linearRampToValueAtTime(0)` | `setTargetAtTime(EPSILON)` + ramp to 0 |

---

## Implementation Checklist

- [ ] Add `EPSILON` constant at top of file
- [ ] Replace `applyEnvelope` (lines 7–14)
- [ ] Replace `releaseEnvelope` (lines 16–21)
- [ ] Add `releaseFilterEnvelope` helper function
- [ ] Fix note retriggering (line 47): steal old note instead of returning
- [ ] Fix filter envelope ramps (lines 82–88): use `exponentialRampToValueAtTime` + `setTargetAtTime`
- [ ] Fix FM envelope decay (lines 120–122): use `setTargetAtTime`
- [ ] Store filter node + base freq in voice data structure
- [ ] Fix `noteOff` (lines 173–181): delay `disconnect()` with `setTimeout`
- [ ] Add filter release in `noteOff` loop
- [ ] Test: rapid retriggering of same note
- [ ] Test: release during attack phase (most audible fix)
- [ ] Test: percussive instruments (piano)
- [ ] Test: sustained instruments (organ, violin)
- [ ] Test: noise layers with `sustain: 0`

---

## Risk Assessment

- **Low risk:** `setTargetAtTime` replacement for decay/release — this is the
  standard Web Audio pattern, well-tested in production synthesizers.
- **Medium risk:** Delayed `disconnect()` via `setTimeout` — introduces async
  behavior. The timeout values are small (release + 100ms) and nodes are already
  `.stop()`-ed so they won't produce audio. Disconnect just frees memory.
- **Medium risk:** Note stealing on retrigger — need to ensure old nodes are
  fully cleaned up to avoid memory leaks with rapid playing.
- **Low risk:** Filter release tracking — additive change, no existing behavior
  is removed.
