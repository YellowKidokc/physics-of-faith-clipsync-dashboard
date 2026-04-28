import { useSyncStatus } from '@/hooks/useSyncStatus';

export function SyncStatus() {
  const online = useSyncStatus();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: online ? 'var(--cs-green)' : 'var(--cs-red)',
          boxShadow: online
            ? '0 0 6px rgba(16,185,129,0.5)'
            : '0 0 6px rgba(239,68,68,0.5)',
          animation: 'cs-pulse 2s ease-in-out infinite',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--cs-font-mono)',
          fontSize: '8px',
          letterSpacing: '1px',
          color: online ? 'var(--cs-green)' : 'var(--cs-text-dim)',
        }}
      >
        {online ? 'SYNCED' : 'LOCAL'}
      </span>
    </div>
  );
}
