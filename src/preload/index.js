const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  spaces: {
    getAll: () => ipcRenderer.invoke('spaces:getAll'),
    create: (opts) => ipcRenderer.invoke('spaces:create', opts),
    updateContext: (id, text) => ipcRenderer.invoke('spaces:updateContext', id, text),
    delete: (id) => ipcRenderer.invoke('spaces:delete', id),
  },
  tasks: {
    getBySpace: (spaceId) => ipcRenderer.invoke('tasks:getBySpace', spaceId),
    getByGoal: (goalId) => ipcRenderer.invoke('tasks:getByGoal', goalId),
    linkToGoal: (taskId, goalId) => ipcRenderer.invoke('tasks:linkToGoal', taskId, goalId),
    getToday: (today) => ipcRenderer.invoke('tasks:getToday', today),
    getWeek: (start, end) => ipcRenderer.invoke('tasks:getWeek', start, end),
    create: (task) => ipcRenderer.invoke('tasks:create', task),
    toggle: (id) => ipcRenderer.invoke('tasks:toggle', id),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    update: (task) => ipcRenderer.invoke('tasks:update', task),
  },
  goals: {
    getBySpace: (spaceId) => ipcRenderer.invoke('goals:getBySpace', spaceId),
    getWithProgress: (spaceId) => ipcRenderer.invoke('goals:getWithProgress', spaceId),
    getAll: () => ipcRenderer.invoke('goals:getAll'),
    create: (goal) => ipcRenderer.invoke('goals:create', goal),
    toggle: (id) => ipcRenderer.invoke('goals:toggle', id),
    delete: (id) => ipcRenderer.invoke('goals:delete', id),
    update: (goal) => ipcRenderer.invoke('goals:update', goal),
  },
  kim: {
    getBySpace: (spaceId) => ipcRenderer.invoke('kim:getBySpace', spaceId),
    getAll: () => ipcRenderer.invoke('kim:getAll'),
    getArchived: (spaceId) => ipcRenderer.invoke('kim:getArchived', spaceId),
    create: (item) => ipcRenderer.invoke('kim:create', item),
    update: (id, text) => ipcRenderer.invoke('kim:update', id, text),
    toggle: (id) => ipcRenderer.invoke('kim:toggle', id),
    delete: (id) => ipcRenderer.invoke('kim:delete', id),
  },
  journal: {
    get: (date) => ipcRenderer.invoke('journal:get', date),
    getRecent: (limit) => ipcRenderer.invoke('journal:getRecent', limit),
    getAll: () => ipcRenderer.invoke('journal:getAll'),
    getArchived: () => ipcRenderer.invoke('journal:getArchived'),
    upsert: (date, body) => ipcRenderer.invoke('journal:upsert', date, body),
    archive: (date) => ipcRenderer.invoke('journal:archive', date),
    unarchive: (date) => ipcRenderer.invoke('journal:unarchive', date),
    delete: (date) => ipcRenderer.invoke('journal:delete', date),
  },
  weekly: {
    getSummary: (spaceId, weekStart) =>
      ipcRenderer.invoke('weekly:getSummary', spaceId, weekStart),
  },
  ai: {
    contextInfo: () => ipcRenderer.invoke('ai:contextInfo'),
    nudge: (today) => ipcRenderer.invoke('ai:nudge', today),
    chat: (messages) => ipcRenderer.invoke('ai:chat', messages),
    weeklySummary: (spaceId, weekStart) =>
      ipcRenderer.invoke('ai:weeklySummary', spaceId, weekStart),
  },
})
