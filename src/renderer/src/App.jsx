import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import TodayView from './views/TodayView'
import WeekView from './views/WeekView'
import SpaceView from './views/SpaceView'
import AIChat from './components/AIChat'

export default function App() {
  const [spaces, setSpaces] = useState([])
  const [activeView, setActiveView] = useState('today')
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    window.api.spaces.getAll().then(setSpaces)
  }, [])

  async function handleAddSpace(name, type) {
    const space = await window.api.spaces.create({ name, type })
    setSpaces((prev) => [...prev, space])
    setActiveView(space.id)
  }

  function handleContextSaved(spaceId, text) {
    setSpaces((prev) =>
      prev.map((s) => (s.id === spaceId ? { ...s, context_text: text } : s))
    )
  }

  async function handleDeleteSpace(id) {
    await window.api.spaces.delete(id)
    setSpaces((prev) => prev.filter((s) => s.id !== id))
    if (activeView === id) setActiveView('today')
  }

  const activeSpace = spaces.find((s) => s.id === activeView)

  return (
    <div className="app-shell">
      <Sidebar
        spaces={spaces}
        activeView={activeView}
        onNavigate={setActiveView}
        onAddSpace={handleAddSpace}
        onDeleteSpace={handleDeleteSpace}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
      />
      <main className="main-content">
        {activeView === 'today' && <TodayView spaces={spaces} />}
        {activeView === 'week' && <WeekView spaces={spaces} />}
        {activeSpace && (
          <SpaceView
            key={activeSpace.id}
            space={activeSpace}
            onContextSaved={(text) => handleContextSaved(activeSpace.id, text)}
          />
        )}
      </main>
      <AIChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
