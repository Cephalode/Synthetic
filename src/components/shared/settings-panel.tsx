import { useState, useRef, useEffect } from 'react';
// @ts-nocheck
import { getSettings, saveSettings, testConnection } from '../../data/llm-client';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('');
  const loaded = useRef(false);

  useEffect(() => {
    if (open && !loaded.current) {
      const s = getSettings();
      setEndpoint(s.endpoint);
      setApiKey(s.apiKey);
      setModel(s.model);
      loaded.current = true;
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    saveSettings({ endpoint, apiKey, model });
    setStatus('Settings saved');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleTest = async () => {
    setStatus('Testing...');
    try {
      const r = await testConnection();
      setStatus(r.success ? '✓ Connected' : `✗ ${r.message}`);
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl border border-slate-600 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">API Settings</h2>

        <label className="text-sm text-slate-400">Endpoint</label>
        <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 mb-3" />

        <label className="text-sm text-slate-400">API Key</label>
        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 mb-3" />

        <label className="text-sm text-slate-400">Model</label>
        <input type="text" value={model} onChange={e => setModel(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-sm text-slate-200 mb-4" />

        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm">Save</button>
          <button onClick={handleTest} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Test</button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm">Close</button>
        </div>

        {status && <p className="mt-3 text-sm text-center text-slate-400">{status}</p>}
      </div>
    </div>
  );
}
