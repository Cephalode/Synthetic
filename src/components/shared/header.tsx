import type { AppMode } from '../../types';

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onToggleChat?: () => void;
  onOpenSettings?: () => void;
}

const TABS: { id: AppMode; label: string }[] = [
  { id: 'instrument', label: '🎹 Instrument' },
  { id: 'fourier', label: '📊 Fourier' },
];

export default function Header({ mode, onModeChange, onToggleChat, onOpenSettings }: HeaderProps) {
  return (
    <header className="flex items-center px-4 h-11 bg-slate-900 border-b border-slate-700 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-6">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />
        <span className="text-sm font-bold tracking-wide text-slate-200">Synthetic</span>
      </div>

      {/* Mode Tabs */}
      <nav className="flex items-center gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-1.5 text-xs font-semibold rounded-t transition-colors ${
              mode === tab.id
                ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
            onClick={() => onModeChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        {onToggleChat && (
          <button
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-600"
            onClick={onToggleChat}
          >
            💬 AI Chat
          </button>
        )}
        {onOpenSettings && (
          <button
            className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-600"
            onClick={onOpenSettings}
          >
            ⚙ Settings
          </button>
        )}
      </div>
    </header>
  );
}
