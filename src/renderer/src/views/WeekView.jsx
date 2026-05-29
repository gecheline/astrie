import { useState, useEffect, useCallback } from 'react'

function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  return {
    start: mon.toISOString().split('T')[0],
    end: sun.toISOString().split('T')[0],
    label: `${fmt(mon)} – ${fmt(sun)}, ${sun.getFullYear()}`,
  }
}

function fmtDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function WeekView({ spaces }) {
  const week = getWeekBounds()
  const [tasks, setTasks] = useState([])
  const [goalsBySpace, setGoalsBySpace] = useState({})

  useEffect(() => {
    if (!spaces.length) return

    window.api.tasks.getWeek(week.start, week.end).then(setTasks)

    Promise.all(
      spaces.map((s) =>
        window.api.goals.getWithProgress(s.id).then((goals) => ({ id: s.id, goals }))
      )
    ).then((results) => {
      const map = {}
      results.forEach(({ id, goals }) => { map[id] = goals })
      setGoalsBySpace(map)
    })
  }, [week.start, week.end, spaces])

  const toggleTask = useCallback(async (id) => {
    await window.api.tasks.toggle(id)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: t.done ? 0 : 1 } : t)))
  }, [])

  const toggleGoal = useCallback(async (spaceId, id) => {
    await window.api.goals.toggle(id)
    setGoalsBySpace((prev) => ({
      ...prev,
      [spaceId]: prev[spaceId].map((g) => (g.id === id ? { ...g, done: g.done ? 0 : 1 } : g)),
    }))
  }, [])

  // Group tasks by space_id, preserving spaces order
  const taskGroups = spaces
    .map((s) => ({ space: s, tasks: tasks.filter((t) => t.space_id === s.id) }))
    .filter((g) => g.tasks.length > 0)

  const hasAnyGoals = spaces.some((s) => (goalsBySpace[s.id] || []).length > 0)

  return (
    <div className="week-view">
      <div className="week-range">{week.label}</div>
      <h1 className="week-heading">This Week</h1>

      {/* Goals progress */}
      <div className="section-heading" style={{ marginTop: 0 }}>Goals Progress</div>
      {!hasAnyGoals ? (
        <div className="empty-today" style={{ marginBottom: 24 }}>
          No goals set yet — add them in each space under the Goals tab.
        </div>
      ) : (
        <div className="goals-progress-grid">
          {spaces.map((space) => {
            const goals = goalsBySpace[space.id] || []
            if (goals.length === 0) return null
            return (
              <div key={space.id} className="goal-progress-card">
                <div className="goal-progress-header">
                  <span className="goal-progress-space">{space.name}</span>
                </div>
                {goals.map((goal) => {
                  // task-based progress; fall back to manual done flag if no tasks
                  const total = goal.task_count > 0 ? goal.task_count : goal.done ? 1 : 0
                  const done = goal.task_count > 0 ? goal.tasks_done : goal.done ? 1 : 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  const allDone = total > 0 && done === total
                  return (
                    <div key={goal.id} className="goal-progress-item-row">
                      <div className="goal-progress-item-header">
                        <button
                          className={`task-check ${goal.done ? 'checked' : ''}`}
                          style={{ width: 15, height: 15, borderRadius: '50%', fontSize: 9, flexShrink: 0 }}
                          onClick={() => toggleGoal(space.id, goal.id)}
                        >
                          {goal.done ? '✓' : ''}
                        </button>
                        <span className={`task-text ${goal.done ? 'done' : ''}`} style={{ fontSize: 13 }}>
                          {goal.text}
                        </span>
                        {goal.milestone && <span className="goal-milestone">{goal.milestone}</span>}
                        {goal.target_date && <span className="task-date">{goal.target_date}</span>}
                        <span className="goal-task-fraction" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                          {total > 0 ? `${done}/${total}` : '—'}
                        </span>
                      </div>
                      {total > 0 && (
                        <div className="goal-progress-bar-wrap" style={{ marginLeft: 23, marginTop: 5 }}>
                          <div
                            className={`goal-progress-bar ${allDone ? 'complete' : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* This week's tasks */}
      <div className="section-heading">Tasks This Week</div>
      {taskGroups.length === 0 ? (
        <div className="empty-today">
          No tasks scheduled for this week. Assign due dates in each space → This Week.
        </div>
      ) : (
        <div className="today-task-groups">
          {taskGroups.map(({ space, tasks: spaceTasks }) => (
            <div key={space.id} className="task-group">
              <div className="task-group-header">
                <span className="task-group-name">{space.name}</span>
                <span className="task-group-type">{space.type}</span>
              </div>
              <div style={{ padding: '6px 10px 8px' }}>
                {spaceTasks.map((task) => (
                  <WeekTask key={task.id} task={task} onToggle={toggleTask} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WeekTask({ task, onToggle }) {
  return (
    <div className="task-row" style={{ marginBottom: 2 }}>
      <button
        className={`task-check ${task.done ? 'checked' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label="Toggle"
      >
        {task.done ? '✓' : ''}
      </button>
      <span className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</span>
      {task.due_date && <span className="task-date">{fmtDay(task.due_date)}</span>}
    </div>
  )
}
