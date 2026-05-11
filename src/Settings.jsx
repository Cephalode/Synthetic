import { useState, useCallback, useEffect } from 'react';
import { getSettings, saveSettings, testConnection } from './llmClient';

export default function Settings({ open, onClose }) {
  const [settings, setSettings] = useState(() => getSettings());
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Re-read settings from localStorage when the panel opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(getSettings());
      setTestResult(null);
    }
  }, [open]);

  const handleChange = useCallback((field, value) => {
    setSettings(prev => {
      const next = { ...prev, [field]: value };
      saveSettings(next);
      return next;
    });
    setTestResult(null);
  }, []);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-field">
            <label htmlFor="settings-endpoint">API Endpoint</label>
            <input
              id="settings-endpoint"
              className="settings-input"
              type="text"
              value={settings.endpoint}
              onChange={e => handleChange('endpoint', e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <span className="settings-hint">OpenAI-compatible endpoint</span>
          </div>

          <div className="settings-field">
            <label htmlFor="settings-apikey">API Key</label>
            <input
              id="settings-apikey"
              className="settings-input"
              type="password"
              value={settings.apiKey}
              onChange={e => handleChange('apiKey', e.target.value)}
              placeholder="sk-..."
            />
            <span className="settings-hint">Stored locally in your browser</span>
          </div>

          <div className="settings-field">
            <label htmlFor="settings-model">Model</label>
            <input
              id="settings-model"
              className="settings-input"
              type="text"
              value={settings.model}
              onChange={e => handleChange('model', e.target.value)}
              placeholder="gpt-4o-mini"
            />
            <span className="settings-hint">e.g. gpt-4o-mini, gpt-4o, claude-3-haiku</span>
          </div>

          <button
            className="settings-test-btn"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          {testResult && (
            <div className={`settings-test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
