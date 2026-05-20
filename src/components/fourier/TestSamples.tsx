import React, { useState } from 'react';
import { generateTestSamples } from '../../engine/audioUtils';
import type { TestSample } from '../../types';

interface TestSamplesProps {
  onSampleSelected: (audioData: Float32Array, sampleRate: number, name: string) => void;
}

const SAMPLE_ICONS: Record<string, string> = {
  'Pure Sine 440Hz': '〰',
  'Square Wave 220Hz': '⊓',
  'Sawtooth 330Hz': '⟋',
  'Complex Tone': '♫',
  'Bell-like': '🔔',
};

const TestSamples: React.FC<TestSamplesProps> = ({ onSampleSelected }) => {
  const [samples] = useState<TestSample[]>(() => generateTestSamples());
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const handleClick = (idx: number) => {
    const sample = samples[idx];
    const sampleRate = 44100;
    const duration = 2.0;
    const audioData = sample.generate(sampleRate, duration);
    setActiveIdx(idx);
    onSampleSelected(audioData, sampleRate, sample.name);
  };

  return (
    <div className="panel">
      <h3>Test Samples</h3>
      <div className="test-samples-grid">
        {samples.map((sample, idx) => (
          <button
            key={idx}
            className={`test-sample-btn ${activeIdx === idx ? 'active' : ''}`}
            onClick={() => handleClick(idx)}
            title={`Generate ${sample.name}`}
          >
            <span className="sample-icon">{SAMPLE_ICONS[sample.name] || '~'}</span>
            <span className="sample-name">{sample.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TestSamples;
