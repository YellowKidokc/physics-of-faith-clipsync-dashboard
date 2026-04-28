import { useEffect, useState } from 'react';
import { useDashboardStore } from '@/hooks/useDashboardStore';
import { startSyncLoop } from '@/lib/sync';
import { Shell } from '@/components/Shell';
import { ClipboardView } from '@/views/ClipboardView';
import { TTSView } from '@/views/TTSView';
import { PromptsView } from '@/views/PromptsView';
import { ResearchView } from '@/views/ResearchView';
import { CalendarView } from '@/views/CalendarView';
import { NotesView } from '@/views/NotesView';
import { AIHubView } from '@/views/AIHubView';
import { DeepCrawlView } from '@/views/DeepCrawlView';
import { SearchView } from '@/views/SearchView';
import { LinksView } from '@/views/LinksView';
import { SettingsView } from '@/views/SettingsView';
import { CommsView } from '@/views/CommsView';

const SHELL_VIEWS = [
  { id: 'clipboard', label: 'CLIPBOARD', icon: '\u{1F4CB}', color: '#f59e0b' },
  { id: 'tts', label: 'TTS', icon: '\u{1F50A}', color: '#f97316' },
  { id: 'prompts', label: 'PROMPTS', icon: '\u{2328}', color: '#f59e0b' },
  { id: 'research', label: 'RESEARCH', icon: '\u{1F517}', color: '#4F8EF7' },
  { id: 'calendar', label: 'CALENDAR', icon: '\u{1F4C5}', color: '#E05C6E' },
  { id: 'notes', label: 'NOTES', icon: '\u{1F4DD}', color: '#F6821F' },
  { id: 'comms', label: 'COMMS', icon: '\u{26A1}', color: '#d4af37' },
  { id: 'ai', label: 'AI HUB', icon: '\u{1F916}', color: '#22d3ee' },
  { id: 'links', label: 'LINKS', icon: '\u{1F517}', color: '#22d3ee' },
  { id: 'deepcrawl', label: 'DEEPCRAWL', icon: '\u{1F577}', color: '#9B7FE8' },
  { id: 'search', label: 'SEARCH', icon: '\u{1F50D}', color: '#4ECB71' },
  { id: 'settings', label: 'SETTINGS', icon: '\u{2699}', color: '#8A8F9E' },
];

function App() {
  const store = useDashboardStore();
  const [activeView, setActiveView] = useState('clipboard');

  useEffect(() => startSyncLoop(), []);

  if (!store.isLoaded) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#f59e0b', fontFamily: 'var(--cs-font-mono)' }}>
        Loading...
      </div>
    );
  }

  return (
    <Shell views={SHELL_VIEWS} activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'clipboard' && <ClipboardView />}
      {activeView === 'tts' && <TTSView />}
      {activeView === 'prompts' && <PromptsView />}
      {activeView === 'research' && <ResearchView />}
      {activeView === 'calendar' && <CalendarView />}
      {activeView === 'notes' && <NotesView />}
      {activeView === 'comms' && <CommsView />}
      {activeView === 'ai' && <AIHubView />}
      {activeView === 'deepcrawl' && <DeepCrawlView />}
      {activeView === 'search' && <SearchView />}
      {activeView === 'links' && <LinksView />}
      {activeView === 'settings' && <SettingsView store={store} />}
    </Shell>
  );
}

export default App;
