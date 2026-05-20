import React, { useRef, useEffect } from 'react';
import { fft, magnitude } from '../../engine/fft';

interface SpectrumDisplayProps {
  audioData: Float32Array | null;
  sampleRate: number;
  title: string;
  color: string;
}

const SpectrumDisplay: React.FC<SpectrumDisplayProps> = ({ audioData, sampleRate, title, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    const pad = { top: 24, bottom: 20, left: 8, right: 8 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(title, 8, 16);

    if (!audioData || audioData.length === 0) {
      ctx.fillStyle = '#666';
      ctx.fillText('No audio loaded', w / 2 - 50, h / 2);
      return;
    }

    // Compute magnitude spectrum
    const { real, imag } = fft(audioData);
    const mag = magnitude(real, imag);
    const numBins = mag.length;

    // Convert to dB
    const dbMin = -80;
    const dbMax = 0;
    const db = new Float32Array(numBins);
    for (let i = 0; i < numBins; i++) {
      const val = 20 * Math.log10(Math.max(mag[i], 1e-10));
      db[i] = Math.max(dbMin, Math.min(dbMax, val));
    }

    // Logarithmic frequency mapping
    const freqPerBin = sampleRate / (2 * (numBins - 1));
    const minFreq = 20;
    const maxFreq = sampleRate / 2;

    const freqToX = (freq: number): number => {
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      return pad.left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * plotW;
    };

    const dbToY = (dbVal: number): number => {
      return pad.top + plotH * (1 - (dbVal - dbMin) / (dbMax - dbMin));
    };

    // Grid lines - frequency
    ctx.strokeStyle = '#1a2744';
    ctx.lineWidth = 1;
    const freqLabels = [100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    for (const f of freqLabels) {
      if (f > maxFreq) break;
      const x = freqToX(f);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, h - pad.bottom);
      ctx.stroke();
    }

    // Grid lines - dB
    for (let d = dbMin; d <= dbMax; d += 20) {
      const y = dbToY(d);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    // Draw spectrum
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let x = 0; x < plotW; x++) {
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const logFreq = logMin + (x / plotW) * (logMax - logMin);
      const freq = Math.pow(10, logFreq);
      const bin = Math.round(freq / freqPerBin);
      if (bin >= numBins) break;
      const y = dbToY(db[bin]);
      if (!started) {
        ctx.moveTo(pad.left + x, y);
        started = true;
      } else {
        ctx.lineTo(pad.left + x, y);
      }
    }
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(pad.left + plotW, h - pad.bottom);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
    ctx.fill();

    // Frequency axis labels
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    for (const f of freqLabels) {
      if (f > maxFreq) break;
      const x = freqToX(f);
      const label = f >= 1000 ? `${(f / 1000).toFixed(f % 1000 === 0 ? 0 : 1)}k` : `${f}`;
      ctx.fillText(label, x - 8, h - 6);
    }

    // dB labels
    for (let d = dbMin; d <= dbMax; d += 40) {
      const y = dbToY(d);
      ctx.fillText(`${d}dB`, pad.left + 2, y - 2);
    }
  }, [audioData, sampleRate, title, color]);

  useEffect(() => {
    const handleResize = () => {
      // Force re-render
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default SpectrumDisplay;
