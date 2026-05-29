import { useState, useRef, useEffect } from 'react'

export default function AIChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextInfo, setContextInfo] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Load context summary when panel opens
  useEffect(() => {
    if (isOpen) {
      window.api.ai.contextInfo().then(setContextInfo)
      setTimeout(() => textareaRef.current?.focus(), 220)
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const res = await window.api.ai.chat(
      newMessages.map((m) => ({ role: m.role, content: m.content }))
    )
    setMessages((prev) => [...prev, { role: 'assistant', content: res.text }])
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={`chat-panel ${isOpen ? '' : 'closed'}`}>
      <div className="chat-header">
        <div className="chat-title">
          <span>✦</span>
          Astrie
        </div>
        <button className="chat-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      {/* Context info bar */}
      {contextInfo && (
        <div className="chat-context-bar">
          {contextInfo.hasKey ? (
            <>
              <span className="ctx-chip">{contextInfo.spaces} spaces</span>
              <span className="ctx-sep">·</span>
              <span className="ctx-chip">{contextInfo.journals} journal entries</span>
              <span className="ctx-sep">·</span>
              <span className="ctx-chip">{contextInfo.weekTasks} tasks this week</span>
              {contextInfo.kims > 0 && (
                <>
                  <span className="ctx-sep">·</span>
                  <span className="ctx-chip">{contextInfo.kims} reminders</span>
                </>
              )}
            </>
          ) : (
            <span className="ctx-warn">No API key — add ANTHROPIC_API_KEY to .env</span>
          )}
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            <div className="chat-empty-icon">✦</div>
            <div>Ask anything across your spaces.</div>
            <div className="chat-empty-sub">
              Astrie knows your context, tasks, goals, and recent journal entries.
            </div>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="chat-suggestion"
                  onClick={() => { setInput(s); textareaRef.current?.focus() }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`msg-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}

        {loading && <div className="msg-bubble assistant loading">Thinking…</div>}

        <div ref={bottomRef} />
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Ask Astrie anything…"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="chat-send" type="submit" disabled={!input.trim() || loading}>
          ↑
        </button>
      </form>
    </div>
  )
}

const SUGGESTIONS = [
  'What should I focus on today?',
  'Summarise Canterbury this week',
  'What goals am I behind on?',
]
