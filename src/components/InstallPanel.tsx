import { useState } from 'react';

const APPS: { id: string; label: string; color: string; icon: string }[] = [
  { id: 'clipboard', label: 'Clipboard', color: '#f59e0b', icon: '\u{1F4CB}' },
  { id: 'tts', label: 'TTS', color: '#f97316', icon: '\u{1F50A}' },
  { id: 'prompts', label: 'Prompts', color: '#f59e0b', icon: '⌨' },
  { id: 'research', label: 'Research', color: '#4F8EF7', icon: '\u{1F517}' },
  { id: 'links', label: 'Links', color: '#22d3ee', icon: '\u{1F517}' },
];

interface InstallPanelProps {
  compact: boolean;
}

export function InstallPanel({ compact }: InstallPanelProps) {
  const [open, setOpen] = useState(false);

  const launch = (id: string) => {
    const url = `${location.pathname}#/panel/${id}`;
    window.open(url, `pof-${id}`, 'noopener,noreferrer');
  };

  const css = {
    wrap: {
      display: 'flex', flexDirection: 'column' as const, gap: '4px',
      marginBottom: '6px',
    },
    toggle: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'transparent', border: '1px solid var(--cs-border)',
      borderRadius: '4px', color: 'var(--cs-text-dim)',
      padding: compact ? '4px' : '5px 8px',
      fontSize: '9px', fontWeight: 700, letterSpacing: '1px',
      fontFamily: 'inherit', cursor: 'pointer', width: '100%',
    } as React.CSSProperties,
    chevron: { fontSize: '9px', color: 'var(--cs-text-dim)' },
    list: { display: 'flex', flexDirection: 'column' as const, gap: '3px' },
    item: (color: string) => ({
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: compact ? '4px' : '5px 8px',
      borderRadius: '4px',
      background: 'transparent',
      border: `1px solid ${color}33`,
      color: 'var(--cs-text-dim)',
      fontSize: '9px', fontWeight: 600, letterSpacing: '0.5px',
      fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' as const,
      width: '100%',
    }) as React.CSSProperties,
  };

  if (compact) {
    return (
      <div style={css.wrap}>
        <button style={css.toggle} onClick={() => setOpen(!open)} title="Install as separate PWAs">
          <span>⬇</span>
        </button>
        {open && (
          <div style={css.list}>
            {APPS.map(a => (
              <button key={a.id} style={css.item(a.color)} onClick={() => launch(a.id)} title={`Open ${a.label} standalone`}>
                <span>{a.icon}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={css.wrap}>
      <button style={css.toggle} onClick={() => setOpen(!open)}>
        <span>INSTALL APPS</span>
        <span style={css.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={css.list}>
          {APPS.map(a => (
            <button key={a.id} style={css.item(a.color)} onClick={() => launch(a.id)} title={`Open ${a.label} panel in its own window, then use the browser Install button to install as a PWA`}>
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div style={{ fontSize: '8px', color: 'var(--cs-text-dim)', opacity: 0.7, lineHeight: 1.4, padding: '2px 2px 0' }}>
          Opens in its own window. Use the browser's Install button to install it as a separate PWA.
        </div>
      )}
    </div>
  );
}
