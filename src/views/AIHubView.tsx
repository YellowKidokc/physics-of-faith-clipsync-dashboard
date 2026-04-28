import { useState, useEffect, useCallback } from 'react';

// ─── TYPES ───
interface CommsMessage {
  id: number;
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
  read_by: string;
}

interface ChannelInfo {
  channel: string;
  msg_count: number;
  last_msg: string;
}

// ─── CONFIG ───
const COMMS_API = 'https://theophysics-comms.davidokc28.workers.dev/api';
// Once you add a custom domain, change to:
// const COMMS_API = 'https://comms.faiththruphysics.com/api';

const CHANNELS = ['general', 'opus', 'gemini', 'gpt', 'codex', 'kimi', 'cowork'];

const SENDERS = [
  { id: 'david', label: 'David', color: '#ef4444' },
  { id: 'opus', label: 'Opus', color: '#d4af37' },
  { id: 'gemini', label: 'Gemini (Jim)', color: '#4a9eff' },
  { id: 'gpt', label: 'GPT', color: '#22c55e' },
  { id: 'codex', label: 'Codex', color: '#2dd4bf' },
  { id: 'kimi', label: 'Kimi', color: '#a855f7' },
  { id: 'cowork', label: 'Cowork', color: '#f59e0b' },
  { id: 'haiku', label: 'Haiku', color: '#d4af37' },
  { id: 'sonnet', label: 'Sonnet', color: '#d4af37' },
];

const senderColor = (s: string) => SENDERS.find(x => x.id === s)?.color || '#999';

// ─── COMPONENT ───
export function AIHubView() {
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [sender, setSender] = useState('david');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchMessages = useCallback(async (channel: string) => {
    try {
      const res = await fetch(`${COMMS_API}/messages?channel=${channel}&limit=50`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setMessages(data.messages || []);
      setConnected(true);
      setError(null);
    } catch {
      setConnected(false);
      setError('Comms hub offline — deploy the worker first');
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(`${COMMS_API}/channels`);
      if (!res.ok) return;
      const data = await res.json();
      setChannels(data.channels || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchMessages(activeChannel);
    fetchChannels();
    const interval = setInterval(() => {
      fetchMessages(activeChannel);
      fetchChannels();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeChannel, fetchMessages, fetchChannels]);

  const postMessage = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await fetch(`${COMMS_API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: activeChannel, sender, content: content.trim() }),
      });
      setContent('');
      await fetchMessages(activeChannel);
      await fetchChannels();
    } catch {
      setError('Failed to post');
    }
    setLoading(false);
  };

  const broadcast = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await fetch(`${COMMS_API}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, content: content.trim() }),
      });
      setContent('');
      await fetchMessages(activeChannel);
      await fetchChannels();
    } catch {
      setError('Failed to broadcast');
    }
    setLoading(false);
  };

  const getChannelCount = (ch: string) => {
    const info = channels.find(c => c.channel === ch);
    return info?.msg_count || 0;
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts + 'Z').toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return ts; }
  };

  const css = {
    container: {
      height: '100%', display: 'flex', flexDirection: 'column' as const,
      fontFamily: "'IBM Plex Mono', monospace", background: '#0a0a0f', color: '#c8ccd4',
      overflow: 'hidden',
    },
    header: {
      padding: '12px 16px', borderBottom: '1px solid #1e1e2e',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    },
    title: { fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: '#f59e0b' },
    status: (on: boolean) => ({
      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px',
      color: on ? '#10b981' : '#ef4444',
    }),
    dot: (on: boolean) => ({
      width: '6px', height: '6px', borderRadius: '50%',
      background: on ? '#10b981' : '#ef4444',
      boxShadow: on ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
    }),
    tabs: {
      display: 'flex', gap: '2px', padding: '4px 8px',
      borderBottom: '1px solid #1e1e2e', flexShrink: 0,
      overflowX: 'auto' as const,
    },
    tab: (active: boolean) => ({
      padding: '6px 10px', borderRadius: '4px', cursor: 'pointer',
      fontSize: '9px', fontWeight: 600, letterSpacing: '1px',
      color: active ? '#f59e0b' : '#3a3a4a',
      background: active ? 'rgba(245,158,11,0.08)' : 'transparent',
      border: `1px solid ${active ? 'rgba(245,158,11,0.2)' : 'transparent'}`,
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
      whiteSpace: 'nowrap' as const,
    }),
    badge: {
      fontSize: '8px', background: '#f59e0b', color: '#000',
      padding: '0 4px', borderRadius: '9px', fontWeight: 700,
    },
    messages: {
      flex: 1, overflowY: 'auto' as const, padding: '8px',
      display: 'flex', flexDirection: 'column' as const, gap: '6px',
    },
    msg: {
      background: '#111118', border: '1px solid #1e1e2e',
      borderRadius: '8px', padding: '10px 12px',
    },
    msgHead: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '4px',
    },
    msgSender: (color: string) => ({
      fontSize: '10px', fontWeight: 700, letterSpacing: '1px',
      textTransform: 'uppercase' as const, color,
    }),
    msgTime: { fontSize: '9px', color: '#4f586f' },
    msgContent: {
      fontSize: '12px', color: '#8f96ab', lineHeight: '1.6',
      whiteSpace: 'pre-wrap' as const,
    },
    compose: {
      borderTop: '1px solid #1e1e2e', padding: '8px',
      display: 'flex', flexDirection: 'column' as const, gap: '6px',
      flexShrink: 0, background: '#0d0d14',
    },
    row: { display: 'flex', gap: '4px' },
    select: {
      flex: 1, background: '#111118', border: '1px solid #1e1e2e',
      borderRadius: '4px', color: '#c8ccd4', padding: '6px 8px',
      fontSize: '11px', fontFamily: 'inherit',
    },
    textarea: {
      width: '100%', background: '#111118', border: '1px solid #1e1e2e',
      borderRadius: '4px', color: '#c8ccd4', padding: '8px',
      fontSize: '12px', fontFamily: 'inherit', resize: 'vertical' as const,
      minHeight: '50px', maxHeight: '120px',
    },
    btn: (color: string) => ({
      flex: 1, padding: '6px 12px',
      background: `${color}11`, border: `1px solid ${color}44`,
      borderRadius: '4px', color, fontSize: '10px', fontWeight: 700,
      letterSpacing: '1px', cursor: 'pointer', fontFamily: 'inherit',
    }),
    empty: {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column' as const, gap: '8px', color: '#2a2a3a',
    },
    error: {
      margin: '8px', padding: '10px', background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px',
      fontSize: '11px', color: '#ef4444', textAlign: 'center' as const,
    },
  };

  return (
    <div style={css.container}>
      {/* Header */}
      <div style={css.header}>
        <span style={css.title}>AI COMMS HUB</span>
        <div style={css.status(connected)}>
          <span style={css.dot(connected)} />
          {connected ? 'CONNECTED' : 'OFFLINE'}
        </div>
      </div>

      {error && <div style={css.error}>{error}</div>}

      {/* Channel Tabs */}
      <div style={css.tabs}>
        {CHANNELS.map(ch => {
          const count = getChannelCount(ch);
          return (
            <button key={ch} style={css.tab(activeChannel === ch)}
              onClick={() => { setActiveChannel(ch); fetchMessages(ch); }}>
              {ch.toUpperCase()}
              {count > 0 && <span style={css.badge}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div style={css.messages}>
        {messages.length === 0 ? (
          <div style={css.empty}>
            <div style={{ fontSize: '14px', letterSpacing: '2px' }}>
              {connected ? `NO MESSAGES IN #${activeChannel.toUpperCase()}` : 'COMMS OFFLINE'}
            </div>
            <div style={{ fontSize: '11px', color: '#1e1e2e' }}>
              {connected ? 'post a session summary to get started' : 'deploy the comms worker first'}
            </div>
          </div>
        ) : (
          [...messages].reverse().map(m => (
            <div key={m.id} style={css.msg}>
              <div style={css.msgHead}>
                <span style={css.msgSender(senderColor(m.sender))}>{m.sender}</span>
                <span style={css.msgTime}>{formatTime(m.timestamp)}</span>
              </div>
              <div style={css.msgContent}>{m.content}</div>
            </div>
          ))
        )}
      </div>

      {/* Compose */}
      <div style={css.compose}>
        <div style={css.row}>
          <select style={css.select} value={sender} onChange={e => setSender(e.target.value)}>
            {SENDERS.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select style={css.select} value={activeChannel} onChange={e => setActiveChannel(e.target.value)}>
            {CHANNELS.map(ch => (
              <option key={ch} value={ch}>{`#${ch}`}</option>
            ))}
          </select>
        </div>
        <textarea
          style={css.textarea}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Session summary, changes made, notes for other AIs..."
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) postMessage(); }}
        />
        <div style={css.row}>
          <button style={css.btn('#f59e0b')} onClick={postMessage} disabled={loading}>
            {loading ? 'POSTING...' : 'POST TO CHANNEL'}
          </button>
          <button style={css.btn('#2dd4bf')} onClick={broadcast} disabled={loading}>
            BROADCAST ALL
          </button>
        </div>
      </div>
    </div>
  );
}
