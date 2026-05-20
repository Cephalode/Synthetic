import { useState, useRef, useEffect } from 'react';
import { generateInstrument } from '../../data/llm-client';
import { parseInstrumentQuery } from '../../data/instrument-knowledge';
import type { SynthLayer } from '../../types';

interface Message { role: 'user' | 'assistant'; content: string; }

interface AiChatProps {
  open: boolean;
  onToggle: () => void;
  onApplyLayers: (layers: SynthLayer[]) => void;
  currentLayers: SynthLayer[];
}

export default function AiChat({ open, onToggle, onApplyLayers, currentLayers }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! Describe a sound and I\'ll create it. Try "bright piano" or "deep bass".' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Try local knowledge first
      const local = parseInstrumentQuery(userMsg);
      if (local) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Found: **${local}** (local preset)` }]);
        onApplyLayers(currentLayers); // Trigger preset load handled by parent
        setLoading(false);
        return;
      }

      // Try LLM
      const result = await generateInstrument(userMsg);
      if (result?.layers) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.description || `Created ${result.layers.length} layers`
        }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-700 flex flex-col z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300">AI Sound Design</h3>
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-200 text-sm">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
            <span className={`inline-block px-3 py-2 rounded-lg max-w-[90%] ${
              m.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-sm text-slate-500 animate-pulse">Thinking...</div>}
      </div>

      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Describe a sound..."
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500"
          />
          <button onClick={send} disabled={loading}
            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm disabled:opacity-50">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
