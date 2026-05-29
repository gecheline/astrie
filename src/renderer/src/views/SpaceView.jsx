import { useState } from 'react'
import ContextTab from '../components/ContextTab'
import ThisWeekTab from '../components/ThisWeekTab'
import GoalsTab from '../components/GoalsTab'
import NotesTab from '../components/NotesTab'
import ArchiveTab from '../components/ArchiveTab'

const TABS = [
  { id: 'context', label: 'Context' },
  { id: 'thisweek', label: 'This Week' },
  { id: 'goals', label: 'Goals' },
  { id: 'notes', label: 'Notes' },
  { id: 'archive', label: 'Archive' },
]

const TYPE_LABEL = {
  project: 'Active Project',
  personal: 'Personal',
  info: 'Open Info',
  other: 'Other',
}

export default function SpaceView({ space, onContextSaved }) {
  const [activeTab, setActiveTab] = useState('context')

  return (
    <div className="space-view">
      <div className="space-header">
        <div className="space-header-top">
          <h2 className="space-name">{space.name}</h2>
          <span className="space-type-badge">{TYPE_LABEL[space.type] ?? space.type}</span>
        </div>
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-body">
        {activeTab === 'context' && (
          <ContextTab spaceId={space.id} initialText={space.context_text} onSaved={onContextSaved} />
        )}
        {activeTab === 'thisweek' && <ThisWeekTab spaceId={space.id} />}
        {activeTab === 'goals' && <GoalsTab spaceId={space.id} />}
        {activeTab === 'notes' && <NotesTab />}
        {activeTab === 'archive' && <ArchiveTab spaceId={space.id} />}
      </div>
    </div>
  )
}
