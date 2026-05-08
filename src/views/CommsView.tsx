import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchBroadcast,
  fetchChannels,
  fetchMessages,
  fetchUnread,
  sendMessage,
  sendBroadcast,
  checkCommsOnline,
  markChannelRead,
  getMyChannel,
  setCommsConfig,
  type CommsMessage,
  type CommsChannel,
} from '@/lib/comms';

// ─── Known channels (colors aligned with AIHubView SENDERS) ───
const DEFAULT_CHANNELS = [
  { name: 'broadcast', display: 'Broadcast', color: '#f59e0b' },
  { name: 'workflow', display: 'Workflow', color: '#f59e0b' },
  { name: 'workflow-1', display: 'Workflow 1', color: '#fbbf24' },
  { name: 'workflow-2', display: 'Workflow 2', color: '#facc15' },
  { name: 'workflow-3', display: 'Workflow 3', color: '#eab308' },
  { name: 'workflow-4', display: 'Workflow 4', color: '#ca8a04' },
  { name: 'orientation', display: 'Orientation', color: '#a78bfa' },
  { name: 'locations', display: 'Locations', color: '#38bdf8' },
  { name: 'programs', display: 'Programs', color: '#22c55e' },
  { name: 'websites', display: 'Websites', color: '#06b6d4' },
  { name: 'repositories', display: 'Repositories', color: '#f97316' },
  { name: 'david', display: 'David', color: '#ef4444' },
  { name: 'opus', display: 'Opus', color: '#d4af37' },
  { name: 'sonnet', display: 'Sonnet', color: '#d4af37' },
  { name: 'haiku', display: 'Haiku', color: '#d4af37' },
  { name: 'claude-code', display: 'Claude Code', color: '#22d3ee' },
  { name: 'claude-desktop', display: 'Claude Desktop', color: '#67e8f9' },
  { name: 'codex', display: 'Codex', color: '#2dd4bf' },
  { name: 'codex-desktop', display: 'Codex Desktop', color: '#14b8a6' },
  { name: 'codex-atlas', display: 'Codex Atlas', color: '#2dd4bf' },
  { name: 'codex-forge', display: 'Codex Forge', color: '#14b8a6' },
  { name: 'codex-ledger', display: 'Codex Ledger', color: '#22c55e' },
  { name: 'codex-scout', display: 'Codex Scout', color: '#38bdf8' },
  { name: 'gemini', display: 'Gemini (Jim)', color: '#4a9eff' },
  { name: 'gpt', display: 'ChatGPT', color: '#22c55e' },
  { name: 'perplexity', display: 'Perplexity', color: '#60a5fa' },
  { name: 'ollama', display: 'Ollama', color: '#f472b6' },
  { name: 'kimi', display: 'Kimi', color: '#a855f7' },
  { name: 'opus-excel', display: 'Opus Excel', color: '#d4af37' },
  { name: 'sonnet-desktop', display: 'Sonnet Desktop', color: '#93c5fd' },
  { name: 'sonnet-command-line', display: 'Sonnet Command Line', color: '#60a5fa' },
  { name: 'sonnet-atlas', display: 'Sonnet Atlas', color: '#93c5fd' },
  { name: 'sonnet-forge', display: 'Sonnet Forge', color: '#60a5fa' },
  { name: 'sonnet-ledger', display: 'Sonnet Ledger', color: '#3b82f6' },
  { name: 'sonnet-scout', display: 'Sonnet Scout', color: '#38bdf8' },
];

type ChannelOption = typeof DEFAULT_CHANNELS[number];
type ChannelPreview = {
  messages: CommsMessage[];
  error?: string;
};

function mergeChannels(remote: CommsChannel[]): ChannelOption[] {
  if (remote.length > 0) {
    return remote
      .filter(ch => ch.name)
      .map(ch => {
        const existing = DEFAULT_CHANNELS.find(c => c.name === ch.name);
        return {
          name: ch.name,
          display: ch.display_name || existing?.display || ch.name,
          color: existing?.color || '#888',
        };
      });
  }
  const byName = new Map<string, ChannelOption>();
  for (const ch of DEFAULT_CHANNELS) byName.set(ch.name, ch);
  for (const ch of remote) {
    if (!ch.name) continue;
    const existing = byName.get(ch.name);
    byName.set(ch.name, {
      name: ch.name,
      display: ch.display_name || existing?.display || ch.name,
      color: existing?.color || '#888',
    });
  }
  return Array.from(byName.values());
}

const POLL_INTERVAL_MS = 10000;

function channelColor(name: string): string {
  return DEFAULT_CHANNELS.find(c => c.name === name)?.color || '#888';
}

function channelDisplay(name: string): string {
  return DEFAULT_CHANNELS.find(c => c.name === name)?.display || name;
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
  const [channels, setChannels] = useState<ChannelOption[]>(DEFAULT_CHANNELS);
  const [sending, setSending] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configToken, setConfigToken] = useState('');
  const [configChannel, setConfigChannel] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [channelPreviews, setChannelPreviews] = useState<Record<string, ChannelPreview>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [flashingChannels, setFlashingChannels] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const prevUnreadByChannelRef = useRef<Record<string, number>>({});
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
      pollRef.current = setInterval(loadMessages, POLL_INTERVAL_MS);
      return () => clearInterval(pollRef.current);
    }
  }, [online, loadMessages]);

  useEffect(() => {
    if (!online) return;
    fetchChannels()
      .then(remote => setChannels(mergeChannels(remote)))
      .catch(() => setChannels(DEFAULT_CHANNELS));
  }, [online]);

  const loadChannelPreviews = useCallback(async (sourceChannels = channels) => {
    if (!online) return;
    setPreviewLoading(true);
    const visibleChannels = sourceChannels.slice(0, 30);
    const pairs = await Promise.all(
      visibleChannels.map(async c => {
        try {
          const previewMessages = await fetchMessages(c.name, 3);
          return [c.name, { messages: previewMessages }] as const;
        } catch (e: unknown) {
          return [c.name, {
            messages: [],
            error: e instanceof Error ? e.message : 'Failed',
          }] as const;
        }
      })
    );
    setChannelPreviews(Object.fromEntries(pairs));
    setPreviewLoading(false);
  }, [channels, online]);

  useEffect(() => {
    if (!online) return;
    loadChannelPreviews();
  }, [online, channels, loadChannelPreviews]);

  // ── Check unread count + per-channel grouping + flash on growth ──
  useEffect(() => {
    if (!online) return;
    fetchUnread()
      .then(msgs => {
        setUnreadCount(msgs.length);
        const grouped: Record<string, number> = {};
        for (const m of msgs) {
          grouped[m.sender] = (grouped[m.sender] || 0) + 1;
        }
        const prev = prevUnreadByChannelRef.current;
        const newlyGrowing: string[] = [];
        for (const ch of Object.keys(grouped)) {
          if ((prev[ch] || 0) < grouped[ch]) newlyGrowing.push(ch);
        }
        if (newlyGrowing.length > 0) {
          setFlashingChannels(curr => {
            const next = new Set(curr);
            for (const ch of newlyGrowing) next.add(ch);
            return next;
          });
          for (const ch of newlyGrowing) {
            if (flashTimersRef.current[ch]) clearTimeout(flashTimersRef.current[ch]);
            flashTimersRef.current[ch] = setTimeout(() => {
              setFlashingChannels(curr => {
                const next = new Set(curr);
                next.delete(ch);
                return next;
              });
            }, 2200);
          }
        }
        prevUnreadByChannelRef.current = grouped;
        setUnreadByChannel(grouped);
      })
      .catch(() => {});
  }, [online, messages]);

  useEffect(() => {
    return () => {
      for (const t of Object.values(flashTimersRef.current)) clearTimeout(t);
    };
  }, []);

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──
  const handleSend = async () => {
    if (!composeText.trim() || sending) return;
    setSending(true);
    try {
      if (broadcastMode || composeTo === 'broadcast') {
        await sendBroadcast(composeText.trim());
      } else {
        await sendMessage(composeTo, composeText.trim());
      }
      setComposeText('');
      setComposeOpen(false);
      setBroadcastMode(false);
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

  // ── Switch channel + mark sender's messages as read ──
  const handleChannelClick = useCallback((name: string) => {
    setActiveChannel(name);
    if (unreadByChannel[name]) {
      markChannelRead(name).catch(() => {});
      setUnreadByChannel(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setUnreadCount(curr => Math.max(0, curr - (unreadByChannel[name] || 0)));
    }
  }, [unreadByChannel]);

  // ── Open compose for a broadcast ──
  const openBroadcast = useCallback(() => {
    setComposeTo('broadcast');
    setBroadcastMode(true);
    setComposeOpen(true);
  }, []);

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
    channelBoard: {
      borderBottom: '1px solid #1a1a2e',
      padding: '10px 14px',
      background: '#09090e',
      overflowX: 'auto' as const,
      flexShrink: 0,
    } as React.CSSProperties,
    channelBoardGrid: {
      display: 'grid',
      gridAutoFlow: 'column' as const,
      gridAutoColumns: '190px',
      gap: '8px',
      minHeight: '118px',
    } as React.CSSProperties,
    channelCard: (active: boolean) => ({
      border: `1px solid ${active ? 'rgba(212,175,55,0.35)' : '#1a1a2e'}`,
      background: active ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.025)',
      borderRadius: '8px',
      padding: '9px',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
      minWidth: 0,
      textAlign: 'left' as const,
    }) as React.CSSProperties,
    channelCardTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '10px',
      fontWeight: 700,
      color: '#e0e0e8',
      minWidth: 0,
    } as React.CSSProperties,
    channelPreviewText: {
      fontSize: '9px',
      lineHeight: 1.35,
      color: '#77778a',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
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
          Could not reach the Comms Hub API. Check the URL, channel, and bearer token.
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
          <div style={{ fontSize: '10px', color: '#6a6a80', lineHeight: 1.6, marginBottom: '14px' }}>
            Pick the exact call sign assigned to this session. If this window is Codex 1, choose Codex Desktop or the
            matching workflow channel, then answer and sign messages with that same name.
            New repo/site/program categories do not need admin rights; post them inside the durable room with a prefix
            like [repo:forge] or [site:faiththruphysics].
          </div>
          <label style={{ fontSize: '10px', color: '#6a6a80', display: 'block', marginBottom: '4px' }}>Worker URL</label>
          <input
            style={css.input}
            value={configUrl}
            onChange={e => setConfigUrl(e.target.value)}
            placeholder="https://comms.faiththruphysics.com"
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
            {channels.map(c => (
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
      <style>{`
        @keyframes commsChannelFlash {
          0% { background: rgba(239,68,68,0.0); }
          25% { background: rgba(239,68,68,0.18); }
          100% { background: rgba(239,68,68,0.0); }
        }
        .comms-channel-flash {
          animation: commsChannelFlash 1.6s ease-out 1;
        }
      `}</style>
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
          {channels.map(c => {
            const unread = unreadByChannel[c.name] || 0;
            const isFlashing = flashingChannels.has(c.name);
            const hasUnread = unread > 0;
            return (
              <div
                key={c.name}
                className={isFlashing ? 'comms-channel-flash' : undefined}
                style={{
                  ...css.channelItem(activeChannel === c.name),
                  fontWeight: hasUnread || activeChannel === c.name ? 600 : 400,
                  color: activeChannel === c.name ? '#d4af37' : hasUnread ? '#e0e0e8' : '#6a6a80',
                }}
                onClick={() => handleChannelClick(c.name)}
              >
                <div style={css.channelDot(c.color)} />
                <span style={{ flex: 1 }}>{c.display}</span>
                {hasUnread && (
                  <span style={{
                    background: '#ef4444', color: '#fff', borderRadius: '10px',
                    padding: '0 6px', fontSize: '9px', fontWeight: 700,
                    minWidth: '16px', textAlign: 'center',
                  }}>{unread > 99 ? '99+' : unread}</span>
                )}
              </div>
            );
          })}
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
            <button style={css.btn('dim')} onClick={() => loadChannelPreviews()}>
              {previewLoading ? '...' : 'Channels'}
            </button>
            <button style={css.btn('dim')} onClick={openBroadcast} title="Send to all channels">
              📣 Broadcast
            </button>
            <button style={css.btn('gold')} onClick={() => { setComposeOpen(!composeOpen); setComposeTo(activeChannel); }}>
              + New
            </button>
          </div>
        </div>

        {/* Channel API board */}
        <div style={css.channelBoard}>
          <div style={css.channelBoardGrid}>
            {channels.map(c => {
              const preview = channelPreviews[c.name];
              const unread = unreadByChannel[c.name] || 0;
              const latest = preview?.messages?.[0];
              return (
                <button
                  key={c.name}
                  type="button"
                  style={css.channelCard(activeChannel === c.name)}
                  onClick={() => handleChannelClick(c.name)}
                  title={`Open #${c.name}`}
                >
                  <div style={css.channelCardTitle}>
                    <div style={css.channelDot(c.color)} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.display}</span>
                    {unread > 0 && (
                      <span style={{
                        marginLeft: 'auto', background: '#ef4444', color: '#fff',
                        borderRadius: '10px', padding: '0 5px', fontSize: '8px',
                      }}>{unread > 99 ? '99+' : unread}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '9px', color: '#4a4a5a', textAlign: 'left' }}>
                    /{c.name} {preview ? `- ${preview.messages.length} loaded` : '- loading'}
                  </div>
                  <div style={css.channelPreviewText}>
                    {preview?.error
                      ? preview.error
                      : latest
                        ? `${channelDisplay(latest.sender)}: ${latest.content}`
                        : 'No recent messages loaded'}
                  </div>
                </button>
              );
            })}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <select
                style={{ ...css.select, opacity: broadcastMode ? 0.4 : 1 }}
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                disabled={broadcastMode}
              >
                {channels.filter(c => c.name !== 'broadcast').map(c => (
                  <option key={c.name} value={c.name}>{c.display}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: broadcastMode ? '#d4af37' : '#6a6a80', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={broadcastMode}
                  onChange={e => setBroadcastMode(e.target.checked)}
                  style={{ accentColor: '#d4af37' }}
                />
                Send to all
              </label>
            </div>
            <textarea
              style={css.textarea}
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              placeholder={broadcastMode ? 'Broadcast to all channels…' : `Message #${composeTo}...`}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
              }}
            />
            <button
              style={css.btn(composeText.trim() ? 'gold' : 'dim')}
              onClick={handleSend}
              disabled={sending || !composeText.trim()}
            >
              {sending ? '...' : broadcastMode ? 'Broadcast' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
