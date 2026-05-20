import React from 'react';
import type { SimilarityResult } from '../../types';

interface SimilarityScoreProps {
  result: SimilarityResult | null;
}

function getScoreColor(pct: number): string {
  if (pct >= 90) return '#22c55e';
  if (pct >= 70) return '#eab308';
  return '#ef4444';
}

function getScoreLabel(pct: number): string {
  if (pct >= 95) return 'Excellent';
  if (pct >= 85) return 'Very Good';
  if (pct >= 70) return 'Good';
  if (pct >= 50) return 'Fair';
  return 'Poor';
}

const SimilarityScore: React.FC<SimilarityScoreProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="panel">
        <h3>Similarity Scores</h3>
        <p className="muted-text">Run synthesis to see similarity metrics</p>
      </div>
    );
  }

  const cosinePct = Math.max(0, Math.min(100, result.cosineSimilarity * 100));
  const msePct = Math.max(0, Math.min(100, (1 - result.mse) * 100));
  const rmsPct = Math.max(0, Math.min(100, (1 - result.rmsError) * 100));
  const overallPct = (cosinePct * 0.5 + msePct * 0.2 + rmsPct * 0.3);

  return (
    <div className="panel">
      <h3>Similarity Scores</h3>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Cosine Similarity</div>
          <div className="metric-value" style={{ color: getScoreColor(cosinePct) }}>
            {cosinePct.toFixed(1)}%
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${cosinePct}%`, backgroundColor: getScoreColor(cosinePct) }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">MSE (time domain)</div>
          <div className="metric-value" style={{ color: getScoreColor(msePct) }}>
            {result.mse.toFixed(6)}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${msePct}%`, backgroundColor: getScoreColor(msePct) }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">RMS Error</div>
          <div className="metric-value" style={{ color: getScoreColor(rmsPct) }}>
            {result.rmsError.toFixed(6)}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${rmsPct}%`, backgroundColor: getScoreColor(rmsPct) }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Spectral Centroid Dist</div>
          <div className="metric-value" style={{ color: '#0ea5e9' }}>
            {result.spectralCentroidDistance.toFixed(2)} Hz
          </div>
        </div>
      </div>

      <div className="overall-score">
        <div className="metric-label">Overall Similarity</div>
        <div className="metric-value large" style={{ color: getScoreColor(overallPct) }}>
          {overallPct.toFixed(1)}% — {getScoreLabel(overallPct)}
        </div>
        <div className="progress-bar large">
          <div
            className="progress-fill"
            style={{ width: `${overallPct}%`, backgroundColor: getScoreColor(overallPct) }}
          />
        </div>
      </div>
    </div>
  );
};

export default SimilarityScore;
