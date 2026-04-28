import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDashboardStore } from '@/hooks/useDashboardStore';
import { TTSView } from '@/views/TTSView';
import { ClipboardView } from '@/views/ClipboardView';
import { PromptsView } from '@/views/PromptsView';
import { ResearchView } from '@/views/ResearchView';
import { CalendarView } from '@/views/CalendarView';
import { NotesView } from '@/views/NotesView';
import { LinksView } from '@/views/LinksView';
import { DeepCrawlView } from '@/views/DeepCrawlView';
import { SearchView } from '@/views/SearchView';
import { AIHubView } from '@/views/AIHubView';
import { SettingsView } from '@/views/SettingsView';
import type { ViewType } from '@/types';

const STANDALONE_MANIFESTS: Partial<Record<ViewType, string>> = {
  clipboard: './manifests/clipboard.webmanifest',
  tts: './manifests/tts.webmanifest',
  prompts: './manifests/prompts.webmanifest',
  research: './manifests/research.webmanifest',
  links: './manifests/links.webmanifest',
};

function useStandaloneManifest(viewId: ViewType | undefined) {
  useEffect(() => {
    if (!viewId) return;
    const href = STANDALONE_MANIFESTS[viewId];
    if (!href) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const previous = link.getAttribute('href');
    link.setAttribute('href', href);
    return () => {
      if (previous) link.setAttribute('href', previous);
    };
  }, [viewId]);
}

export function PanelWrapper() {
  const { viewId } = useParams<{ viewId: string }>();
  const store = useDashboardStore();
  useStandaloneManifest(viewId as ViewType | undefined);

  if (!store.isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#0a0a0f', color: '#f59e0b' }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#f59e0b', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden" style={{ background: '#0a0a0f', color: '#c8ccd4' }}>
      <PanelContent viewId={viewId as ViewType} store={store} />
    </div>
  );
}

function PanelContent({ viewId, store }: { viewId: ViewType; store: ReturnType<typeof useDashboardStore> }) {
  switch (viewId) {
    case 'tts': return <TTSView />;
    case 'clipboard': return <ClipboardView />;
    case 'prompts': return <PromptsView />;
    case 'research': return <ResearchView />;
    case 'calendar': return <CalendarView />;
    case 'notes': return <NotesView />;
    case 'links': return <LinksView />;
    case 'deepcrawl': return <DeepCrawlView />;
    case 'search': return <SearchView />;
    case 'ai': return <AIHubView />;
    case 'settings': return <SettingsView store={store} />;
    default:
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>{viewId?.toUpperCase()}</p>
          <p style={{ fontSize: '12px', color: '#3a3a4a', marginBottom: '16px' }}>Panel not found</p>
          <a href="./" style={{ fontSize: '11px', color: '#f59e0b', textDecoration: 'underline' }}>Open full dashboard</a>
        </div>
      );
  }
}
