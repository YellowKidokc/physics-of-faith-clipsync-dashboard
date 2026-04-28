import { useState } from 'react';

const DEFAULT_URL = 'https://deepcrawl-gui.pages.dev/';

export function DeepCrawlView() {
  const [src, setSrc] = useState(DEFAULT_URL);
  const [reloadKey, setReloadKey] = useState(0);
  const [urlInput, setUrlInput] = useState(DEFAULT_URL);

  const css = {
    container: {
      height: '100%', display: 'flex', flexDirection: 'column' as const,
      background: '#0a0a0f', color: '#c8ccd4',
      fontFamily: "'IBM Plex Mono', monospace", overflow: 'hidden',
    },
    header: {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderBottom: '1px solid #1e1e2e',
      background: '#0d0d14', flexShrink: 0,
    },
    title: {
      fontSize: '11px', fontWeight: 700, letterSpacing: '2px',
      color: '#f59e0b', whiteSpace: 'nowrap' as const,
    },
    input: {
      flex: 1, background: '#12121c', border: '1px solid #1e1e2e',
      borderRadius: '4px', color: '#c8ccd4', padding: '6px 10px',
      fontSize: '11px', fontFamily: 'inherit', outline: 'none',
    } as React.CSSProperties,
    btn: {
      background: 'transparent', border: '1px solid #1e1e2e',
      borderRadius: '4px', color: '#888', padding: '5px 12px',
      fontSize: '10px', fontWeight: 700, letterSpacing: '1px',
      fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    frame: {
      flex: 1, border: 'none', width: '100%', height: '100%',
      background: '#0a0a0f',
    } as React.CSSProperties,
  };

  const go = () => {
    try {
      const u = urlInput.trim();
      if (!u) return;
      const normalized = u.startsWith('http') ? u : `https://${u}`;
      setSrc(normalized);
    } catch {
      // ignore
    }
  };

  return (
    <div style={css.container}>
      <div style={css.header}>
        <span style={css.title}>DEEPCRAWL</span>
        <input
          style={css.input}
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') go(); }}
          placeholder="https://deepcrawl-gui.pages.dev/"
        />
        <button style={css.btn} onClick={go}>GO</button>
        <button style={css.btn} onClick={() => setReloadKey(k => k + 1)}>RELOAD</button>
        <button style={css.btn} onClick={() => window.open(src, '_blank')}>OPEN</button>
      </div>
      <iframe
        key={reloadKey}
        title="DeepCrawl"
        src={src}
        style={css.frame}
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
