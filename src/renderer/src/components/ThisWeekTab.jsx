import { useState, useEffect, useRef } from 'react'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  return mon.toISOString().split('T')[0]
}

export default function ThisWeekTab({ spaceId }) {
  const [tasks, setTasks] = useState([])
  const [kims, setKims] = useState([])
  const [goals, setGoals] = useState([])
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const [newTask, setNewTask] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newKim, setNewKim] = useState('')

  const weekStart = getWeekStart()

  useEffect(() => {
    window.api.tasks.getBySpace(spaceId).then(setTasks)
    window.api.kim.getBySpace(spaceId).then(setKims)
    window.api.goals.getBySpace(spaceId).then(setGoals)
    window.api.weekly.getSummary(spaceId, weekStart).then((row) => {
      if (row?.summary_text) setSummary(row.summary_text)
    })
  }, [spaceId, weekStart])

  async function addTask(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    const { id } = await window.api.tasks.create({
      space_id: spaceId,
      text: newTask.trim(),
      due_date: newDue || null,
    })
    setTasks((prev) => [
      ...prev,
      { id, space_id: spaceId, text: newTask.trim(), due_date: newDue || null, done: 0, is_recurring: 0 },
    ])
    setNewTask('')
    setNewDue('')
  }

  async function toggleTask(id) {
    await window.api.tasks.toggle(id)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: t.done ? 0 : 1 } : t)))
  }

  async function deleteTask(id) {
    await window.api.tasks.delete(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function editTask(id, text, due) {
    await window.api.tasks.update({ id, text, due_date: due })
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, text, due_date: due } : t))
  }

  async function addKim(e) {
    e.preventDefault()
    if (!newKim.trim()) return
    const { id } = await window.api.kim.create({ space_id: spaceId, text: newKim.trim() })
    setKims((prev) => [...prev, { id, space_id: spaceId, text: newKim.trim(), active: 1 }])
    setNewKim('')
  }

  async function toggleKim(id) {
    await window.api.kim.toggle(id)
    setKims((prev) => prev.map((k) => (k.id === id ? { ...k, active: k.active ? 0 : 1 } : k)))
  }

  async function editKimItem(id, text) {
    await window.api.kim.update(id, text)
    setKims((prev) => prev.map((k) => (k.id === id ? { ...k, text } : k)))
  }

  async function deleteKim(id) {
    await window.api.kim.delete(id)
    setKims((prev) => prev.filter((k) => k.id !== id))
  }

  async function assignGoal(taskId, goalId) {
    await window.api.tasks.linkToGoal(taskId, goalId)
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t
        const goal = goals.find((g) => g.id === goalId)
        return { ...t, goal_id: goalId || null, goal_name: goal?.text || null }
      })
    )
  }

  async function generateSummary() {
    setSummaryLoading(true)
    const res = await window.api.ai.weeklySummary(spaceId, weekStart)
    setSummary(res.text)
    setSummaryLoading(false)
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div className="thisweek-tab">
      {/* Tasks */}
      <div className="subsection">
        <div className="subsection-title">
          Tasks
          {open.length > 0 && <span className="badge-count">{open.length}</span>}
        </div>

        <div className="task-list">
          {open.map((task) => (
            <TaskRow key={task.id} task={task} goals={goals} onToggle={toggleTask} onDelete={deleteTask} onAssignGoal={assignGoal} onEdit={editTask} />
          ))}
          {done.map((task) => (
            <TaskRow key={task.id} task={task} goals={goals} onToggle={toggleTask} onDelete={deleteTask} onAssignGoal={assignGoal} onEdit={editTask} />
          ))}
          {tasks.length === 0 && (
            <div style={{ color: 'var(--c-text-3)', fontSize: 13, padding: '6px 0' }}>
              No tasks yet.
            </div>
          )}
        </div>

        <form className="add-form" onSubmit={addTask}>
          <input
            className="add-input"
            placeholder="Add a task…"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <input
            type="date"
            className="add-input date-input"
            value={newDue}
            min={todayStr()}
            onChange={(e) => setNewDue(e.target.value)}
          />
          <button className="add-btn" type="submit">Add</button>
        </form>
      </div>

      {/* Keep in mind */}
      <div className="subsection">
        <div className="subsection-title">Keep in Mind</div>

        <div className="kim-list">
          {kims.filter((k) => k.active).map((kim) => (
            <KimRow
              key={kim.id}
              kim={kim}
              onToggle={toggleKim}
              onEdit={editKimItem}
              onDelete={deleteKim}
            />
          ))}
          {kims.filter((k) => k.active).length === 0 && (
            <div style={{ color: 'var(--c-text-3)', fontSize: 13, padding: '6px 0' }}>
              Nothing noted yet.
            </div>
          )}
        </div>

        <form className="add-form" onSubmit={addKim}>
          <input
            className="add-input"
            placeholder="Something to keep in mind…"
            value={newKim}
            onChange={(e) => setNewKim(e.target.value)}
          />
          <button className="add-btn" type="submit">Add</button>
        </form>
      </div>

      {/* Weekly Briefing */}
      <div className="weekly-summary-section">
        <div className="subsection-title">
          <span>Weekly Briefing</span>
          <button className="gen-btn" onClick={generateSummary} disabled={summaryLoading}>
            {summaryLoading ? 'Generating…' : summary ? 'Regenerate ✦' : 'Generate ✦'}
          </button>
        </div>

        {summaryLoading && (
          <div style={{ color: 'var(--c-text-3)', fontSize: 13 }}>
            Generating briefing…
          </div>
        )}

        {summary && !summaryLoading && (
          <BriefingCard text={summary} weekStart={weekStart} />
        )}

        {!summary && !summaryLoading && (
          <div style={{ color: 'var(--c-text-3)', fontSize: 13 }}>
            Generate a structured AI briefing of this week — accomplishments, open items, goals, and reminders.
          </div>
        )}
      </div>
    </div>
  )
}

// Parses the structured briefing text into labelled sections
function parseBriefing(text) {
  const HEADERS = ['SUMMARY', 'ACCOMPLISHED', 'OPEN ITEMS', 'GOALS', 'WATCH']
  const sections = []
  let current = null

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    const header = HEADERS.find((h) => trimmed.toUpperCase().startsWith(h))
    if (header) {
      if (current) sections.push(current)
      current = { header, lines: [] }
      const rest = trimmed.slice(header.length).replace(/^[:\s]+/, '')
      if (rest) current.lines.push(rest)
    } else if (current && trimmed) {
      current.lines.push(trimmed)
    }
  }
  if (current) sections.push(current)
  return sections.length ? sections : null
}

function BriefingCard({ text, weekStart }) {
  const sections = parseBriefing(text)
  if (!sections) {
    return (
      <div className="briefing-card">
        <p className="briefing-prose">{text}</p>
        <div className="summary-meta">Week of {weekStart}</div>
      </div>
    )
  }
  return (
    <div className="briefing-card">
      {sections.map((sec) => (
        <div key={sec.header} className="briefing-section">
          <div className="briefing-section-label">{sec.header}</div>
          <div className="briefing-section-body">
            {sec.lines.map((line, i) => (
              <div key={i} className={`briefing-line ${line.startsWith('•') || line.startsWith('-') ? 'bullet' : ''}`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="summary-meta">Week of {weekStart}</div>
    </div>
  )
}

function TaskRow({ task, goals, onToggle, onDelete, onAssignGoal, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [editDue, setEditDue] = useState(task.due_date || '')
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function saveEdit() {
    const trimmed = editText.trim()
    if (trimmed) onEdit(task.id, trimmed, editDue || null)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') { setEditText(task.text); setEditDue(task.due_date || ''); setEditing(false) }
  }

  if (editing) {
    return (
      <div
        className="task-row task-row-editing"
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) saveEdit() }}
      >
        <input
          ref={inputRef}
          className="task-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <input
          type="date"
          className="add-input date-input"
          value={editDue}
          onChange={(e) => setEditDue(e.target.value)}
          style={{ flex: 'none' }}
        />
      </div>
    )
  }

  return (
    <div className="task-row">
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label="Toggle"
      >
        {task.done ? '✓' : ''}
      </button>
      <span className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</span>
      {task.due_date && <span className="task-date">{task.due_date}</span>}
      {goals.length > 0 && (
        <select
          className="task-goal-select"
          value={task.goal_id || ''}
          onChange={(e) => onAssignGoal(task.id, e.target.value ? parseInt(e.target.value) : null)}
          title="Assign to goal"
        >
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.text.length > 22 ? g.text.slice(0, 22) + '…' : g.text}
            </option>
          ))}
        </select>
      )}
      <button className="task-edit-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
      <button className="task-delete" onClick={() => onDelete(task.id)}>×</button>
    </div>
  )
}

function KimRow({ kim, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(kim.text)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function saveEdit() {
    const trimmed = editText.trim()
    if (trimmed) onEdit(kim.id, trimmed)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') { setEditText(kim.text); setEditing(false) }
  }

  if (editing) {
    return (
      <div className="kim-row task-row-editing">
        <input
          ref={inputRef}
          className="task-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveEdit}
        />
      </div>
    )
  }

  return (
    <div className="kim-row">
      <span className="kim-dot" />
      <span className="kim-text">{kim.text}</span>
      <button className="note-archive-btn" onClick={() => onToggle(kim.id)}>Archive</button>
      <button className="task-edit-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
      <button className="task-delete" onClick={() => onDelete(kim.id)}>×</button>
    </div>
  )
}
