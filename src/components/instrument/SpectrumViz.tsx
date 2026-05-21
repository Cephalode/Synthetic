/**
 * Real-time FFT frequency spectrum bar visualization.
 * Teal-themed, using AnalyserNode frequency data.
 */

import { useRef, useEffect, useCallback } from 'react';

interface SpectrumVizProps {
  analyser: AnalyserNode | null;
  width?: number;
  height?: number;
}

export default function SpectrumViz({ analyser, width = 600, height = 120 }: SpectrumVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(data);

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0c1a2a';
    ctx.fillRect(0, 0, w, h);

    // Only show useful frequency range (roughly up to 8kHz)
    const useBins = Math.floor(bufLen * 0.4);
    const barCount = Math.min(useBins, 128);
    const binStep = Math.floor(useBins / barCount);
    const barWidth = (w / barCount) * 0.8;
    const gap = (w / barCount) * 0.2;

    for (let i = 0; i < barCount; i++) {
      // Average a few bins for smoother look
      let sum = 0;
      for (let j = 0; j < binStep; j++) {
        sum += data[i * binStep + j] || 0;
      }
      const avg = sum / binStep;
      const barH = (avg / 255) * h * 0.9;

      const x = i * (barWidth + gap);

      // Gradient from teal to cyan
      const ratio = i / barCount;
      const r = Math.floor(20 + ratio * 0);
      const g = Math.floor(184 - ratio * 30);
      const b = Math.floor(166 + ratio * 40);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
      ctx.shadowBlur = 3;

      ctx.fillRect(x, h - barH, barWidth, barH);
    }

    ctx.restore();
    rafRef.current = requestAnimationFrame(draw);
  }, [analyser]);

  useEffect(() => {
    if (analyser) {
      rafRef.current = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, draw]);

  const dpr = window.devicePixelRatio || 1;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Spectrum</h4>
        <div className={`w-2 h-2 rounded-full ${analyser ? 'bg-teal-400 shadow-[0_0_6px_#14b8a6]' : 'bg-slate-600'}`} />
      </div>
      <canvas
        ref={canvasRef}
        width={width * dpr}
        height={height * dpr}
        style={{ width, height }}
        className="rounded"
      />
    </div>
  );
}
