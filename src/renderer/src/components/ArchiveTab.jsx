import { useState, useEffect } from 'react'

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ArchiveTab({ spaceId }) {
  const [kims, setKims] = useState([])
  const [notes, setNotes] = useState([])

  useEffect(() => {
    window.api.kim.getArchived(spaceId).then(setKims)
    window.api.journal.getArchived().then(setNotes)
  }, [spaceId])

  async function restoreKim(id) {
    await window.api.kim.toggle(id)
    setKims((prev) => prev.filter((k) => k.id !== id))
  }

  async function deleteKim(id) {
    await window.api.kim.delete(id)
    setKims((prev) => prev.filter((k) => k.id !== id))
  }

  async function restoreNote(date) {
    await window.api.journal.unarchive(date)
    setNotes((prev) => prev.filter((n) => n.date !== date))
  }

  async function deleteNote(date) {
    await window.api.journal.delete(date)
    setNotes((prev) => prev.filter((n) => n.date !== date))
  }

  return (
    <div className="archive-tab">
      <div className="subsection">
        <div className="subsection-title">Archived Reminders</div>
        {kims.length === 0 ? (
          <div style={{ color: 'var(--c-text-3)', fontSize: 13, padding: '6px 0' }}>
            No archived reminders.
          </div>
        ) : (
          <div className="archive-list">
            {kims.map((kim) => (
              <div key={kim.id} className="archive-row">
                <span className="archive-row-text">{kim.text}</span>
                <button className="archive-restore-btn" onClick={() => restoreKim(kim.id)}>Restore</button>
                <button className="task-delete" style={{ opacity: 1 }} onClick={() => deleteKim(kim.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="subsection">
        <div className="subsection-title">Archived Notes</div>
        {notes.length === 0 ? (
          <div style={{ color: 'var(--c-text-3)', fontSize: 13, padding: '6px 0' }}>
            No archived notes.
          </div>
        ) : (
          <div className="archive-list">
            {notes.map((note) => (
              <div key={note.date} className="archive-row">
                <span className="archive-row-date">{fmtDate(note.date)}</span>
                <span className="archive-row-text">{note.body?.slice(0, 60)}{note.body?.length > 60 ? '…' : ''}</span>
                <button className="archive-restore-btn" onClick={() => restoreNote(note.date)}>Restore</button>
                <button className="task-delete" style={{ opacity: 1 }} onClick={() => deleteNote(note.date)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
