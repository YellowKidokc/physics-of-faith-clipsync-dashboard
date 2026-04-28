import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchBroadcast,
  fetchMessages,
  fetchUnread,
  sendMessage,
  sendBroadcast,
  checkCommsOnline,
  getMyChannel,
  setCommsConfig,
  type CommsMessage,
} from '@/lib/comms';

// ─── Known channels ───
const CHANNELS = [
  { name: 'broadcast', display: 'Broadcast', color: '#f59e0b' },
  { name: 'david', display: 'David', color: '#d4af37' },
  { name: 'opus', display: 'Opus', color: '#a78bfa' },
  { name: 'sonnet', display: 'Sonnet', color: '#818cf8' },
  { name: 'haiku', display: 'Haiku', color: '#c084fc' },
  { name: 'claude-code', display: 'Claude Code', color: '#22d3ee' },
  { name: 'claude-desktop', display: 'Claude Desktop', color: '#67e8f9' },
  { name: 'codex', display: 'Codex', color: '#4ade80' },
  { name: 'gemini', display: 'Gemini (Jim)', color: '#fb923c' },
  { name: 'gpt', display: 'ChatGPT', color: '#34d399' },
  { name: 'perplexity', display: 'Perplexity', color: '#60a5fa' },
  { name: 'ollama', display: 'Ollama', color: '#f472b6' },
  { name: 'kimi', display: 'Kimi', color: '#fbbf24' },
  { name: 'opus-excel', display: 'Opus Excel', color: '#a78bfa' },
];

function channelColor(name: string): string {
  return CHANNELS.find(c => c.name === name)?.color || '#888';
}

function channelDisplay(name: string): string {
  return CHANNELS.find(c => c.name === name)?.display || name;
}

function timeAgo(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

// ═══════════════════════════════════════
// COMMS VIEW
// ═══════════════════════════════════════

export function CommsView() {
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState('broadcast');
  const [online, setOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('broadcast');
  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configToken, setConfigToken] = useState('');
  const [configChannel, setConfigChannel] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const myChannel = getMyChannel();

  // ── Check online ──
  useEffect(() => {
    checkCommsOnline().then(setOnline);
  }, []);

  // ── Load messages for active channel ──
  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const msgs = activeChannel === 'broadcast'
        ? await fetchBroadcast(100)
        : await fetchMessages(activeChannel, 100);
      setMessages(msgs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeChannel]);

  useEffect(() => {
    if (online) {
      loadMessages();
      // Poll every 15s
      pollRef.current = setInterval(loadMessages, 15000);
      return () => clearInterval(pollRef.current);
    }
  }, [online, loadMessages]);

  // ── Check unread count ──
  useEffect(() => {
    if (!online) return;
    fetchUnread().then(msgs => setUnreadCount(msgs.length)).catch(() => {});
  }, [online, messages]);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──
  const handleSend = async () => {
    if (!composeText.trim() || sending) return;
    setSending(true);
    try {
      if (composeTo === 'broadcast') {
        await sendBroadcast(composeText.trim());
      } else {
        await sendMessage(composeTo, composeText.trim());
      }
      setComposeText('');
      setComposeOpen(false);
      loadMessages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  // ── Save config ──
  const saveConfig = () => {
    setCommsConfig(configUrl, configToken, configChannel);
    setShowConfig(false);
    checkCommsOnline().then(setOnline);
  };

  // ─── Styles ───
  const css = {
    container: {
      display: 'flex', height: '100%', background: '#0a0a0f', color: '#c8ccd4',
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    } as React.CSSProperties,
    sidebar: {
      width: '220px', borderRight: '1px solid #1a1a2e',
      display: 'flex', flexDirection: 'column' as const, flexShrink: 0,
      background: '#0d0d14',
    } as React.CSSProperties,
    sidebarHeader: {
      padding: '16px 14px 12px', borderBottom: '1px solid #1a1a2e',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    } as React.CSSProperties,
    sidebarTitle: {
      fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
      color: '#d4af37', textTransform: 'uppercase' as const,
    } as React.CSSProperties,
    statusDot: (on: boolean | null) => ({
      width: '8px', height: '8px', borderRadius: '50%',
      background: on === null ? '#555' : on ? '#4ade80' : '#ef4444',
      flexShrink: 0,
    }) as React.CSSProperties,
    channelList: {
      flex: 1, overflowY: 'auto' as const, padding: '6px',
    } as React.CSSProperties,
    channelItem: (active: boolean) => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
      fontSize: '11px', fontWeight: active ? 600 : 400,
      color: active ? '#d4af37' : '#6a6a80',
      background: active ? 'rgba(212,175,55,0.08)' : 'transparent',
      border: `1px solid ${active ? 'rgba(212,175,55,0.2)' : 'transparent'}`,
      transition: 'all 0.1s',
    }) as React.CSSProperties,
    channelDot: (color: string) => ({
      width: '6px', height: '6px', borderRadius: '50%',
      background: color, flexShrink: 0,
    }) as React.CSSProperties,
    main: {
      flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
    } as React.CSSProperties,
    topBar: {
      padding: '12px 20px', borderBottom: '1px solid #1a1a2e',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    } as React.CSSProperties,
    topTitle: {
      fontSize: '13px', fontWeight: 600, color: '#e0e0e8',
    } as React.CSSProperties,
    btn: (variant: 'gold' | 'dim' | 'danger' = 'dim') => ({
      padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
      fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px',
      border: '1px solid',
      ...(variant === 'gold' ? {
        background: 'rgba(212,175,55,0.1)', color: '#d4af37',
        borderColor: 'rgba(212,175,55,0.3)',
      } : variant === 'danger' ? {
        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
        borderColor: 'rgba(239,68,68,0.3)',
      } : {
        background: 'rgba(255,255,255,0.04)', color: '#6a6a80',
        borderColor: 'rgba(255,255,255,0.08)',
      }),
    }) as React.CSSProperties,
    messageList: {
      flex: 1, overflowY: 'auto' as const, padding: '16px 20px',
      display: 'flex', flexDirection: 'column' as const, gap: '8px',
    } as React.CSSProperties,
    msgBubble: (isMe: boolean) => ({
      maxWidth: '85%', padding: '10px 14px',
      borderRadius: '10px',
      background: isMe ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${isMe ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)'}`,
      alignSelf: isMe ? 'flex-end' as const : 'flex-start' as const,
    }) as React.CSSProperties,
    msgSender: (color: string) => ({
      fontSize: '10px', fontWeight: 600, color, marginBottom: '4px',
      letterSpacing: '0.5px',
    }) as React.CSSProperties,
    msgContent: {
      fontSize: '12px', lineHeight: '1.6', color: '#c8ccd4',
      whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
    } as React.CSSProperties,
    msgTime: {
      fontSize: '9px', color: '#4a4a5a', marginTop: '4px', textAlign: 'right' as const,
    } as React.CSSProperties,
    composeBar: {
      padding: '12px 20px', borderTop: '1px solid #1a1a2e',
      display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0,
    } as React.CSSProperties,
    textarea: {
      flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a2e',
      borderRadius: '8px', padding: '10px 14px', color: '#c8ccd4',
      fontSize: '12px', fontFamily: 'inherit', resize: 'vertical' as const,
      minHeight: '44px', maxHeight: '200px', outline: 'none',
    } as React.CSSProperties,
    overlay: {
      position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    } as React.CSSProperties,
    modal: {
      background: '#12121a', border: '1px solid #2a2a3e', borderRadius: '12px',
      padding: '24px', width: '400px', maxWidth: '90vw',
    } as React.CSSProperties,
    input: {
      width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a2e',
      borderRadius: '6px', padding: '8px 12px', color: '#c8ccd4',
      fontSize: '12px', fontFamily: 'inherit', outline: 'none', marginBottom: '10px',
    } as React.CSSProperties,
    select: {
      background: 'rgba(255,255,255,0.04)', border: '1px solid #1a1a2e',
      borderRadius: '6px', padding: '6px 10px', color: '#c8ccd4',
      fontSize: '11px', fontFamily: 'inherit', outline: 'none',
    } as React.CSSProperties,
    emptyState: {
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column' as const, gap: '12px', color: '#4a4a5a',
    } as React.CSSProperties,
  };

  // ─── Offline / Config screen ───
  if (online === false && !showConfig) {
    return (
      <div style={{ ...css.emptyState, height: '100%', background: '#0a0a0f' }}>
        <div style={{ fontSize: '32px' }}>&#x26A0;</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>
          Comms Hub Offline
        </div>
        <div style={{ fontSize: '11px', color: '#6a6a80', maxWidth: '300px', textAlign: 'center', lineHeight: '1.6' }}>
          Worker API returning 500. Brief 03 fix pending (assigned to Kimmy).
          D1 MCP direct query still works from Claude sessions.
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button style={css.btn('gold')} onClick={() => checkCommsOnline().then(setOnline)}>
            Retry
          </button>
          <button style={css.btn('dim')} onClick={() => setShowConfig(true)}>
            Config
          </button>
        </div>
      </div>
    );
  }

  // ─── Config Modal ���──
  if (showConfig) {
    return (
      <div style={{ ...css.emptyState, height: '100%', background: '#0a0a0f' }}>
        <div style={css.modal}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#d4af37', marginBottom: '16px' }}>
            COMMS CONFIGURATION
          </div>
          <label style={{ fontSize: '10px', color: '#6a6a80', display: 'block', marginBottom: '4px' }}>Worker URL</label>
          <input
            style={css.input}
            value={configUrl}
            onChange={e => setConfigUrl(e.target.value)}
            placeholder="https://ai-comms-hub.davidokc28.workers.dev"
          />
          <label style={{ fontSize: '10px', color: '#6a6a80', display: 'block', marginBottom: '4px' }}>Auth Token</label>
          <input
            style={css.input}
            type="password"
            value={configToken}
            onChange={e => setConfigToken(e.target.value)}
            placeholder="Bearer token"
          />
          <label style={{ fontSize: '10px', color: '#6a6a80', display: 'block', marginBottom: '4px' }}>My Channel</label>
          <select style={{ ...css.select, width: '100%', marginBottom: '16px' }} value={configChannel} onChange={e => setConfigChannel(e.target.value)}>
            {CHANNELS.map(c => (
              <option key={c.name} value={c.name}>{c.display}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button style={css.btn('dim')} onClick={() => setShowConfig(false)}>Cancel</button>
            <button style={css.btn('gold')} onClick={saveConfig}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={css.container}>
      {/* ── Channel Sidebar ── */}
      <div style={css.sidebar}>
        <div style={css.sidebarHeader}>
          <span style={css.sidebarTitle}>Comms Hub</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {unreadCount > 0 && (
              <span style={{
                fontSize: '9px', fontWeight: 700, color: '#000',
                background: '#d4af37', borderRadius: '10px', padding: '1px 6px',
              }}>
                {unreadCount}
              </span>
            )}
            <div style={css.statusDot(online)} title={online ? 'Online' : 'Offline'} />
          </div>
        </div>
        <div style={css.channelList}>
          {CHANNELS.map(c => (
            <div
              key={c.name}
              style={css.channelItem(activeChannel === c.name)}
              onClick={() => setActiveChannel(c.name)}
            >
              <div style={css.channelDot(c.color)} />
              <span>{c.display}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px', borderTop: '1px solid #1a1a2e' }}>
          <button style={{ ...css.btn('dim'), width: '100%', textAlign: 'center' }} onClick={() => setShowConfig(true)}>
            Config
          </button>
        </div>
      </div>

      {/* ── Main Panel ��─ */}
      <div style={css.main}>
        {/* Top bar */}
        <div style={css.topBar}>
          <div>
            <span style={css.topTitle}>
              {activeChannel === 'broadcast' ? 'Broadcast' : `#${activeChannel}`}
            </span>
            <span style={{ fontSize: '10px', color: '#4a4a5a', marginLeft: '10px' }}>
              {messages.length} messages
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={css.btn('dim')} onClick={loadMessages}>
              {loading ? '...' : 'Refresh'}
            </button>
            <button style={css.btn('gold')} onClick={() => { setComposeOpen(!composeOpen); setComposeTo(activeChannel); }}>
              + New
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div style={{ padding: '8px 20px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', fontSize: '11px', color: '#ef4444' }}>
            {error}
            <button style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px' }} onClick={() => setError(null)}>
              dismiss
            </button>
          </div>
        )}

        {/* Messages */}
        <div style={css.messageList}>
          {messages.length === 0 && !loading && (
            <div style={css.emptyState}>
              <div style={{ fontSize: '11px' }}>No messages in #{activeChannel}</div>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender === myChannel;
            return (
              <div key={msg.id} style={css.msgBubble(isMe)}>
                <div style={css.msgSender(channelColor(msg.sender))}>
                  {channelDisplay(msg.sender)}
                  {msg.channel !== 'broadcast' && msg.channel !== msg.sender && (
                    <span style={{ color: '#4a4a5a', fontWeight: 400 }}> &rarr; {channelDisplay(msg.channel)}</span>
                  )}
                </div>
                <div style={css.msgContent}>{msg.content}</div>
                <div style={css.msgTime}>
                  {formatTimestamp(msg.timestamp)} &middot; {timeAgo(msg.timestamp)}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Compose bar */}
        {composeOpen && (
          <div style={css.composeBar}>
            <select
              style={css.select}
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
            >
              {CHANNELS.map(c => (
                <option key={c.name} value={c.name}>{c.display}</option>
              ))}
            </select>
            <textarea
              style={css.textarea}
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              placeholder={`Message #${composeTo}...`}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
              }}
            />
            <button
              style={css.btn(composeText.trim() ? 'gold' : 'dim')}
              onClick={handleSend}
              disabled={sending || !composeText.trim()}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
