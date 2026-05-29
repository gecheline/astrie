import { useState, useRef, useEffect } from 'react'

export default function ContextTab({ spaceId, initialText, onSaved }) {
  const [text, setText] = useState(initialText ?? '')
  const [status, setStatus] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    setText(initialText ?? '')
  }, [spaceId, initialText])

  function handleChange(e) {
    const val = e.target.value
    setText(val)
    setStatus('Unsaved…')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await window.api.spaces.updateContext(spaceId, val)
      onSaved?.(val)
      setStatus('Saved')
      setTimeout(() => setStatus(''), 1800)
    }, 700)
  }

  return (
    <div className="context-tab">
      <div className="context-label">Space Context</div>
      <textarea
        className="context-textarea"
        placeholder={`Describe what this space is about, key facts, ongoing situation, important background…\n\nThis text is loaded into AI Chat for cross-space answers and nudge generation.`}
        value={text}
        onChange={handleChange}
      />
      <div className="context-meta">{status}</div>
    </div>
  )
}
