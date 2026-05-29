import { useState, useEffect } from 'react'

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotesTab() {
  const [notes, setNotes] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    window.api.journal.getAll().then(setNotes)
  }, [])

  async function archiveNote(date) {
    await window.api.journal.archive(date)
    setNotes((prev) => prev.filter((n) => n.date !== date))
  }

  function toggleExpand(date) {
    setExpanded((prev) => (prev === date ? null : date))
  }

  if (notes.length === 0) {
    return (
      <div className="notes-tab">
        <div style={{ color: 'var(--c-text-3)', fontSize: 13 }}>
          No notes yet — write your first note in the Today view.
        </div>
      </div>
    )
  }

  return (
    <div className="notes-tab">
      {notes.map((note) => (
        <div key={note.date} className={`note-entry ${expanded === note.date ? 'expanded' : ''}`}>
          <div className="note-entry-header" onClick={() => toggleExpand(note.date)}>
            <span className="note-entry-date">{fmtDate(note.date)}</span>
            {expanded !== note.date && (
              <span className="note-entry-preview">
                {note.body?.slice(0, 80)}{note.body?.length > 80 ? '…' : ''}
              </span>
            )}
            <button
              className="note-archive-btn"
              onClick={(e) => { e.stopPropagation(); archiveNote(note.date) }}
              title="Archive"
            >
              Archive
            </button>
          </div>
          {expanded === note.date && (
            <div className="note-entry-body">{note.body}</div>
          )}
        </div>
      ))}
    </div>
  )
}
