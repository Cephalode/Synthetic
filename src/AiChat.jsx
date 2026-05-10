import { useState, useRef, useEffect } from 'react'
import { parseInstrumentQuery } from './instrumentKnowledge'

export default function AiChat({ onGenerateLayers, onClearLayers }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: '🎹 Welcome to **Synthetic AI**! Type an instrument name and I\'ll create layered sounds for you.\n\nTry: `trumpet`, `flute`, `piano`, `clarinet`, `violin`, `organ`, `bass`, `saxophone`\n\nAdd modifiers: `bright trumpet`, `warm flute`, `soft piano`, `harsh sax`',
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const query = input.trim()
    if (!query) return

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', text: query }])
    setInput('')

    // Process query
    const result = parseInstrumentQuery(query)

    // Add AI response
    setMessages((prev) => [...prev, { role: 'ai', text: result.description }])

    // Generate layers if any
    if (result.layers.length > 0) {
      onGenerateLayers(result.layers)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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
        <button className="chat-clear-btn" onClick={handleClear} title="Reset to default">
          Clear All
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-message-content">
              {renderText(msg.text)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Type an instrument name..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
