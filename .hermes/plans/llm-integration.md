# LLM Integration Plan — Synthetic

## Overview
Add LLM-powered instrument creation (for unknown instruments) and modification (natural language edits to current layers).

## Architecture

### New Files
1. **`src/llmClient.js`** — LLM API client
   - OpenAI-compatible chat completions endpoint
   - System prompt with full layer schema + DSP docs
   - `generateInstrument(query)` — for unknown instruments
   - `modifyLayers(currentLayers, instruction)` — for editing current layers
   - JSON response parsing with validation
   - API key/endpoint stored in localStorage

2. **`src/Settings.jsx`** — Settings panel component
   - Toggle panel (gear icon in chat header)
   - API endpoint URL input (default: https://api.openai.com/v1)
   - API key input (password field, stored in localStorage)
   - Model name input (default: gpt-4o-mini)
   - Test connection button
   - Saved to localStorage on change

### Modified Files
3. **`src/AiChat.jsx`** — Major changes
   - Add `currentLayers` prop
   - Detect modification queries vs instrument queries:
     - Modification: contains "add", "more", "less", "remove", "make", "change", "increase", "decrease", "brighter", "darker", "bass", "treble", etc.
     - Instrument: anything else (try local first, then LLM)
   - Loading state while LLM processes
   - Error handling (no API key, network error, invalid response)
   - Show source badge: "Local Preset" vs "AI Generated"

4. **`src/App.jsx`** — Pass current layers to AiChat
   - Add `layers` prop to `<AiChat>`

5. **`src/index.css`** — Settings panel styles
   - Settings panel overlay/dropdown
   - Source badge styles
   - Loading spinner

## Layer Schema (for LLM system prompt)

```json
{
  "waveShape": "sine | square | sawtooth | triangle | noise",
  "octave": "1-8 (base octave for pitch)",
  "attack": "0.001-2 (seconds, how fast sound reaches full volume)",
  "decay": "0.001-2 (seconds, how fast it drops to sustain level)",
  "sustain": "0-1 (fraction of peak volume held while key is pressed)",
  "release": "0.001-5 (seconds, how long sound rings after key release)",
  "gain": "0-1 (volume of this layer)",
  "harmonic": "1+ (frequency multiplier: 1=fundamental, 2=octave, 3=fifth+octave, etc.)",
  "role": "string describing this layer's purpose (e.g. 'Fundamental', '2nd Harmonic', 'Breath Noise')",
  "percussive": "boolean (if true, sustain=0 and sound decays naturally)",
  "filter": { "type": "lowpass|highpass|bandpass", "frequency": "Hz (20-20000)", "Q": "0.1-20 (resonance)" },
  "filterEnvelope": { "amount": "Hz to sweep during attack", "attack": "seconds", "decay": "seconds" },
  "vibrato": { "depth": "cents (1-50 typical)", "rate": "Hz (4-7 typical)" },
  "vibratoDelay": "seconds before vibrato starts (0-1)",
  "tremolo": { "depth": "0-1 (amplitude modulation depth)", "rate": "Hz (2-8 typical)" },
  "unison": { "voices": "1-5 (detuned copies for thickness)", "detune": "cents (5-20 typical)" },
  "fm": { "ratio": "modulator:carrier ratio (1-8 typical)", "depth": "Hz (50-2000)", "attack": "seconds", "decay": "seconds" },
  "noiseFilterFreq": "Hz (for noise layers, bandpass center)",
  "noiseFilterQ": "0.1-20 (for noise layers)",
  "noiseFilterType": "lowpass|highpass|bandpass (for noise layers)"
}
```

## API Design

### Settings (localStorage)
```
synthetic_api_endpoint: string (default "https://api.openai.com/v1")
synthetic_api_key: string
synthetic_model: string (default "gpt-4o-mini")
```

### LLM Functions

#### generateInstrument(query)
```
POST {endpoint}/chat/completions
Headers: Authorization: Bearer {key}
Body: {
  model: {model},
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Create a synthesizer instrument that sounds like: ${query}` }
  ],
  temperature: 0.7,
  response_format: { type: "json_object" }
}
Expected response: { "layers": [...], "description": "..." }
```

#### modifyLayers(currentLayers, instruction)
```
POST {endpoint}/chat/completions
Body: {
  model: {model},
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Here are the current layers:
${JSON.stringify(currentLayers)}

Modification: ${instruction}` }
  ],
  temperature: 0.7,
  response_format: { type: "json_object" }
}
Expected response: { "layers": [...], "description": "..." }
```

## Query Routing Logic (in AiChat.jsx)

```js
function classifyQuery(query) {
  const q = query.toLowerCase()
  const modPatterns = [
    /(add|remove|more|less|increase|decrease|make|change|turn|boost|cut|raise|lower)/,
    /(bass|treble|bright|dark|warm|harsh|soft|loud|quiet|fast|slow|sharp|smooth).*(more|less|up|down|it|the|a)/i,
    /(more|less)\s+(bass|treble|brightness|warmth|attack|release|gain|harmonics)/i,
  ]
  // If current layers exist AND query matches modification patterns → modify
  // Otherwise → try local instrument, then LLM
}
```

## System Prompt

The system prompt must instruct the LLM to:
1. Analyze the acoustic properties of the requested instrument
2. Build layers using additive synthesis (multiple harmonics as separate layers)
3. Apply appropriate DSP features for realism
4. Output valid JSON matching the layer schema exactly
5. Keep total gain reasonable (sum of all layer gains ≤ 1.5)

Full prompt text in the implementation (too long for this plan doc).

## Error Handling
- No API key: show friendly message with link to settings
- Network error: show error, suggest checking endpoint
- Invalid JSON: try to extract JSON from markdown code blocks, fallback to error
- Rate limit: show "rate limited, try again in a moment"
- Empty response: show "LLM returned empty, try rephrasing"

## UI Flow
1. User types query → local lookup first
2. If local match → use preset (as before), show "Local Preset" badge
3. If no local match + API key set → show "Generating..." spinner → LLM call → show "AI Generated" badge
4. If no local match + no API key → show error suggesting to add API key in settings
5. If modification detected + layers exist → show "Modifying..." spinner → LLM call → update layers

## Implementation Order
1. Create `src/llmClient.js` (self-contained, no dependencies)
2. Create `src/Settings.jsx` (self-contained UI component)
3. Modify `src/AiChat.jsx` (integrate LLM client + routing logic)
4. Modify `src/App.jsx` (pass layers prop)
5. Add styles to `src/index.css`
