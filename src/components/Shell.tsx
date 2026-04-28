import { useState } from 'react';
import { SyncStatus } from './SyncStatus';
import { InstallPanel } from './InstallPanel';

export interface ShellView {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface ShellProps {
  views: ShellView[];
  activeView: string;
  onViewChange: (id: string) => void;
  children: React.ReactNode;
}

export function Shell({ views, activeView, onViewChange, children }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const css = {
    container: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: 'var(--cs-font-mono)',
      background: 'var(--cs-bg)',
      color: 'var(--cs-text)',
    } as React.CSSProperties,
    sidebar: {
      width: sidebarOpen ? '200px' : '48px',
      background: 'var(--cs-pane)',
      borderRight: '1px solid var(--cs-border)',
      display: 'flex',
      flexDirection: 'column' as const,
      flexShrink: 0,
      transition: 'width 0.15s ease',
      overflow: 'hidden',
    } as React.CSSProperties,
    sidebarHeader: {
      padding: sidebarOpen ? '10px 12px' : '10px 8px',
      borderBottom: '1px solid var(--cs-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    } as React.CSSProperties,
    brand: {
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '2px',
      color: 'var(--cs-gold)',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
    } as React.CSSProperties,
    toggleBtn: {
      background: 'transparent',
      border: '1px solid var(--cs-border)',
      borderRadius: '4px',
      color: 'var(--cs-text-dim)',
      cursor: 'pointer',
      padding: '2px 6px',
      fontSize: '14px',
      fontFamily: 'inherit',
      flexShrink: 0,
    } as React.CSSProperties,
    navList: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: '4px',
    } as React.CSSProperties,
    navItem: (active: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: sidebarOpen ? '8px 10px' : '8px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '10px',
      fontWeight: active ? 600 : 400,
      letterSpacing: '0.5px',
      color: active ? 'var(--cs-gold)' : 'var(--cs-text-dim)',
      background: active ? 'rgba(245,158,11,0.08)' : 'transparent',
      border: `1px solid ${active ? 'rgba(245,158,11,0.2)' : 'transparent'}`,
      transition: 'all 0.1s',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      justifyContent: sidebarOpen ? 'flex-start' : 'center',
      fontFamily: 'inherit',
    }) as React.CSSProperties,
    navIcon: {
      fontSize: '14px',
      flexShrink: 0,
      width: '20px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    sidebarFooter: {
      padding: '8px 12px',
      borderTop: '1px solid var(--cs-border)',
      flexShrink: 0,
    } as React.CSSProperties,
    main: {
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
    } as React.CSSProperties,
    bottomBar: {
      display: 'none',
      background: 'var(--cs-pane)',
      borderTop: '1px solid var(--cs-border)',
      flexShrink: 0,
      overflowX: 'auto' as const,
      padding: '4px 2px',
      gap: '2px',
    } as React.CSSProperties,
    bottomItem: (active: boolean) => ({
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      padding: '4px 8px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '7px',
      fontWeight: 600,
      letterSpacing: '0.5px',
      color: active ? 'var(--cs-gold)' : 'var(--cs-text-dim)',
      background: active ? 'rgba(245,158,11,0.08)' : 'transparent',
      border: 'none',
      fontFamily: 'inherit',
      flexShrink: 0,
    }) as React.CSSProperties,
  };

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .shell-sidebar { display: none !important; }
          .shell-bottom-bar { display: flex !important; }
        }
      `}</style>
      <div style={css.container}>
        <div className="shell-sidebar" style={css.sidebar}>
          <div style={css.sidebarHeader}>
            {sidebarOpen && <span style={css.brand}>POF 2828</span>}
            <button style={css.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? '\u25C0' : '\u25B6'}
            </button>
          </div>
          <div style={css.navList}>
            {views.map(v => (
              <div key={v.id} style={css.navItem(activeView === v.id)} onClick={() => onViewChange(v.id)}>
                <span style={css.navIcon}>{v.icon}</span>
                {sidebarOpen && <span>{v.label}</span>}
              </div>
            ))}
          </div>
          <div style={css.sidebarFooter}>
            <InstallPanel compact={!sidebarOpen} />
            <SyncStatus />
          </div>
        </div>

        <div style={css.main}>
          {children}
        </div>

        <div className="shell-bottom-bar" style={css.bottomBar}>
          {views.map(v => (
            <button key={v.id} style={css.bottomItem(activeView === v.id)} onClick={() => onViewChange(v.id)}>
              <span style={{ fontSize: '16px' }}>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
