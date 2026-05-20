# Synthetic Unified — Merge Plan

## Overview
Merge all three synth projects into one TypeScript React app:
- **Synthetic** — Multi-layer additive/wavetable synth with instrument presets, AI chat
- **simple-synth-web** — 6-operator FM synth with Sytrus-style UI, effects chain
- **fourier-synth** — FFT analysis + sample recreation with similarity scoring

## Feature Inventory

| Feature | Source | Priority |
|---------|--------|----------|
| Multi-layer additive synthesis (per-harmonic ADSR, noise, wavetable) | Synthetic | Critical |
| 20+ instrument presets with acoustic data | Synthetic | Critical |
| 6-operator FM/RM/AM/PM synthesis engine | simple-synth-web | Critical |
| Effects chain (reverb, delay, analyser) | simple-synth-web | Critical |
| Factory presets for FM synth | simple-synth-web | Important |
| Sytrus-style UI (tabs, knobs, faders, FM matrix, algorithm diagram) | simple-synth-web | Critical |
| Piano keyboard (C3→C7 with computer keyboard mapping) | simple-synth-web | Critical |
| FFT analysis (radix-2 Cooley-Tukey) | fourier-synth | Critical |
| Harmonic extraction from audio samples | fourier-synth | Critical |
| Offline additive/wave-shape synthesis from FFT data | fourier-synth | Critical |
| Waveform + spectrum canvas visualization | fourier-synth | Important |
| Similarity metrics (MSE, cosine, RMS, centroid) | fourier-synth | Important |
| Test sample generation | fourier-synth | Nice-to-have |
| Audio file upload + decode | fourier-synth | Important |
| AI chat for sound design (LLM integration) | Synthetic | Important |
| LLM client (OpenAI-compatible) | Synthetic | Important |
| Local instrument knowledge (fuzzy matching) | Synthetic | Important |
| Settings panel (API config) | Synthetic | Important |
| Layer management UI (add/remove/edit layers) | Synthetic | Important |
| Waveform scope (real-time analyser display) | simple-synth-web | Important |
| XY pad controller | simple-synth-web | Nice-to-have |
| ADSR curve visualization | simple-synth-web | Important |
| Preset browser | simple-synth-web | Important |

## Architecture

### Tech Stack
- **Vite + React + TypeScript** (strict)
- **TailwindCSS v4** for styling (from simple-synth-web)
- **No backend** — everything runs client-side

### Synthesis Modes (as tabs/views)
The unified app has **three main modes** accessible via a top-level tab bar:

1. **INSTRUMENT** — Synthetic's additive/wavetable engine. Multi-layer synthesis with instrument presets, AI chat, ADSR controls. Uses `useSynthEngine.ts` (ported from JS to TS).
2. **FM SYNTH** — simple-synth-web's 6-operator FM engine. Sytrus-style UI with operator panels, FM matrix, algorithm diagrams, effects. Uses `SynthEngine.ts` + `EffectsChain`.
3. **FOURIER** — fourier-synth's FFT analysis + recreation. Upload/load samples, analyze harmonics, synthesize recreation, compare similarity. Uses `fft.ts`, `analyzer.ts`, `synthesizer.ts`, `similarity.ts`.

### Shared Components
- **Piano keyboard** — simple-synth-web's C3→C7 keyboard (most feature-rich)
- **AI Chat** — Synthetic's LLM chat (works across modes)
- **Settings** — API config panel
- **Waveform scope** — Real-time analyser display (from simple-synth-web)

### File Structure
```
~/devel/synthetic-unified/
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Main app shell with tab navigation
│   ├── App.css                           # Global styles + TailwindCSS
│   ├── types.ts                          # Unified TypeScript types
│   │
│   ├── engine/                           # DSP engines (pure TS, no React)
│   │   ├── additive-synth.ts             # Multi-layer additive/wavetable synth (from Synthetic useSynthEngine)
│   │   ├── fm-synth.ts                   # 6-operator FM engine (from SynthEngine.ts)
│   │   ├── effects.ts                    # Effects chain: reverb, delay, analyser
│   │   ├── fft.ts                        # Radix-2 FFT + IFFT
│   │   ├── analyzer.ts                   # FFT-based harmonic analysis
│   │   ├── fourier-synth.ts              # Offline synthesis from FFT data
│   │   ├── similarity.ts                 # MSE, cosine, RMS, centroid metrics
│   │   └── audio-utils.ts               # Audio decode, test sample generation
│   │
│   ├── data/                             # Static data
│   │   ├── instrument-presets.ts         # 20+ instrument presets (from Synthetic)
│   │   ├── instrument-knowledge.ts       # Local fuzzy matching (from Synthetic)
│   │   ├── fm-presets.ts                 # FM factory presets (from simple-synth-web)
│   │   └── llm-client.ts                # OpenAI-compatible API client
│   │
│   ├── hooks/                            # React hooks
│   │   ├── useAdditiveSynth.ts           # Hook wrapping additive engine
│   │   ├── useFmSynth.ts                 # Hook wrapping FM engine + effects
│   │   └── useFourierAnalysis.ts         # Hook wrapping FFT pipeline
│   │
│   ├── components/
│   │   ├── synth/                        # FM Synth UI (from simple-synth-web)
│   │   │   ├── sytrus-shell.tsx          # Main shell with tab bar
│   │   │   ├── main-panel.tsx            # VOL/CUT/OCT, ADSR, filter
│   │   │   ├── operator-panel.tsx        # Per-operator controls
│   │   │   ├── fm-matrix.tsx             # 6×6 routing grid
│   │   │   ├── algorithm-diagram.tsx     # Algorithm visualization
│   │   │   ├── adsr-curve.tsx            # ADSR envelope visualization
│   │   │   ├── waveform-scope.tsx        # Real-time waveform display
│   │   │   ├── preset-browser.tsx        # Preset selector
│   │   │   ├── piano-keyboard.tsx        # C3→C7 piano keys
│   │   │   ├── knob.tsx                  # Rotary knob SVG component
│   │   │   ├── fader.tsx                 # Vertical fader SVG component
│   │   │   ├── xy-pad.tsx                # XY controller pad
│   │   │   └── panic-button.tsx          # Audio panic/reset
│   │   │
│   │   ├── instrument/                   # Additive Synth UI (from Synthetic)
│   │   │   ├── instrument-panel.tsx      # Instrument preset selector + layer list
│   │   │   ├── layer-card.tsx            # Per-layer controls (wave, ADSR, DSP)
│   │   │   └── layer-manager.tsx         # Add/remove/reorder layers
│   │   │
│   │   ├── fourier/                      # Fourier Analysis UI (from fourier-synth)
│   │   │   ├── audio-uploader.tsx        # File upload + drag-drop
│   │   │   ├── waveform-display.tsx      # Canvas waveform viz
│   │   │   ├── spectrum-display.tsx      # Canvas frequency spectrum
│   │   │   ├── synth-controls.tsx        # Mode + harmonics controls
│   │   │   ├── similarity-score.tsx      # Metrics dashboard
│   │   │   ├── test-samples.tsx          # Built-in test waveform buttons
│   │   │   └── harmonic-table.tsx        # Harmonic analysis table
│   │   │
│   │   └── shared/                       # Cross-mode shared components
│   │       ├── ai-chat.tsx               # LLM chat panel
│   │       ├── settings-panel.tsx         # API settings
│   │       ├── header.tsx                # App header + mode tabs
│   │       └── tab-bar.tsx               # Generic tab bar
│   │
│   └── vite-env.d.ts
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

## Task Breakdown

### Engineering Alpha — Core Engines + Data (6 tasks, batched into 3 rounds)

**Round 1:**
1. Project scaffold (package.json, tsconfig, vite.config, index.html, main.tsx, types.ts) + npm install
2. Port FFT engine: fft.ts, analyzer.ts, fourier-synth.ts, similarity.ts, audio-utils.ts (from fourier-synth, already TS)

**Round 2:**
3. Port FM engine: fm-synth.ts (from SynthEngine.ts), effects.ts (from simple-synth-web)
4. Port additive engine: additive-synth.ts (from Synthetic's useSynthEngine.js → convert to pure TS class)

**Round 3:**
5. Port data files: instrument-presets.ts, instrument-knowledge.ts, fm-presets.ts (JS→TS conversion)
6. Port LLM client: llm-client.ts + create React hooks: useAdditiveSynth.ts, useFmSynth.ts, useFourierAnalysis.ts

### Engineering Beta — UI Components (6 tasks, batched into 3 rounds)

**Round 1:**
1. Shared components: header.tsx (with mode tabs), tab-bar.tsx, settings-panel.tsx, ai-chat.tsx + App.tsx shell + App.css (TailwindCSS)
2. FM Synth UI: knob.tsx, fader.tsx, piano-keyboard.tsx, xy-pad.tsx, panic-button.tsx, adsr-curve.tsx

**Round 2:**
3. FM Synth UI part 2: sytrus-shell.tsx, main-panel.tsx, operator-panel.tsx, fm-matrix.tsx, algorithm-diagram.tsx, waveform-scope.tsx, preset-browser.tsx
4. Instrument UI: instrument-panel.tsx, layer-card.tsx, layer-manager.tsx

**Round 3:**
5. Fourier UI: audio-uploader.tsx, waveform-display.tsx, spectrum-display.tsx, synth-controls.tsx, similarity-score.tsx, test-samples.tsx, harmonic-table.tsx
6. Final wiring: App.tsx complete with all three modes, cross-mode features (shared piano keyboard, AI chat accessible from all modes)

### Validation Team
1. TypeScript compilation (tsc --noEmit)
2. Vite build (npm run build)
3. Dev server smoke test (npm run dev)
4. All three modes render without errors
5. Fix any issues found
