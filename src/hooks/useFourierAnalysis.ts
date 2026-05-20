import { useState, useCallback, useRef } from 'react';
import type { AnalysisResult, SynthMode, SimilarityResult } from '../types';
import { analyzeSample } from '../engine/analyzer';
import { synthesize, playBuffer } from '../engine/fourier-synth';
import { computeSimilarity } from '../engine/similarity';

export function useFourierAnalysis() {
  const [originalAudio, setOriginalAudio] = useState<Float32Array | null>(null);
  const [sampleRate, setSampleRate] = useState<number>(44100);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [reconstructed, setReconstructed] = useState<Float32Array | null>(null);
  const [similarity, setSimilarity] = useState<SimilarityResult | null>(null);

  const analysisRef = useRef<AnalysisResult | null>(null);
  const originalRef = useRef<Float32Array | null>(null);
  const srRef = useRef<number>(44100);

  const loadAudio = useCallback((audioData: Float32Array, sr: number) => {
    setOriginalAudio(audioData);
    setSampleRate(sr);
    originalRef.current = audioData;
    srRef.current = sr;
    // Reset
    setAnalysis(null);
    setReconstructed(null);
    setSimilarity(null);
    analysisRef.current = null;
  }, []);

  const analyze = useCallback((maxHarmonics: number = 32) => {
    if (!originalRef.current) return;
    const result = analyzeSample(originalRef.current, srRef.current, maxHarmonics);
    setAnalysis(result);
    analysisRef.current = result;
  }, []);

  const synthesizeAndCompare = useCallback((mode: SynthMode, numHarmonics: number) => {
    const audio = originalRef.current;
    const a = analysisRef.current;
    if (!audio || !a) return;

    const duration = audio.length / srRef.current;
    const recon = synthesize(a, srRef.current, duration, mode, numHarmonics);
    setReconstructed(recon);

    const sim = computeSimilarity(audio, recon, srRef.current);
    setSimilarity(sim);
  }, []);

  const playOriginal = useCallback(() => {
    if (originalRef.current) {
      playBuffer(originalRef.current, srRef.current);
    }
  }, []);

  const playReconstructed = useCallback(() => {
    if (reconstructed) {
      playBuffer(reconstructed, srRef.current);
    }
  }, [reconstructed, sampleRate]);

  return {
    originalAudio, sampleRate, analysis, reconstructed, similarity,
    loadAudio, analyze, synthesizeAndCompare, playOriginal, playReconstructed,
  };
}
