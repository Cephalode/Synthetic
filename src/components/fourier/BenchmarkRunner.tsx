import React, { useState, useCallback, useRef } from 'react';
import { runBenchmark, SAMPLES } from '../../engine/benchmark';
import type { BenchmarkResult } from '../../engine/benchmark';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(pct: number): string {
  if (pct >= 95) return '#22c55e'; // green
  if (pct >= 80) return '#eab308'; // yellow
  return '#ef4444'; // red
}

function getScoreBgClass(pct: number): string {
  if (pct >= 95) return 'bg-green-600/20 text-green-400 border-green-600/30';
  if (pct >= 80) return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
  return 'bg-red-600/20 text-red-400 border-red-600/30';
}

function getStatusLabel(pct: number): string {
  if (pct >= 95) return 'Excellent';
  if (pct >= 80) return 'Good';
  if (pct >= 50) return 'Fair';
  return 'Poor';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BenchmarkRunner: React.FC = () => {
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const total = SAMPLES.length;
  const abortRef = useRef(false);

  const handleRun = useCallback(async () => {
    abortRef.current = false;
    setRunning(true);
    setCompleted(0);
    setResults([]);

    try {
      const res = await runBenchmark((done) => {
        if (abortRef.current) throw new Error('Benchmark cancelled');
        setCompleted(done);
      });
      setResults(res);
    } catch {
      // cancelled or error — keep partial results
    } finally {
      setRunning(false);
    }
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  const averageCosine =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.cosineSimilarity, 0) / results.length
      : 0;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">
        Accuracy Benchmark
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        Runs the full Fourier pipeline (analyze → synthesize → similarity) on 12
        instrument samples and reports reconstruction accuracy.
      </p>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        {!running ? (
          <button
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-medium transition-colors"
            onClick={handleRun}
          >
            ▶ Run Benchmark
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors"
            onClick={handleCancel}
          >
            ✕ Cancel
          </button>
        )}

        {running && (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
              {completed}/{total}
            </span>
          </div>
        )}

        {!running && results.length > 0 && (
          <button
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm font-medium transition-colors"
            onClick={handleRun}
          >
            ↻ Run Again
          </button>
        )}
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-3">Instrument</th>
                  <th className="text-right py-2 px-3">Fundamental</th>
                  <th className="text-right py-2 px-3">Harmonics</th>
                  <th className="text-right py-2 px-3">Cosine Sim</th>
                  <th className="text-right py-2 px-3">MSE</th>
                  <th className="text-center py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const pct = r.cosineSimilarity * 100;
                  const isError = !!r.error;
                  return (
                    <tr
                      key={r.name}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-2 pr-3">
                        <span className="text-slate-200 font-medium">{r.name}</span>
                        <span className="text-slate-500 text-xs ml-2">{r.category}</span>
                      </td>
                      <td className="text-right py-2 px-3 text-cyan-400 tabular-nums">
                        {isError ? '—' : `${r.fundamentalFreq.toFixed(1)} Hz`}
                      </td>
                      <td className="text-right py-2 px-3 text-slate-300 tabular-nums">
                        {isError ? '—' : r.harmonicCount}
                      </td>
                      <td
                        className="text-right py-2 px-3 font-medium tabular-nums"
                        style={{ color: isError ? '#64748b' : getScoreColor(pct) }}
                      >
                        {isError ? '—' : `${pct.toFixed(1)}%`}
                      </td>
                      <td className="text-right py-2 px-3 text-slate-400 tabular-nums">
                        {isError ? '—' : r.mse.toFixed(6)}
                      </td>
                      <td className="text-center py-2 pl-3">
                        {isError ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs border bg-red-600/20 text-red-400 border-red-600/30">
                            Error
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs border ${getScoreBgClass(pct)}`}
                          >
                            {getStatusLabel(pct)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Overall average */}
          <div className="mt-4 pt-3 border-t border-slate-600 flex items-center justify-between">
            <span className="text-sm text-slate-400">Overall Average Cosine Similarity</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${averageCosine * 100}%`,
                    backgroundColor: getScoreColor(averageCosine * 100),
                  }}
                />
              </div>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: getScoreColor(averageCosine * 100) }}
              >
                {(averageCosine * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BenchmarkRunner;
