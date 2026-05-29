import { useState, useEffect, useCallback, useRef } from 'react'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function TodayView({ spaces }) {
  const today = todayStr()

  const [nudgeItems, setNudgeItems] = useState([])
  const [nudgeLoading, setNudgeLoading] = useState(true)
  const [taskGroups, setTaskGroups] = useState([])
  const [kimGroups, setKimGroups] = useState([])
  const [journal, setJournal] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const journalTimer = useRef(null)

  useEffect(() => {
    window.api.tasks.getToday(today).then((tasks) => {
      const map = {}
      tasks.forEach((t) => {
        if (!map[t.space_id]) {
          map[t.space_id] = { space_name: t.space_name, space_type: t.space_type, tasks: [] }
        }
        map[t.space_id].tasks.push(t)
      })
      setTaskGroups(Object.values(map))
    })

    window.api.kim.getAll().then((items) => {
      const map = {}
      items.forEach((k) => {
        if (!map[k.space_name]) map[k.space_name] = []
        map[k.space_name].push(k)
      })
      setKimGroups(Object.entries(map).map(([name, items]) => ({ name, items })))
    })

    window.api.journal.get(today).then((entry) => setJournal(entry?.body ?? ''))

    setNudgeLoading(true)
    window.api.ai.nudge(today).then((res) => {
      setNudgeItems(res.items || [])
      setNudgeLoading(false)
    })
  }, [today])

  const handleTaskToggle = useCallback(async (taskId) => {
    await window.api.tasks.toggle(taskId)
    setTaskGroups((prev) =>
      prev
        .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }))
        .filter((g) => g.tasks.length > 0)
    )
  }, [])

  const handleTaskDelete = useCallback(async (taskId) => {
    await window.api.tasks.delete(taskId)
    setTaskGroups((prev) =>
      prev
        .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.id !== taskId) }))
        .filter((g) => g.tasks.length > 0)
    )
  }, [])

  function handleJournalChange(e) {
    const val = e.target.value
    setJournal(val)
    setJournalSaved(false)
    clearTimeout(journalTimer.current)
    journalTimer.current = setTimeout(async () => {
      await window.api.journal.upsert(today, val)
      setJournalSaved(true)
    }, 800)
  }

  const totalTasks = taskGroups.reduce((n, g) => n + g.tasks.length, 0)

  return (
    <div className="today-view">
      <div className="today-date">{formatDate(today)}</div>
      <h1 className="today-heading">Good day</h1>

      {/* Nudge banner */}
      <div className="nudge-card">
        <div className="nudge-header">
          <span className="nudge-icon">✦</span>
          <span className="nudge-label">Don't forget today</span>
        </div>
        {nudgeLoading ? (
          <div className="nudge-loading">Thinking…</div>
        ) : (
          <ol className="nudge-list">
            {nudgeItems.map((item, i) => (
              <li key={i} className="nudge-item">
                <span className="nudge-num">{i + 1}</span>
                <span className="nudge-text">{item}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Tasks due today */}
      <div className="section-heading">
        Today's Tasks
        {totalTasks > 0 && (
          <span className="badge-count" style={{ marginLeft: 8 }}>{totalTasks}</span>
        )}
      </div>
      {taskGroups.length === 0 ? (
        <div className="empty-today">
          No tasks scheduled for today. Assign a task to today in a Space → This Week.
        </div>
      ) : (
        <div className="today-task-groups">
          {taskGroups.map((group) => (
            <div key={group.space_name} className="task-group">
              <div className="task-group-header">
                <span className="task-group-name">{group.space_name}</span>
                <span className="task-group-type">{group.space_type}</span>
              </div>
              <div style={{ padding: '6px 10px 8px' }}>
                {group.tasks.map((task) => (
                  <TodayTask key={task.id} task={task} onToggle={handleTaskToggle} onDelete={handleTaskDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keep in mind (all spaces) */}
      {kimGroups.length > 0 && (
        <>
          <div className="section-heading">Keep in Mind</div>
          <div className="kim-surfaced-grid">
            {kimGroups.map((group) => (
              <div key={group.name} className="kim-surfaced-group">
                <div className="task-group-header">
                  <span className="task-group-name">{group.name}</span>
                </div>
                {group.items.map((k) => (
                  <div key={k.id} className="kim-surfaced-item">
                    <span className="kim-dot-sm" />
                    {k.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notes */}
      <div className="journal-section">
        <div className="section-heading">Notes</div>
        <textarea
          className="journal-textarea"
          placeholder="What's on your mind today? Notes, reflections, anything…"
          value={journal}
          onChange={handleJournalChange}
        />
        <div className="journal-saved">
          {journalSaved ? 'Saved' : journal ? 'Unsaved changes' : ''}
        </div>
      </div>
    </div>
  )
}

function TodayTask({ task, onToggle, onDelete }) {
  return (
    <div className="task-row" style={{ marginBottom: 2 }}>
      <button
        className="task-check"
        onClick={() => onToggle(task.id)}
        aria-label="Complete task"
      />
      <span className="task-text">{task.text}</span>
      <button className="task-delete" onClick={() => onDelete(task.id)}>×</button>
    </div>
  )
}
