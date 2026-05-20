import { useState } from 'react';
import type { AppMode } from './types';
import Header from './components/shared/header';
import SettingsPanel from './components/shared/settings-panel';
import AiChat from './components/shared/ai-chat';
import InstrumentPanel from './components/instrument/instrument-panel';
import FourierPanel from './components/fourier/FourierPanel';
import './App.css';

export default function App() {
  const [mode, setMode] = useState<AppMode>('instrument');
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <Header
        mode={mode}
        onModeChange={setMode}
        onToggleChat={() => setShowChat(v => !v)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex-1 overflow-auto">
        {mode === 'instrument' && <InstrumentPanel />}
        {mode === 'fourier' && <FourierPanel />}
      </main>

      <AiChat
        open={showChat}
        onToggle={() => setShowChat(false)}
        onApplyLayers={() => {}}
        currentLayers={[]}
      />
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
