import { useState, useRef, useEffect } from 'react'

const TYPE_ICON = { project: '◆', personal: '◉', info: '◎', other: '⬡' }

export default function Sidebar({ spaces, activeView, onNavigate, onAddSpace, onDeleteSpace, chatOpen, onToggleChat }) {
  const [addingSpace, setAddingSpace] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('project')
  const nameInputRef = useRef(null)

  useEffect(() => {
    if (addingSpace) nameInputRef.current?.focus()
  }, [addingSpace])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await onAddSpace(newName.trim(), newType)
    setNewName('')
    setNewType('project')
    setAddingSpace(false)
  }

  function handleCancel() {
    setNewName('')
    setNewType('project')
    setAddingSpace(false)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">✦</span>
        <span className="brand-name">Astrie</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeView === 'today' ? 'active' : ''}`}
          onClick={() => onNavigate('today')}
        >
          <span className="nav-icon">○</span>
          Today
        </button>

        <button
          className={`nav-item ${activeView === 'week' ? 'active' : ''}`}
          onClick={() => onNavigate('week')}
        >
          <span className="nav-icon">◫</span>
          This Week
        </button>

        <div className="sidebar-section-row">
          <span className="nav-section-label" style={{ padding: 0 }}>Spaces</span>
          <button
            className="nav-section-add"
            onClick={() => setAddingSpace((v) => !v)}
            title="Add space"
          >
            +
          </button>
        </div>

        {spaces.map((space) => (
          <div key={space.id} className="nav-item-wrap">
            <button
              className={`nav-item ${activeView === space.id ? 'active' : ''}`}
              onClick={() => onNavigate(space.id)}
            >
              <span className="nav-icon">{TYPE_ICON[space.type] || '□'}</span>
              {space.name}
            </button>
            <button
              className="space-delete-btn"
              onClick={(e) => { e.stopPropagation(); onDeleteSpace(space.id) }}
              title="Delete space"
            >
              ×
            </button>
          </div>
        ))}

        {addingSpace && (
          <form className="add-space-form" onSubmit={handleSubmit}>
            <input
              ref={nameInputRef}
              className="add-input sidebar-input"
              placeholder="Space name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <select
              className="sidebar-type-select"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              <option value="project">Project</option>
              <option value="personal">Personal</option>
              <option value="info">Info</option>
              <option value="other">Other</option>
            </select>
            <div className="sidebar-form-actions">
              <button type="submit" className="sidebar-add-btn">Add</button>
              <button type="button" className="sidebar-cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          className={`nav-item chat-toggle ${chatOpen ? 'active' : ''}`}
          onClick={onToggleChat}
        >
          <span className="nav-icon">✦</span>
          AI Chat
        </button>
      </div>
    </aside>
  )
}
