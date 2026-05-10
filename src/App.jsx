import { useState, useCallback } from 'react';
import './App.css';
import useSynthEngine from './useSynthEngine';
import LayerCard from './LayerCard';
import PianoKeyboard from './PianoKeyboard';
import AiChat from './AiChat';

const DEFAULT_LAYER = {
  waveShape: 'sine',
  attack: 0.01,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
  octave: 4,
  harmonic: 1,
  gain: 1,
};

let nextId = 2;

export default function App() {
  const [layers, setLayers] = useState([{ id: 1, ...DEFAULT_LAYER }]);
  const [baseOctave, setBaseOctave] = useState(4);
  const { noteOn, noteOff } = useSynthEngine();

  const addLayer = useCallback(() => {
    setLayers((prev) => [...prev, { id: nextId++, ...DEFAULT_LAYER }]);
  }, []);

  const removeLayer = useCallback((id) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id));
  }, []);

  const updateLayer = useCallback((id, changes) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...changes } : layer))
    );
  }, []);

  const handleAiGenerate = useCallback((aiLayers) => {
    const newLayers = aiLayers.map((l) => ({ id: nextId++, ...l }));
    setLayers(newLayers);
  }, []);

  const handleClearLayers = useCallback(() => {
    setLayers([{ id: nextId++, ...DEFAULT_LAYER }]);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Synthetic</h1>
        <div className="global-controls">
          <label>
            Base Octave:{' '}
            <select value={baseOctave} onChange={(e) => setBaseOctave(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <button className="add-layer-btn" onClick={addLayer}>
            + Add Layer
          </button>
        </div>
      </header>

      <div className="app-content">
        <AiChat onGenerateLayers={handleAiGenerate} onClearLayers={handleClearLayers} />

        <div className="synth-panel">
          <section className="layers">
            {layers.map((layer, index) => (
              <LayerCard
                key={layer.id}
                layer={layer}
                index={index}
                onUpdate={(updated) => updateLayer(layer.id, updated)}
                onDelete={() => removeLayer(layer.id)}
              />
            ))}
          </section>

          <PianoKeyboard
            baseOctave={baseOctave}
            layers={layers}
            noteOn={noteOn}
            noteOff={noteOff}
          />
        </div>
      </div>
    </div>
  );
}
