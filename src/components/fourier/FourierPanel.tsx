import { useState, useCallback } from 'react';
import { useFourierAnalysis } from '../../hooks/useFourierAnalysis';
import AudioUploader from './AudioUploader';
import WaveformDisplay from './WaveformDisplay';
import SpectrumDisplay from './SpectrumDisplay';
import SynthControls from './SynthControls';
import SimilarityScore from './SimilarityScore';
import TestSamples from './TestSamples';
import BenchmarkRunner from './BenchmarkRunner';
import type { SynthMode } from '../../types';

export default function FourierPanel() {
  const {
    originalAudio, sampleRate, analysis, reconstructed, similarity,
    loadAudio, analyze, synthesizeAndCompare, playOriginal, playReconstructed,
  } = useFourierAnalysis();

  const [synthMode, setSynthMode] = useState<SynthMode>('additive');
  const [numHarmonics, setNumHarmonics] = useState(16);

  const handleSynthesize = useCallback(() => {
    if (!originalAudio) return;
    analyze(numHarmonics);
    synthesizeAndCompare(synthMode, numHarmonics);
  }, [originalAudio, synthMode, numHarmonics, analyze, synthesizeAndCompare]);

  return (
    <div className="fourier-root flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <AudioUploader onAudioLoaded={loadAudio} />
          <TestSamples onSampleSelected={loadAudio} />
          {originalAudio && (
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">
                {sampleRate}Hz — {(originalAudio.length / sampleRate).toFixed(2)}s
              </p>
              <button
                className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-medium"
                onClick={playOriginal}
              >
                ▶ Play Original
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <SynthControls
          mode={synthMode}
          onModeChange={(m) => setSynthMode(m as SynthMode)}
          numHarmonics={numHarmonics}
          onHarmonicsChange={setNumHarmonics}
          onSynthesize={handleSynthesize}
          disabled={!originalAudio}
        />
      </div>

      {/* Waveform Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WaveformDisplay data={originalAudio} sampleRate={sampleRate} title="Original" color="rgb(14, 165, 233)" />
        <WaveformDisplay data={reconstructed} sampleRate={sampleRate} title="Reconstructed" color="rgb(34, 197, 94)" />
      </div>

      {/* Spectrum Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SpectrumDisplay audioData={originalAudio} sampleRate={sampleRate} title="Original Spectrum" color="rgb(14, 165, 233)" />
        <SpectrumDisplay audioData={reconstructed} sampleRate={sampleRate} title="Reconstructed Spectrum" color="rgb(34, 197, 94)" />
      </div>

      {/* Similarity */}
      <SimilarityScore result={similarity} />

      {/* Accuracy Benchmark */}
      <BenchmarkRunner />

      {/* Analysis Details */}
      {analysis && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-2">Harmonic Analysis</h3>
          <p className="text-sm text-slate-400 mb-3">
            Fundamental: <strong className="text-cyan-400">{analysis.fundamentalFreq.toFixed(1)} Hz</strong> |
            Harmonics: <strong className="text-cyan-400">{analysis.harmonics.length}</strong> |
            Centroid: <strong className="text-cyan-400">{analysis.spectralCentroid.toFixed(1)} Hz</strong>
          </p>
          {reconstructed && (
            <button
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium"
              onClick={playReconstructed}
            >
              ▶ Play Reconstruction ({synthMode}, {numHarmonics} harmonics)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
