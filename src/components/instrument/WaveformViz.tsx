/**
 * Real-time waveform oscilloscope visualization using AnalyserNode.
 * Renders a teal-colored waveform of the currently playing audio.
 */

import { useRef, useEffect, useCallback } from 'react';

interface WaveformVizProps {
  analyser: AnalyserNode | null;
  width?: number;
  height?: number;
}

export default function WaveformViz({ analyser, width = 600, height = 120 }: WaveformVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufLen = analyser.fftSize;
    const data = new Float32Array(bufLen);
    analyser.getFloatTimeDomainData(data);

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0c1a2a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x += w / 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Waveform
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#14b8a6';
    ctx.shadowBlur = 6;
    ctx.beginPath();

    const sliceWidth = w / bufLen;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const v = data[i];
      const y = (1 - v) * h / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
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
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Waveform</h4>
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
