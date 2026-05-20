import React from 'react';
import type { SynthMode } from '../../types';

interface SynthControlsProps {
  mode: SynthMode;
  onModeChange: (mode: SynthMode) => void;
  numHarmonics: number;
  onHarmonicsChange: (n: number) => void;
  onSynthesize: () => void;
  disabled: boolean;
}

const MODES: { value: SynthMode; label: string; desc: string }[] = [
  { value: 'additive', label: 'Additive', desc: 'Sum of sine waves per harmonic' },
  { value: 'sine', label: 'Sine', desc: 'Pure sine at fundamental' },
  { value: 'square', label: 'Square', desc: 'Square wave approximation' },
  { value: 'sawtooth', label: 'Saw', desc: 'Sawtooth wave approximation' },
  { value: 'triangle', label: 'Tri', desc: 'Triangle wave approximation' },
];

const SynthControls: React.FC<SynthControlsProps> = ({
  mode,
  onModeChange,
  numHarmonics,
  onHarmonicsChange,
  onSynthesize,
  disabled,
}) => {
  return (
    <div className="panel">
      <h3>Synthesis Controls</h3>

      <div className="control-group">
        <label className="control-label">Synthesis Mode</label>
        <div className="mode-buttons">
          {MODES.map((m) => (
            <button
              key={m.value}
              className={`mode-btn ${mode === m.value ? 'active' : ''}`}
              onClick={() => onModeChange(m.value)}
              title={m.desc}
              disabled={disabled}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">
          Harmonics: <span className="value">{numHarmonics}</span>
        </label>
        <input
          type="range"
          min="1"
          max="64"
          value={numHarmonics}
          onChange={(e) => onHarmonicsChange(parseInt(e.target.value))}
          className="slider"
          disabled={disabled}
        />
        <div className="slider-labels">
          <span>1</span>
          <span>16</span>
          <span>32</span>
          <span>64</span>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={onSynthesize}
        disabled={disabled}
      >
        {disabled ? 'Load audio first' : '⚡ Synthesize & Compare'}
      </button>
    </div>
  );
};

export default SynthControls;
