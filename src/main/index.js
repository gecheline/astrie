import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: app.isPackaged
    ? path.join(process.resourcesPath, '.env')
    : path.resolve(process.cwd(), '.env'),
})

let mainWindow
let anthropic

// ── Date helpers ──────────────────────────────────────────────

function getWeekStart(today) {
  const d = new Date(today + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().split('T')[0]
}

function getWeekEnd(weekStart) {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

// ── Window ────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 920,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#F7F6F3',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  db.getDb(app.getPath('userData'))

  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: Spaces ───────────────────────────────────────────────

ipcMain.handle('spaces:getAll', () => db.getSpaces())

ipcMain.handle('spaces:create', (_, { name, type }) => {
  const result = db.createSpace({ name, type })
  return { id: result.lastInsertRowid, name, type, context_text: '' }
})

ipcMain.handle('spaces:updateContext', (_, id, text) => {
  db.updateContext(id, text)
  return { ok: true }
})

ipcMain.handle('spaces:delete', (_, id) => { db.deleteSpace(id); return { ok: true } })

// ── IPC: Tasks ────────────────────────────────────────────────

ipcMain.handle('tasks:getBySpace', (_, spaceId) => db.getTasksBySpace(spaceId))
ipcMain.handle('tasks:getToday', (_, today) => db.getTodayTasks(today))
ipcMain.handle('tasks:getWeek', (_, start, end) => db.getWeekTasks(start, end))

ipcMain.handle('tasks:create', (_, task) => {
  const result = db.createTask(task)
  return { id: result.lastInsertRowid }
})

ipcMain.handle('tasks:getByGoal', (_, goalId) => db.getTasksByGoal(goalId))
ipcMain.handle('tasks:linkToGoal', (_, taskId, goalId) => {
  db.linkTaskToGoal(taskId, goalId)
  return { ok: true }
})
ipcMain.handle('tasks:toggle', (_, id) => { db.toggleTask(id); return { ok: true } })
ipcMain.handle('tasks:delete', (_, id) => { db.deleteTask(id); return { ok: true } })
ipcMain.handle('tasks:update', (_, task) => { db.updateTask(task); return { ok: true } })

// ── IPC: Goals ────────────────────────────────────────────────

ipcMain.handle('goals:getBySpace', (_, spaceId) => db.getGoalsBySpace(spaceId))
ipcMain.handle('goals:getWithProgress', (_, spaceId) => db.getGoalsWithProgress(spaceId))
ipcMain.handle('goals:getAll', () => db.getAllGoals())

ipcMain.handle('goals:create', (_, goal) => {
  const result = db.createGoal(goal)
  return { id: result.lastInsertRowid }
})

ipcMain.handle('goals:toggle', (_, id) => { db.toggleGoal(id); return { ok: true } })
ipcMain.handle('goals:delete', (_, id) => { db.deleteGoal(id); return { ok: true } })
ipcMain.handle('goals:update', (_, goal) => { db.updateGoal(goal); return { ok: true } })

// ── IPC: Keep In Mind ─────────────────────────────────────────

ipcMain.handle('kim:getBySpace', (_, spaceId) => db.getKeepInMindBySpace(spaceId))
ipcMain.handle('kim:getAll', () => db.getAllActiveKim())

ipcMain.handle('kim:create', (_, item) => {
  const result = db.createKeepInMind(item)
  return { id: result.lastInsertRowid }
})

ipcMain.handle('kim:update', (_, id, text) => { db.updateKeepInMind(id, text); return { ok: true } })
ipcMain.handle('kim:toggle', (_, id) => { db.toggleKeepInMind(id); return { ok: true } })
ipcMain.handle('kim:delete', (_, id) => { db.deleteKeepInMind(id); return { ok: true } })
ipcMain.handle('kim:getArchived', (_, spaceId) => db.getArchivedKimBySpace(spaceId))

// ── IPC: Journal ──────────────────────────────────────────────

ipcMain.handle('journal:get', (_, date) => db.getJournalEntry(date))

ipcMain.handle('journal:getRecent', (_, limit) => db.getRecentJournals(limit ?? 7))

ipcMain.handle('journal:upsert', (_, date, body) => {
  db.upsertJournalEntry(date, body)
  return { ok: true }
})

ipcMain.handle('journal:getAll', () => db.getAllNotes())
ipcMain.handle('journal:getArchived', () => db.getArchivedNotes())
ipcMain.handle('journal:archive', (_, date) => { db.archiveNote(date); return { ok: true } })
ipcMain.handle('journal:unarchive', (_, date) => { db.unarchiveNote(date); return { ok: true } })
ipcMain.handle('journal:delete', (_, date) => { db.deleteNote(date); return { ok: true } })

// ── IPC: Weekly Summaries ─────────────────────────────────────

ipcMain.handle('weekly:getSummary', (_, spaceId, weekStart) =>
  db.getWeeklySummary(spaceId, weekStart)
)

// ── IPC: AI – context info (no API call) ─────────────────────

ipcMain.handle('ai:contextInfo', () => {
  const today = new Date().toISOString().split('T')[0]
  const weekStart = getWeekStart(today)
  const weekEnd = getWeekEnd(weekStart)
  return {
    spaces: db.getSpaces().length,
    journals: db.getRecentJournals(7).length,
    weekTasks: db.getWeekTasks(weekStart, weekEnd).length,
    kims: db.getAllActiveKim().length,
    hasKey: !!anthropic,
  }
})

// ── IPC: AI – daily nudge ─────────────────────────────────────

ipcMain.handle('ai:nudge', async (_, today) => {
  if (!anthropic) {
    return {
      items: ['Add ANTHROPIC_API_KEY to your .env to enable AI nudges.'],
      raw: '',
    }
  }
  try {
    const spaces = db.getSpaces()
    const tasks = db.getTodayTasks(today)
    const weekStart = getWeekStart(today)
    const weekEnd = getWeekEnd(weekStart)
    const weekTasks = db.getWeekTasks(weekStart, weekEnd).filter((t) => !t.done)
    const allKims = db.getAllActiveKim()
    const journal = db.getJournalEntry(today)

    const contextBlock = spaces
      .filter((s) => s.context_text)
      .map((s) => `${s.name}: ${s.context_text}`)
      .join('\n') || 'No context set.'

    const todayBlock = tasks.length
      ? tasks.map((t) => `[${t.space_name}] ${t.text}`).join('\n')
      : 'Nothing due today.'

    const weekBlock = weekTasks.length
      ? weekTasks.slice(0, 8).map((t) => `[${t.space_name}] ${t.text} (${t.due_date})`).join('\n')
      : 'No pending tasks this week.'

    const kimBlock = allKims.length
      ? allKims.map((k) => `[${k.space_name}] ${k.text}`).join('\n')
      : ''

    const prompt = `You are Astrie. Look at everything below and find the 3 most important things this person must not forget today.

Be specific — reference actual task names, project names, or notes. Each item should be max 12 words.

Return ONLY 3 lines in this exact format (no other text):
1. [thing]
2. [thing]
3. [thing]

---
Context:
${contextBlock}

Due today:
${todayBlock}

This week (open):
${weekBlock}
${kimBlock ? `\nKeep in mind:\n${kimBlock}` : ''}${journal?.body ? `\nToday's journal: ${journal.body}` : ''}`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].text.trim()
    const items = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[1-3][.)]\s/.test(l))
      .map((l) => l.replace(/^[1-3][.)]\s+/, '').trim())
      .filter(Boolean)
      .slice(0, 3)

    // Fallback if parsing fails
    if (items.length === 0) {
      const fallback = raw.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3)
      return { items: fallback.length ? fallback : [raw], raw }
    }

    return { items, raw }
  } catch (err) {
    return { items: [`Error: ${err.message}`], raw: '' }
  }
})

// ── IPC: AI – chat ────────────────────────────────────────────

ipcMain.handle('ai:chat', async (_, messages) => {
  if (!anthropic) {
    return { text: 'Add ANTHROPIC_API_KEY to your .env file to enable AI chat.' }
  }
  try {
    const spaces = db.getSpaces()
    const today = new Date().toISOString().split('T')[0]
    const weekStart = getWeekStart(today)
    const weekEnd = getWeekEnd(weekStart)
    const weekTasks = db.getWeekTasks(weekStart, weekEnd)
    const allKims = db.getAllActiveKim()
    const recentJournals = db.getRecentJournals(7)

    const spaceSection = spaces
      .map((s) => {
        const lines = [`### ${s.name} (${s.type})`, s.context_text || '_No context set._']
        return lines.join('\n')
      })
      .join('\n\n')

    const taskSection = weekTasks.length
      ? weekTasks
          .map((t) => `${t.done ? '✓' : '○'} [${t.space_name}] ${t.text}${t.due_date ? ` · ${t.due_date}` : ''}`)
          .join('\n')
      : 'No tasks this week.'

    const kimSection = allKims.length
      ? allKims.map((k) => `• [${k.space_name}] ${k.text}`).join('\n')
      : 'Nothing noted.'

    const journalSection = recentJournals.length
      ? recentJournals
          .filter((j) => j.body)
          .map((j) => `${j.date}: ${j.body}`)
          .join('\n')
      : 'No recent journal entries.'

    const system = `You are Astrie, a personal AI assistant embedded in the user's workspace. You have complete context of their work, projects, and personal life below. Answer concisely and specifically — never generically.

## Spaces & Context

${spaceSection}

## This Week's Tasks (${weekStart} – ${weekEnd})

${taskSection}

## Keep in Mind

${kimSection}

## Recent Journal (last 7 days)

${journalSection}`

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system,
      messages,
    })
    return { text: msg.content[0].text }
  } catch (err) {
    return { text: `Error: ${err.message}` }
  }
})

// ── IPC: AI – weekly briefing ─────────────────────────────────

ipcMain.handle('ai:weeklySummary', async (_, spaceId, weekStart) => {
  if (!anthropic) {
    return { text: 'Add ANTHROPIC_API_KEY to your .env to enable AI summaries.' }
  }
  try {
    const spaces = db.getSpaces()
    const space = spaces.find((s) => s.id === spaceId)
    if (!space) return { text: 'Space not found.' }

    const weekEnd = getWeekEnd(weekStart)
    const spaceTasks = db.getWeekTasks(weekStart, weekEnd).filter((t) => t.space_id === spaceId)
    const goals = db.getGoalsBySpace(spaceId)
    const kims = db.getKeepInMindBySpace(spaceId)
    const recentJournals = db.getRecentJournals(7)

    const doneTasks = spaceTasks.filter((t) => t.done)
    const openTasks = spaceTasks.filter((t) => !t.done)
    const doneGoals = goals.filter((g) => g.done)
    const openGoals = goals.filter((g) => !g.done)

    const journalSnippet = recentJournals
      .filter((j) => j.body)
      .slice(0, 3)
      .map((j) => `${j.date}: ${j.body}`)
      .join('\n') || 'No recent journal entries.'

    const prompt = `Write a structured weekly briefing for the "${space.name}" space. Be specific and honest — only reference what actually exists below.

Use EXACTLY this format (keep the section headers in ALL CAPS):

SUMMARY
[1–2 sentence overview of this week in this space]

ACCOMPLISHED
[bullet list with • — or "Nothing completed this week." if empty]

OPEN ITEMS
[bullet list with • — or "Nothing pending." if empty]

GOALS  ${doneGoals.length}/${goals.length} complete
[list each goal: ✓ for done, ○ for open]

WATCH
[active keep-in-mind items with • — or "Nothing flagged." if empty]

---
Context: ${space.context_text || 'No context set.'}

Week: ${weekStart} – ${weekEnd}
Completed tasks: ${doneTasks.map((t) => t.text).join(', ') || 'none'}
Open tasks: ${openTasks.map((t) => t.text).join(', ') || 'none'}
Goals: ${goals.map((g) => `${g.done ? '✓' : '○'} ${g.text}`).join(', ') || 'none'}
Keep in mind: ${kims.filter((k) => k.active).map((k) => k.text).join(', ') || 'none'}
Recent journal:
${journalSnippet}`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 320,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].text
    db.saveWeeklySummary(spaceId, weekStart, text)
    return { text }
  } catch (err) {
    return { text: `Could not generate briefing: ${err.message}` }
  }
})
