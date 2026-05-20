import React, { useRef, useEffect } from 'react';

interface WaveformDisplayProps {
  data: Float32Array | null;
  sampleRate: number;
  title: string;
  color: string;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ data, sampleRate, title, color }) => {
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

    // Background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1a2744';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const x = (w / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Center line
    ctx.strokeStyle = '#2a3a5e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (!data || data.length === 0) {
      // Title
      ctx.fillStyle = '#666';
      ctx.font = '12px monospace';
      ctx.fillText(title, 8, 16);
      ctx.fillText('No audio loaded', w / 2 - 50, h / 2);
      return;
    }

    // Draw waveform
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let x = 0; x < w; x++) {
      const idx = Math.floor((x / w) * data.length);
      // Min/max for this pixel column to show waveform envelope
      let min = Infinity, max = -Infinity;
      for (let j = 0; j < step && idx + j < data.length; j++) {
        const v = data[idx + j];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yMin = ((1 - max) / 2) * h;
      const yMax = ((1 - min) / 2) * h;
      if (x === 0) {
        ctx.moveTo(x, yMin);
      }
      ctx.lineTo(x, yMin);
      ctx.lineTo(x, yMax);
    }
    ctx.stroke();

    // Time axis labels
    const duration = data.length / sampleRate;
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    const numLabels = Math.min(8, Math.ceil(duration));
    for (let i = 0; i <= numLabels; i++) {
      const t = (duration / numLabels) * i;
      const x = (i / numLabels) * w;
      ctx.fillText(t.toFixed(2) + 's', x + 2, h - 4);
    }

    // Title
    ctx.fillStyle = color;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(title, 8, 16);
  }, [data, sampleRate, title, color]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
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

export default WaveformDisplay;
