import { useState, useRef, useEffect } from 'react'
import { parseInstrumentQuery } from './instrumentKnowledge'
import { generateInstrument, modifyLayers, getSettings } from './llmClient'
import Settings from './Settings'

function classifyQuery(query, hasLayers) {
  const q = query.toLowerCase()
  const isModification = hasLayers && (
    /\b(add|remove|more|less|make|change|turn|boost|cut|raise|lower|increase|decrease)\b/i.test(q) ||
    /\b(bass|treble|attack|release|gain|harmonic|bright|dark|warm|harsh|loud|quiet|thick|thin)\b/i.test(q)
  )
  return isModification ? 'modify' : 'instrument'
}

export default function AiChat({ onGenerateLayers, onClearLayers, currentLayers = [] }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: '🎹 Welcome to **Synthetic AI**! Type an instrument name and I\'ll create layered sounds. Try: `trumpet`, `flute`, `piano`, `duduk`, `didgeridoo`...\n\nYou can also modify: \'add more bass\', \'make it brighter\', \'add a second voice\'',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const query = input.trim()
    if (!query) return

    // 1. Add user message
    setMessages((prev) => [...prev, { role: 'user', text: query }])
    setInput('')

    // 3. Classify query
    const mode = classifyQuery(query, currentLayers.length > 0)
    const settings = getSettings()
    const hasApiKey = settings && settings.apiKey

    if (mode === 'instrument') {
      // 4a. Try local parse first
      const result = parseInstrumentQuery(query)

      if (result.layers.length > 0) {
        // 4b. Found locally — add badge
        const desc = result.description + '\n\n📦 Local Preset'
        setMessages((prev) => [...prev, { role: 'ai', text: desc }])
        onGenerateLayers(result.layers)
      } else if (hasApiKey) {
        // 4c. Not found + API key configured → AI generation
        setLoading(true)
        try {
          const aiResult = await generateInstrument(query)
          const desc = aiResult.description + '\n\n🤖 AI Generated'
          setMessages((prev) => [...prev, { role: 'ai', text: desc }])
          if (aiResult.layers.length > 0) {
            onGenerateLayers(aiResult.layers)
          }
        } catch (err) {
          setMessages((prev) => [...prev, { role: 'ai', text: `❌ Error: ${err.message}` }])
        }
        setLoading(false)
      } else {
        // 4d. Not found + no API key
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: "I don't have a preset for that. Add an API key in ⚙️ Settings to use AI generation!" },
        ])
      }
    } else {
      // 5. Modify mode
      if (currentLayers.length === 0) {
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: 'Create an instrument first, then modify it!' },
        ])
      } else if (hasApiKey) {
        // 5b. API key configured
        setLoading(true)
        try {
          const modResult = await modifyLayers(currentLayers, query)
          const desc = modResult.description + '\n\n🔧 Modified'
          setMessages((prev) => [...prev, { role: 'ai', text: desc }])
          if (modResult.layers.length > 0) {
            onGenerateLayers(modResult.layers)
          }
        } catch (err) {
          setMessages((prev) => [...prev, { role: 'ai', text: `❌ Error: ${err.message}` }])
        }
        setLoading(false)
      } else {
        // 5c. No API key
        setMessages((prev) => [
          ...prev,
          { role: 'ai', text: 'Modification requires an API key. Open ⚙️ Settings to add one.' },
        ])
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading) handleSend()
    }
  }

  const handleClear = () => {
    onClearLayers()
    setMessages((prev) => [...prev, { role: 'ai', text: '🗑️ Cleared all layers. Reset to a single default sine oscillator.' }])
  }

  // Simple markdown-like rendering for bold and code
  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      let rendered = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
      return <p key={i} dangerouslySetInnerHTML={{ __html: rendered }} />
    })
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-title">🤖 AI Sound Designer</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="chat-clear-btn" onClick={() => setSettingsOpen(true)} title="Settings">
            ⚙️
          </button>
          <button className="chat-clear-btn" onClick={handleClear} title="Reset to default">
            Clear All
          </button>
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-message-content">
              {renderText(msg.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message ai">
            <div className="chat-message-content">
              <p>⏳ Generating...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Type an instrument or modification..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
          Send
        </button>
      </div>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
