import { useState, useEffect, useRef } from 'react'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function GoalsTab({ spaceId }) {
  const [goals, setGoals] = useState([])       // includes task_count, tasks_done
  const [tasksByGoal, setTasksByGoal] = useState({})  // goalId -> Task[]
  const [expanded, setExpanded] = useState(new Set())

  // New-goal form
  const [newText, setNewText] = useState('')
  const [newMilestone, setNewMilestone] = useState('')
  const [newTargetDate, setNewTargetDate] = useState('')

  useEffect(() => {
    loadGoals()
  }, [spaceId])

  async function loadGoals() {
    const gs = await window.api.goals.getWithProgress(spaceId)
    setGoals(gs)
    const map = {}
    await Promise.all(
      gs.map(async (g) => {
        map[g.id] = await window.api.tasks.getByGoal(g.id)
      })
    )
    setTasksByGoal(map)
  }

  function toggleExpand(goalId) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(goalId) ? next.delete(goalId) : next.add(goalId)
      return next
    })
  }

  async function handleAddGoal(e) {
    e.preventDefault()
    if (!newText.trim()) return
    const { id } = await window.api.goals.create({
      space_id: spaceId,
      text: newText.trim(),
      milestone: newMilestone.trim() || null,
      target_date: newTargetDate || null,
    })
    const newGoal = {
      id,
      space_id: spaceId,
      text: newText.trim(),
      milestone: newMilestone.trim() || null,
      target_date: newTargetDate || null,
      done: 0,
      task_count: 0,
      tasks_done: 0,
    }
    setGoals((prev) => [...prev, newGoal])
    setTasksByGoal((prev) => ({ ...prev, [id]: [] }))
    setExpanded((prev) => new Set([...prev, id]))
    setNewText('')
    setNewMilestone('')
    setNewTargetDate('')
  }

  async function handleToggleGoal(id) {
    await window.api.goals.toggle(id)
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: g.done ? 0 : 1 } : g)))
  }

  async function handleDeleteGoal(id) {
    await window.api.goals.delete(id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
    setTasksByGoal((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleEditGoal(id, text, milestone, targetDate) {
    await window.api.goals.update({ id, text, milestone: milestone || null, target_date: targetDate || null })
    setGoals((prev) =>
      prev.map((g) => g.id === id ? { ...g, text, milestone: milestone || null, target_date: targetDate || null } : g)
    )
  }

  async function handleAddTask(goalId, text, dueDate) {
    const { id } = await window.api.tasks.create({
      space_id: spaceId,
      goal_id: goalId,
      text,
      due_date: dueDate || null,
    })
    const task = { id, space_id: spaceId, goal_id: goalId, text, due_date: dueDate || null, done: 0 }
    setTasksByGoal((prev) => ({ ...prev, [goalId]: [...(prev[goalId] || []), task] }))
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, task_count: g.task_count + 1 } : g))
    )
  }

  async function handleToggleTask(goalId, taskId) {
    await window.api.tasks.toggle(taskId)
    setTasksByGoal((prev) => ({
      ...prev,
      [goalId]: prev[goalId].map((t) => (t.id === taskId ? { ...t, done: t.done ? 0 : 1 } : t)),
    }))
    // Recompute tasks_done for the goal
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g
        const tasks = tasksByGoal[goalId] || []
        const toggled = tasks.map((t) => (t.id === taskId ? { ...t, done: t.done ? 0 : 1 } : t))
        const done = toggled.filter((t) => t.done).length
        return { ...g, tasks_done: done }
      })
    )
  }

  async function handleDeleteTask(goalId, taskId) {
    await window.api.tasks.delete(taskId)
    setTasksByGoal((prev) => ({
      ...prev,
      [goalId]: prev[goalId].filter((t) => t.id !== taskId),
    }))
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, task_count: Math.max(0, g.task_count - 1) } : g
      )
    )
  }

  async function handleEditTask(goalId, taskId, text, due) {
    await window.api.tasks.update({ id: taskId, text, due_date: due })
    setTasksByGoal((prev) => ({
      ...prev,
      [goalId]: prev[goalId].map((t) => t.id === taskId ? { ...t, text, due_date: due } : t),
    }))
  }

  const open = goals.filter((g) => !g.done)
  const done = goals.filter((g) => g.done)

  return (
    <div className="goals-tab">
      {goals.length === 0 && (
        <div style={{ color: 'var(--c-text-3)', fontSize: 13.5, paddingBottom: 16 }}>
          No goals yet. Add one below — each goal gets its own task list and progress bar.
        </div>
      )}

      <div className="goal-list-v2">
        {[...open, ...done].map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            tasks={tasksByGoal[goal.id] || []}
            isExpanded={expanded.has(goal.id)}
            onToggleExpand={() => toggleExpand(goal.id)}
            onToggleGoal={() => handleToggleGoal(goal.id)}
            onDeleteGoal={() => handleDeleteGoal(goal.id)}
            onEditGoal={(text, milestone, targetDate) => handleEditGoal(goal.id, text, milestone, targetDate)}
            onAddTask={(text, due) => handleAddTask(goal.id, text, due)}
            onToggleTask={(taskId) => handleToggleTask(goal.id, taskId)}
            onDeleteTask={(taskId) => handleDeleteTask(goal.id, taskId)}
            onEditTask={(taskId, text, due) => handleEditTask(goal.id, taskId, text, due)}
          />
        ))}
      </div>

      {/* New goal form */}
      <form className="goal-add-form" onSubmit={handleAddGoal}>
        <div className="context-label" style={{ marginBottom: 8 }}>New Goal</div>
        <input
          className="add-input"
          placeholder="Goal name…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <div className="goal-form-row">
          <input
            className="add-input"
            placeholder="Milestone label (optional)"
            value={newMilestone}
            onChange={(e) => setNewMilestone(e.target.value)}
          />
          <input
            type="date"
            className="add-input date-input"
            value={newTargetDate}
            onChange={(e) => setNewTargetDate(e.target.value)}
          />
          <button className="add-btn" type="submit" style={{ flexShrink: 0 }}>Add</button>
        </div>
      </form>
    </div>
  )
}

function GoalCard({
  goal, tasks, isExpanded,
  onToggleExpand, onToggleGoal, onDeleteGoal, onEditGoal,
  onAddTask, onToggleTask, onDeleteTask, onEditTask,
}) {
  const [newTask, setNewTask] = useState('')
  const [newDue, setNewDue] = useState('')
  const inputRef = useRef(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [editText, setEditText] = useState(goal.text)
  const [editMilestone, setEditMilestone] = useState(goal.milestone || '')
  const [editDate, setEditDate] = useState(goal.target_date || '')

  const total = goal.task_count ?? tasks.length
  const done = goal.tasks_done ?? tasks.filter((t) => t.done).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  function handleAddTask(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    onAddTask(newTask.trim(), newDue || null)
    setNewTask('')
    setNewDue('')
    inputRef.current?.focus()
  }

  function saveGoalEdit() {
    const trimmed = editText.trim()
    if (trimmed) onEditGoal(trimmed, editMilestone.trim(), editDate)
    setEditingGoal(false)
  }

  return (
    <div className={`goal-card-v2 ${goal.done || allDone ? 'done-card' : ''}`}>
      {/* Header */}
      <div className="goal-card-header">
        <button
          className={`goal-check ${goal.done ? 'checked' : ''}`}
          onClick={onToggleGoal}
          title="Mark goal complete"
        >
          {goal.done ? '✓' : ''}
        </button>

        {editingGoal ? (
          <div className="goal-edit-form" onClick={(e) => e.stopPropagation()}>
            <input
              className="add-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveGoalEdit(); if (e.key === 'Escape') setEditingGoal(false) }}
              autoFocus
              style={{ flex: 1 }}
            />
            <div className="goal-form-row" style={{ marginTop: 6 }}>
              <input
                className="add-input"
                placeholder="Milestone"
                value={editMilestone}
                onChange={(e) => setEditMilestone(e.target.value)}
              />
              <input
                type="date"
                className="add-input date-input"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <button className="add-btn" onClick={saveGoalEdit} style={{ flexShrink: 0 }}>Save</button>
              <button className="sidebar-cancel-btn" onClick={() => setEditingGoal(false)} style={{ flexShrink: 0 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="goal-card-main" onClick={onToggleExpand} style={{ cursor: 'pointer' }}>
            <div className={`goal-text ${goal.done ? 'done' : ''}`}>{goal.text}</div>
            {(goal.milestone || goal.target_date) && (
              <div className="goal-meta">
                {goal.milestone && <span className="goal-milestone">{goal.milestone}</span>}
                {goal.target_date && <span className="goal-date">by {goal.target_date}</span>}
              </div>
            )}
          </div>
        )}

        {!editingGoal && (
          <div className="goal-card-actions">
            {total > 0 && (
              <span className={`goal-task-fraction ${allDone ? 'all-done' : ''}`}>
                {done}/{total}
              </span>
            )}
            <button
              className={`goal-expand-btn ${isExpanded ? 'open' : ''}`}
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              ›
            </button>
            <button className="task-edit-btn" onClick={() => setEditingGoal(true)} title="Edit goal">✎</button>
            <button className="task-delete" onClick={onDeleteGoal} title="Delete goal">×</button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="goal-card-bar">
          <div className="goal-progress-bar-wrap" style={{ borderRadius: 0, margin: 0 }}>
            <div
              className={`goal-progress-bar ${allDone ? 'complete' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded body */}
      {isExpanded && (
        <div className="goal-card-body">
          {tasks.length === 0 && (
            <div className="goal-empty-tasks">No tasks yet — add one below.</div>
          )}
          {tasks.map((task) => (
            <GoalTaskRow
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task.id)}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={(text, due) => onEditTask(task.id, text, due)}
            />
          ))}

          <form className="goal-inline-add" onSubmit={handleAddTask}>
            <input
              ref={inputRef}
              className="add-input"
              placeholder="Add a task to this goal…"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              style={{ flex: 1 }}
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
      )}
    </div>
  )
}

function GoalTaskRow({ task, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const [editDue, setEditDue] = useState(task.due_date || '')
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function saveEdit() {
    const trimmed = editText.trim()
    if (trimmed) onEdit(trimmed, editDue || null)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') { setEditText(task.text); setEditDue(task.due_date || ''); setEditing(false) }
  }

  if (editing) {
    return (
      <div
        className="goal-task-row task-row-editing"
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) saveEdit() }}
      >
        <input
          ref={inputRef}
          className="task-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ fontSize: 13 }}
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
    <div className="goal-task-row">
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={onToggle}
        style={{ width: 15, height: 15, fontSize: 9 }}
      >
        {task.done ? '✓' : ''}
      </button>
      <span className={`task-text ${task.done ? 'done' : ''}`} style={{ fontSize: 13 }}>
        {task.text}
      </span>
      {task.due_date && <span className="task-date">{task.due_date}</span>}
      <button className="task-edit-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
      <button className="task-delete" onClick={onDelete}>×</button>
    </div>
  )
}
