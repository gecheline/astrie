import Database from 'better-sqlite3'
import path from 'path'

let db

export function getDb(dataPath) {
  if (!db) {
    const dbPath = path.join(dataPath, 'astrie.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initSchema()
    seedIfEmpty()
  }
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS spaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('project', 'personal', 'info', 'other')),
      context_text TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
      goal_id INTEGER,
      text TEXT NOT NULL,
      due_date TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      body TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      target_date TEXT,
      milestone TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS keep_in_mind (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      space_id INTEGER REFERENCES spaces(id) ON DELETE CASCADE,
      week_start TEXT NOT NULL,
      summary_text TEXT DEFAULT '',
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Migration: add goal_id column to existing tasks tables
  const taskCols = db.prepare('PRAGMA table_info(tasks)').all()
  if (!taskCols.find((c) => c.name === 'goal_id')) {
    db.prepare('ALTER TABLE tasks ADD COLUMN goal_id INTEGER').run()
  }

  // Migration: add archived column to journal_entries
  const journalCols = db.prepare('PRAGMA table_info(journal_entries)').all()
  if (!journalCols.find((c) => c.name === 'archived')) {
    db.prepare('ALTER TABLE journal_entries ADD COLUMN archived INTEGER DEFAULT 0').run()
  }
}

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM spaces').get()
  if (count === 0) {
    const insert = db.prepare('INSERT INTO spaces (name, type, context_text) VALUES (?, ?, ?)')
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(...row)
    })
    insertMany([
      ['Canterbury', 'project', ''],
      ['Personal', 'personal', ''],
    ])
  }
}

// ── Spaces ────────────────────────────────────────────────────

export const getSpaces = () =>
  db.prepare('SELECT * FROM spaces ORDER BY id').all()

export const createSpace = ({ name, type }) =>
  db.prepare("INSERT INTO spaces (name, type, context_text) VALUES (?, ?, '')").run(name, type)

export const deleteSpace = (id) =>
  db.prepare('DELETE FROM spaces WHERE id = ?').run(id)

export const updateContext = (id, text) =>
  db.prepare('UPDATE spaces SET context_text = ? WHERE id = ?').run(text, id)

// ── Tasks ─────────────────────────────────────────────────────

export const getTasksBySpace = (spaceId) =>
  db.prepare(`
    SELECT t.*, g.text AS goal_name
    FROM tasks t
    LEFT JOIN goals g ON t.goal_id = g.id
    WHERE t.space_id = ?
    ORDER BY t.created_at
  `).all(spaceId)

export const getTodayTasks = (today) =>
  db.prepare(`
    SELECT t.*, s.name AS space_name, s.type AS space_type
    FROM tasks t JOIN spaces s ON t.space_id = s.id
    WHERE t.due_date = ? AND t.done = 0
    ORDER BY s.id, t.created_at
  `).all(today)

export const getWeekTasks = (start, end) =>
  db.prepare(`
    SELECT t.*, s.name AS space_name, s.type AS space_type
    FROM tasks t JOIN spaces s ON t.space_id = s.id
    WHERE t.due_date >= ? AND t.due_date <= ?
    ORDER BY s.id, t.due_date, t.created_at
  `).all(start, end)

export const getTasksByGoal = (goalId) =>
  db.prepare('SELECT * FROM tasks WHERE goal_id = ? ORDER BY created_at').all(goalId)

export const linkTaskToGoal = (taskId, goalId) =>
  db.prepare('UPDATE tasks SET goal_id = ? WHERE id = ?').run(goalId, taskId)

export const createTask = ({ space_id, goal_id = null, text, due_date = null, is_recurring = 0 }) =>
  db.prepare(
    'INSERT INTO tasks (space_id, goal_id, text, due_date, is_recurring) VALUES (?, ?, ?, ?, ?)'
  ).run(space_id, goal_id, text, due_date, is_recurring)

export const toggleTask = (id) =>
  db.prepare('UPDATE tasks SET done = 1 - done WHERE id = ?').run(id)

export const deleteTask = (id) =>
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)

export const updateTask = ({ id, text, due_date }) =>
  db.prepare('UPDATE tasks SET text = ?, due_date = ? WHERE id = ?').run(text, due_date, id)

// ── Goals ─────────────────────────────────────────────────────

export const getGoalsBySpace = (spaceId) =>
  db.prepare('SELECT * FROM goals WHERE space_id = ? ORDER BY created_at').all(spaceId)

export const getGoalsWithProgress = (spaceId) =>
  db.prepare(`
    SELECT
      g.*,
      COUNT(t.id) AS task_count,
      COALESCE(SUM(CASE WHEN t.done = 1 THEN 1 ELSE 0 END), 0) AS tasks_done
    FROM goals g
    LEFT JOIN tasks t ON t.goal_id = g.id
    WHERE g.space_id = ?
    GROUP BY g.id
    ORDER BY g.created_at
  `).all(spaceId)

export const getAllGoals = () =>
  db.prepare(`
    SELECT g.*, s.name AS space_name, s.type AS space_type
    FROM goals g JOIN spaces s ON g.space_id = s.id
    ORDER BY s.id, g.created_at
  `).all()

export const createGoal = ({ space_id, text, target_date = null, milestone = null }) =>
  db.prepare(
    'INSERT INTO goals (space_id, text, target_date, milestone) VALUES (?, ?, ?, ?)'
  ).run(space_id, text, target_date, milestone)

export const toggleGoal = (id) =>
  db.prepare('UPDATE goals SET done = 1 - done WHERE id = ?').run(id)

export function deleteGoal(id) {
  db.prepare('UPDATE tasks SET goal_id = NULL WHERE goal_id = ?').run(id)
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}

export const updateGoal = ({ id, text, target_date, milestone }) =>
  db.prepare(
    'UPDATE goals SET text = ?, target_date = ?, milestone = ? WHERE id = ?'
  ).run(text, target_date, milestone, id)

// ── Keep In Mind ──────────────────────────────────────────────

export const getKeepInMindBySpace = (spaceId) =>
  db.prepare('SELECT * FROM keep_in_mind WHERE space_id = ? ORDER BY created_at').all(spaceId)

export const getAllActiveKim = () =>
  db.prepare(`
    SELECT k.*, s.name AS space_name
    FROM keep_in_mind k JOIN spaces s ON k.space_id = s.id
    WHERE k.active = 1
    ORDER BY s.id, k.created_at
  `).all()

export const createKeepInMind = ({ space_id, text }) =>
  db.prepare('INSERT INTO keep_in_mind (space_id, text) VALUES (?, ?)').run(space_id, text)

export const updateKeepInMind = (id, text) =>
  db.prepare('UPDATE keep_in_mind SET text = ? WHERE id = ?').run(text, id)

export const toggleKeepInMind = (id) =>
  db.prepare('UPDATE keep_in_mind SET active = 1 - active WHERE id = ?').run(id)

export const deleteKeepInMind = (id) =>
  db.prepare('DELETE FROM keep_in_mind WHERE id = ?').run(id)

export const getArchivedKimBySpace = (spaceId) =>
  db.prepare('SELECT * FROM keep_in_mind WHERE space_id = ? AND active = 0 ORDER BY created_at DESC').all(spaceId)

// ── Journal ───────────────────────────────────────────────────

export const getJournalEntry = (date) =>
  db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(date)

export const upsertJournalEntry = (date, body) =>
  db.prepare(
    'INSERT INTO journal_entries (date, body) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET body = excluded.body'
  ).run(date, body)

// ── Journal (extended) ───────────────────────────────────────

export const getRecentJournals = (limit = 7) =>
  db.prepare(
    'SELECT * FROM journal_entries WHERE (archived = 0 OR archived IS NULL) AND body != \'\' ORDER BY date DESC LIMIT ?'
  ).all(limit)

export const getAllNotes = () =>
  db.prepare(
    "SELECT * FROM journal_entries WHERE (archived = 0 OR archived IS NULL) AND body != '' AND body IS NOT NULL ORDER BY date DESC"
  ).all()

export const getArchivedNotes = () =>
  db.prepare(
    "SELECT * FROM journal_entries WHERE archived = 1 AND body != '' AND body IS NOT NULL ORDER BY date DESC"
  ).all()

export const archiveNote = (date) =>
  db.prepare('UPDATE journal_entries SET archived = 1 WHERE date = ?').run(date)

export const unarchiveNote = (date) =>
  db.prepare('UPDATE journal_entries SET archived = 0 WHERE date = ?').run(date)

export const deleteNote = (date) =>
  db.prepare('DELETE FROM journal_entries WHERE date = ?').run(date)

// ── Weekly Summaries ──────────────────────────────────────────

export const getWeeklySummary = (spaceId, weekStart) =>
  db.prepare(
    'SELECT * FROM weekly_summaries WHERE space_id = ? AND week_start = ?'
  ).get(spaceId, weekStart)

export function saveWeeklySummary(spaceId, weekStart, summaryText) {
  const existing = db.prepare(
    'SELECT id FROM weekly_summaries WHERE space_id = ? AND week_start = ?'
  ).get(spaceId, weekStart)
  if (existing) {
    db.prepare(
      'UPDATE weekly_summaries SET summary_text = ?, generated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(summaryText, existing.id)
  } else {
    db.prepare(
      'INSERT INTO weekly_summaries (space_id, week_start, summary_text) VALUES (?, ?, ?)'
    ).run(spaceId, weekStart, summaryText)
  }
}
