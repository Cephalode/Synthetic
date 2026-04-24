import { useState } from 'react'

const COLORS = ['#00d4aa', '#ff6b9d', '#ffa64d', '#6bcbff', '#c084fc', '#f0e040', '#ff5555', '#50fa7b']

export default function LayerCard({ layer, index, onUpdate, onDelete }) {
  const [collapsed, setCollapsed] = useState(false)
  const color = COLORS[index % COLORS.length]

  const set = (key) => (e) => {
    const val = e.target ? parseFloat(e.target.value) : e
    onUpdate({ ...layer, [key]: val })
  }

  return (
    <div className="layer-card">
      <div className="layer-header" onClick={() => setCollapsed((c) => !c)}>
        <div className="layer-title">
          <span className="layer-color" style={{ background: color }} />
          Layer {index + 1}
          <span className="layer-badge">{layer.waveShape}</span>
        </div>
        <div className="layer-actions">
          <button
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(layer.id)
            }}
            title="Delete layer"
          >
            ✕
          </button>
          <span className={`collapse-icon ${collapsed ? '' : 'open'}`}>▼</span>
        </div>
      </div>

      {!collapsed && (
        <div className="layer-body">
          {/* Wave Shape */}
          <div className="control-group">
            <label>Wave Shape</label>
            <div className="wave-selector">
              {['sine', 'square', 'sawtooth', 'triangle'].map((w) => (
                <button
                  key={w}
                  className={`wave-btn ${layer.waveShape === w ? 'active' : ''}`}
                  onClick={() => onUpdate({ ...layer, waveShape: w })}
                >
                  {w.charAt(0).toUpperCase() + w.slice(1, 3)}
                </button>
              ))}
            </div>

            <label style={{ marginTop: 10 }}>Octave</label>
            <div className="octave-control">
              <button className="octave-btn" onClick={() => onUpdate({ ...layer, octave: Math.max(1, layer.octave - 1) })}>−</button>
              <span className="octave-value">{layer.octave}</span>
              <button className="octave-btn" onClick={() => onUpdate({ ...layer, octave: Math.min(8, layer.octave + 1) })}>+</button>
            </div>
          </div>

          {/* ADSR */}
          <div className="control-group">
            <label>Envelope (ADSR)</label>
            <Slider label="Attack" value={layer.attack} min={0.001} max={2} step={0.001} onChange={set('attack')} unit="s" />
            <Slider label="Decay" value={layer.decay} min={0.001} max={2} step={0.001} onChange={set('decay')} unit="s" />
          </div>

          <div className="control-group">
            <label>&nbsp;</label>
            <Slider label="Sustain" value={layer.sustain} min={0} max={1} step={0.01} onChange={set('sustain')} unit="%" isPercent />
            <Slider label="Release" value={layer.release} min={0.001} max={5} step={0.001} onChange={set('release')} unit="s" />
          </div>
        </div>
      )}
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, unit, isPercent }) {
  const display = isPercent ? `${Math.round(value * 100)}%` : `${value.toFixed(3)}${unit}`
  return (
    <div className="slider-control">
      <div className="slider-label">
        <span>{label}</span>
        <span>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  )
}
