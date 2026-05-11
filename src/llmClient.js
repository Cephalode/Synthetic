/**
 * LLM API Client for Synthetic — OpenAI-compatible chat completions.
 * Handles settings management, instrument generation, layer modification, and connection testing.
 */

// ---------------------------------------------------------------------------
// Settings Management
// ---------------------------------------------------------------------------

const SETTINGS_KEYS = {
  endpoint: 'synthetic_api_endpoint',
  apiKey: 'synthetic_api_key',
  model: 'synthetic_model',
};

const DEFAULTS = {
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

export function getSettings() {
  return {
    endpoint: localStorage.getItem(SETTINGS_KEYS.endpoint) || DEFAULTS.endpoint,
    apiKey: localStorage.getItem(SETTINGS_KEYS.apiKey) || '',
    model: localStorage.getItem(SETTINGS_KEYS.model) || DEFAULTS.model,
  };
}

export function saveSettings({ endpoint, apiKey, model }) {
  if (endpoint !== undefined) localStorage.setItem(SETTINGS_KEYS.endpoint, endpoint);
  if (apiKey !== undefined) localStorage.setItem(SETTINGS_KEYS.apiKey, apiKey);
  if (model !== undefined) localStorage.setItem(SETTINGS_KEYS.model, model);
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert sound-design assistant for a browser-based additive/subtractive synthesizer called Synthetic. Your job is to design multi-layered instrument presets described as JSON objects.

## Layer Schema

Each layer object may contain the following fields:

| Field            | Type    | Description |
|------------------|---------|-------------|
| waveShape        | string  | "sine", "square", "sawtooth", or "triangle" |
| octave           | number  | Integer offset, typically -3 to 3 |
| attack           | number  | Seconds 0–5 |
| decay            | number  | Seconds 0–5 |
| sustain          | number  | Level 0–1 |
| release          | number  | Seconds 0–5 |
| gain             | number  | 0–1 |
| harmonic         | number  | Harmonic multiplier 1–16 |
| role             | string  | Descriptive role, e.g. "fundamental", "body", "brightness", "sub", "buzz", "air" |
| percussive       | boolean | Short percussive envelope |
| filter           | object  | { type: "lowpass"|"highpass"|"bandpass"|"notch", frequency: 20–20000, Q: 0.1–30 } |
| filterEnvelope   | object  | { base: 20–20000, peak: 20–20000, attack: 0–2, decay: 0–2, amount: 0–1 } |
|| vibrato          | object  | { rate: 0–20 Hz, depth: 0–50 (cents) } |
|| vibratoDelay     | number  | Seconds before vibrato kicks in (0–2) |
|| tremolo          | object  | { rate: 0–20 Hz, depth: 0–1 } |
| unison           | object  | { voices: 2–8, detune: 1–50 (cents) } |
|| fm               | object  | { ratio: 0.1–16, depth: 0–500, attack: 0–2, decay: 0–2 } — frequency modulation from another oscillator |
| noiseFilterFreq  | number  | Noise layer filter frequency 20–20000 |
| noiseFilterQ     | number  | Noise layer filter Q 0.1–30 |
| noiseFilterType  | string  | "lowpass", "highpass", or "bandpass" |

**Required fields per layer:** waveShape, octave, attack, decay, sustain, release, gain, harmonic, role

## Acoustic Synthesis Guidance

- **Brass:** Sawtooth waves with strong odd harmonics, medium attack, filter sweep (low base → high peak), FM buzz on top layers, unison for width.
- **Strings:** Sawtooth or triangle waves, slow attack, sustain ~0.7, moderate vibrato with ~0.3s delay, unison for chorus effect.
- **Woodwinds:** Sine/triangle fundamentals, emphasize odd harmonics, add slight breath noise via noise layer, gentle filter envelope.
- **Piano:** Fast attack, short decay, low sustain, combine sine fundamental with harmonic overtones, optional percussive strike layer.
- **Organ:** Sine waves at harmonic intervals, near-instant attack/release, no filter sweep, tremolo for Leslie effect.
- **Synth Bass:** Saw/square, low octave, short attack, moderate decay, low-pass filter, optional FM for grit.
- **Synth Lead:** Saw/square with vibrato, filter envelope sweep, unison for thickness, moderate gain.
- **Pads:** Slow attack and release, layered detuned waves (unison), low-pass filter, high sustain.

## Gain Budgeting

- The **sum of all layer gains must not exceed 1.5**.
- If the total exceeds 1.5, **scale all gains proportionally** so the total equals 1.5.
- Each individual gain should be 0–1.

## DSP Feature Usage Guide

- **filter:** Use to shape timbre — lowpass for warmth, highpass to remove mud, bandpass for resonant character.
- **filterEnvelope:** Use for dynamic timbral change (e.g. brass brightness, synth sweep).
- **fm:** Use for inharmonic/metallic tones (bells, electric piano) or added grit.
- **vibrato / vibratoDelay:** Use for sustained melodic instruments (strings, voice, wind).
- **tremolo:** Use for amplitude modulation effects (organ Leslie, flute shimmer).
- **unison:** Use for thickening leads, pads, and strings. More voices + detune = wider sound.
- **noiseFilterFreq / noiseFilterQ / noiseFilterType:** Use for breath, air, or percussive transients.
- **percussive:** Set true for transient click layers (piano hammer, mallet strike).

## Output Format

Respond **only** with a JSON object in this exact format — no extra text:

\`\`\`json
{
  "layers": [ ...layer objects... ],
  "description": "A markdown description of the instrument and its design choices."
}
\`\`\`

Each layer MUST include: waveShape, octave, attack, decay, sustain, release, gain, harmonic, role.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callAPI(messages) {
  const { endpoint, apiKey, model } = getSettings();

  if (!apiKey) {
    throw new Error('No API key configured. Please set your API key in settings.');
  }

  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        max_tokens: 4096,
      }),
    });
  } catch (err) {
    throw new Error(`Network error: ${err.message}. Check your endpoint and CORS settings.`, { cause: err });
  }

  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
  }

  if (response.status === 401) {
    throw new Error('Authentication failed. Check your API key.');
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API error ${response.status}: ${body || response.statusText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Unexpected API response format.');
  }

  return data.choices[0].message.content;
}

function parseJSON(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Invalid JSON response from LLM. Raw output:\n' + cleaned.slice(0, 500));
  }
}

const REQUIRED_FIELDS = ['waveShape', 'octave', 'attack', 'decay', 'sustain', 'release', 'gain', 'harmonic', 'role'];

const VALID_WAVES = ['sine', 'square', 'sawtooth', 'triangle'];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function validateLayers(result) {
  if (!result || !Array.isArray(result.layers)) {
    throw new Error('Response missing "layers" array.');
  }

  const layers = result.layers.map((layer, i) => {
    // Ensure required fields
    for (const field of REQUIRED_FIELDS) {
      if (layer[field] === undefined || layer[field] === null) {
        throw new Error(`Layer ${i} missing required field: "${field}"`);
      }
    }

    // Clamp numeric fields to valid ranges
    const out = { ...layer };
    out.octave = clamp(Math.round(out.octave), -3, 3);
    out.attack = clamp(out.attack, 0, 5);
    out.decay = clamp(out.decay, 0, 5);
    out.sustain = clamp(out.sustain, 0, 1);
    out.release = clamp(out.release, 0, 5);
    out.gain = clamp(out.gain, 0, 1);
    out.harmonic = clamp(Math.round(out.harmonic), 1, 16);
    out.waveShape = VALID_WAVES.includes(out.waveShape) ? out.waveShape : 'sine';

    // Clamp optional DSP fields if present
    if (out.vibratoDelay !== undefined) out.vibratoDelay = clamp(out.vibratoDelay, 0, 2);
    if (out.vibrato) {
      out.vibrato.rate = clamp(out.vibrato.rate, 0, 20);
      out.vibrato.depth = clamp(out.vibrato.depth, 0, 50);
    }
    if (out.tremolo) {
      out.tremolo.rate = clamp(out.tremolo.rate, 0, 20);
      out.tremolo.depth = clamp(out.tremolo.depth, 0, 1);
    }
    if (out.noiseFilterFreq !== undefined) out.noiseFilterFreq = clamp(out.noiseFilterFreq, 20, 20000);
    if (out.noiseFilterQ !== undefined) out.noiseFilterQ = clamp(out.noiseFilterQ, 0.1, 30);

    if (out.filter) {
      out.filter.frequency = clamp(out.filter.frequency, 20, 20000);
      out.filter.Q = clamp(out.filter.Q, 0.1, 30);
    }
    if (out.filterEnvelope) {
      out.filterEnvelope.base = clamp(out.filterEnvelope.base, 20, 20000);
      out.filterEnvelope.peak = clamp(out.filterEnvelope.peak, 20, 20000);
      out.filterEnvelope.attack = clamp(out.filterEnvelope.attack, 0, 2);
      out.filterEnvelope.decay = clamp(out.filterEnvelope.decay, 0, 2);
      out.filterEnvelope.amount = clamp(out.filterEnvelope.amount, 0, 1);
    }
    if (out.fm) {
      out.fm.ratio = clamp(out.fm.ratio, 0.1, 16);
      out.fm.depth = clamp(out.fm.depth || out.fm.amount || 200, 0, 500);
      out.fm.attack = clamp(out.fm.attack || 0.01, 0, 2);
      out.fm.decay = clamp(out.fm.decay || 0.15, 0, 2);
      // Normalize: if LLM returned 'amount', map to 'depth' for engine compatibility
      if (out.fm.amount !== undefined && out.fm.depth === undefined) {
        out.fm.depth = out.fm.amount;
      }
    }
    if (out.unison) {
      out.unison.voices = clamp(Math.round(out.unison.voices), 2, 8);
      out.unison.detune = clamp(out.unison.detune, 1, 50);
    }

    return out;
  });

  // Gain budget enforcement
  const totalGain = layers.reduce((sum, l) => sum + l.gain, 0);
  if (totalGain > 1.5) {
    const scale = 1.5 / totalGain;
    layers.forEach(l => { l.gain = Math.round(l.gain * scale * 1000) / 1000; });
  }

  return {
    layers,
    description: result.description || '',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateInstrument(query) {
  if (!query || !query.trim()) {
    throw new Error('Please provide an instrument description.');
  }

  const content = await callAPI([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Create an instrument: ${query}` },
  ]);

  const parsed = parseJSON(content);
  return validateLayers(parsed);
}

export async function modifyLayers(currentLayers, instruction) {
  if (!Array.isArray(currentLayers)) {
    throw new Error('currentLayers must be an array.');
  }
  if (!instruction || !instruction.trim()) {
    throw new Error('Please provide a modification instruction.');
  }

  const modifyPrompt =
    SYSTEM_PROMPT +
    '\n\n## Modification Mode\n\nThe user will provide the current instrument layers as JSON and a modification instruction. ' +
    'Modify the existing layers according to the instruction — do NOT create an entirely new instrument unless explicitly asked. ' +
    'Preserve the overall character while applying the requested changes. Return the same JSON format with all layers (modified and unmodified).';

  const content = await callAPI([
    { role: 'system', content: modifyPrompt },
    {
      role: 'user',
      content: `Current layers:\n\`\`\`json\n${JSON.stringify(currentLayers, null, 2)}\n\`\`\`\n\nModification instruction: ${instruction}`,
    },
  ]);

  const parsed = parseJSON(content);
  return validateLayers(parsed);
}

export async function testConnection() {
  const { endpoint, apiKey, model } = getSettings();

  if (!apiKey) {
    return { success: false, message: 'No API key configured.' };
  }

  const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say "ok".' }],
        max_tokens: 5,
      }),
    });

    if (response.status === 401) {
      return { success: false, message: 'Authentication failed — check your API key.' };
    }
    if (response.status === 429) {
      return { success: false, message: 'Rate limited — connection works but please wait.' };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, message: `API returned ${response.status}: ${body || response.statusText}` };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    return { success: true, message: `Connected to ${model} — "${reply.trim()}"` };
  } catch (err) {
    return { success: false, message: `Network error: ${err.message}` };
  }
}
