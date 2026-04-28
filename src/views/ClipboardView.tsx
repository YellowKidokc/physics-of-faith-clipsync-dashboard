import { useState, useEffect, useCallback } from 'react';
import { useClipsAPI } from '@/hooks/useAPI';

const BIL_URL = 'http://localhost:8420';

interface BilPrediction {
  content: string;
  score?: number;
  reason?: string;
  source?: string;
}

export function ClipboardView() {
  const { clips, fetchClips, createClip, updateClip, deleteClip } = useClipsAPI();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'hotkeys' | 'history' | 'ai' | 'saved'>('hotkeys');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pin1Active, setPin1Active] = useState(true);
  const [pin2Active, setPin2Active] = useState(false);
  const [predictions, setPredictions] = useState<BilPrediction[]>([]);
  const [bilOnline, setBilOnline] = useState(false);
  const [predictLoading, setPredictLoading] = useState(false);

  useEffect(() => {
    fetchClips();
    const interval = setInterval(fetchClips, 2000);
    return () => clearInterval(interval);
  }, [fetchClips]);

  const fetchPredictions = useCallback(async () => {
    setPredictLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${BIL_URL}/bil/clipboard/predict`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      const items: BilPrediction[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.predictions)
          ? data.predictions
          : [];
      setPredictions(items);
      setBilOnline(true);
    } catch {
      setBilOnline(false);
    }
    setPredictLoading(false);
  }, []);

  useEffect(() => {
    if (tab !== 'ai') return;
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 5000);
    return () => clearInterval(interval);
  }, [tab, fetchPredictions]);

  const MAX_SLOTS = 50;
  const SLOTS_PER_PAGE = 20;
  const totalPages = Math.ceil(MAX_SLOTS / SLOTS_PER_PAGE);

  const pinnedClips = clips.filter(c => c.pinned);
  const allClips = clips.filter(c =>
    !search || c.content.toLowerCase().includes(search.toLowerCase()) ||
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );
  const regularClips = allClips.filter(c => !c.pinned);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 600);
  };

  const copyClip = async (clip: typeof clips[0]) => {
    await navigator.clipboard.writeText(clip.content);
    setCopiedId(clip.id);
    showToast('COPIED');
    setTimeout(() => setCopiedId(null), 1200);
  };

  const getSlotClip = (idx: number) => {
    const slotClips = clips.filter(c => c.slot === idx + 1);
    return slotClips[0] || null;
  };

  const saveToSlot = async (idx: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        createClip({ content: text, slot: idx + 1 });
        showToast(`SAVED TO SLOT ${idx + 1}`);
      }
    } catch {
      showToast('CLIPBOARD EMPTY');
    }
  };

  const addNewSlot = async () => {
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (!getSlotClip(i)) {
        setCurrentPage(Math.floor(i / SLOTS_PER_PAGE));
        await saveToSlot(i);
        return;
      }
    }
    showToast('ALL SLOTS FULL');
  };

  const timeAgo = (date: string) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const filledSlotCount = Array.from({ length: MAX_SLOTS }, (_, i) => getSlotClip(i)).filter(Boolean).length;

  const css = {
    body: { fontFamily: "'IBM Plex Mono', monospace", background: '#0a0a0f', color: '#c8ccd4' },
    searchBar: { display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderBottom: '1px solid #1e1e2e', background: '#0d0d14', flexShrink: 0 },
    searchInput: { flex: 1, background: '#12121c', border: '1px solid #1e1e2e', borderRadius: '4px', padding: '5px 8px 5px 28px', color: '#c8ccd4', fontSize: '11px', fontFamily: 'inherit', outline: 'none' } as React.CSSProperties,
    brandBadge: { fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#f59e0b', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: '5px' },
    dot: { width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px rgba(16,185,129,0.5)' },
    tabBar: { display: 'flex', background: '#0a0a0f', borderBottom: '1px solid #1e1e2e', flexShrink: 0 },
    tab: (active: boolean) => ({ flex: 1, padding: '5px 0', textAlign: 'center' as const, fontSize: '9px', letterSpacing: '1.5px', fontWeight: 600, color: active ? '#f59e0b' : '#3a3a4a', cursor: 'pointer', borderBottom: `2px solid ${active ? '#f59e0b' : 'transparent'}`, transition: 'all .1s', background: 'transparent', fontFamily: 'inherit' }),
    slotCard: (filled: boolean) => ({ background: '#111118', border: `1px solid ${filled ? '#1e3a5f' : '#1e1e2e'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column' as const, gap: '3px', minHeight: '56px', transition: 'border-color .1s' }),
    slotLabel: { fontSize: '9px', fontWeight: 700, color: '#f59e0b', letterSpacing: '1px' },
    slotStatus: { fontSize: '8px', fontWeight: 600, letterSpacing: '1px', color: '#10b981' },
    slotTitle: { fontSize: '11px', fontWeight: 600, color: '#e0e0e0', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
    slotPreview: { fontSize: '10px', color: '#6b7280', lineHeight: '1.3', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
    slotBtn: { padding: '2px 0', flex: 1, border: '1px solid #1e1e2e', borderRadius: '3px', background: 'transparent', color: '#555', fontSize: '9px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .1s', letterSpacing: '.5px' },
    copyBtn: { background: 'rgba(96,208,255,.1)', borderColor: 'rgba(96,208,255,.3)', color: '#60d0ff' },
    saveBtn: { color: '#888' },
    clipItem: (pinned: boolean) => ({ padding: '8px 10px', marginBottom: '5px', background: '#111118', border: `1px solid ${pinned ? 'rgba(251,191,36,.32)' : '#1e1e2e'}`, borderRadius: '5px', cursor: 'pointer', transition: 'all .08s', position: 'relative' as const, boxShadow: pinned ? 'inset 0 0 0 1px rgba(251,191,36,.12)' : 'none' }),
    clipTitle: { fontSize: '13px', fontWeight: 700, color: '#eceef6', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '40px' },
    clipDesc: { fontSize: '11px', lineHeight: '1.4', color: '#8f96ab', display: '-webkit-box' as const, WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', wordBreak: 'break-word' as const, marginTop: '3px' },
    clipMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '4px' },
    clipTag: (pinned: boolean) => ({ padding: '1px 5px', border: `1px solid ${pinned ? 'rgba(251,191,36,.28)' : '#2a3145'}`, borderRadius: '999px', background: pinned ? 'rgba(251,191,36,.1)' : '#171b27', color: pinned ? '#fbbf24' : '#aeb7cb', fontSize: '8px', fontWeight: 600, letterSpacing: '.3px', maxWidth: '100px', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }),
    clipTime: { fontSize: '8px', color: '#4f586f', whiteSpace: 'nowrap' as const },
    clipActions: { position: 'absolute' as const, top: '5px', right: '6px', display: 'flex', gap: '3px' },
    clipActionBtn: { background: '#12121c', border: '1px solid #1e1e2e', borderRadius: '999px', color: '#70788f', padding: '2px 6px', fontSize: '8px', fontFamily: 'inherit', cursor: 'pointer', transition: 'all .1s' },
    emptyState: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, color: '#2a2a3a', gap: '4px', padding: '16px' },
    dock: { borderTop: '1px solid #1e1e2e', background: '#0d0d14', flexShrink: 0 },
    dockIcons: { display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderBottom: '1px solid #151520' },
    dockIcon: (active: boolean) => ({ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(245,158,11,.08)' : '#111118', border: `1px solid ${active ? 'rgba(245,158,11,.4)' : '#1e1e2e'}`, borderRadius: '4px', color: active ? '#f59e0b' : '#555', fontSize: '13px', cursor: 'pointer', transition: 'all .1s' }),
    dockNew: { padding: '3px 10px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: '4px', color: '#f59e0b', fontSize: '9px', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '1px', transition: 'all .1s' },
    dockCats: { display: 'flex', gap: '3px', padding: '4px 8px', borderBottom: '1px solid #151520' },
    dockCat: (active: boolean) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px 3px', background: active ? 'rgba(245,158,11,.05)' : '#0a0a0f', border: `1px solid ${active ? 'rgba(245,158,11,.3)' : '#1e1e2e'}`, borderRadius: '3px', color: active ? '#f59e0b' : '#3a3a4a', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', cursor: 'pointer', transition: 'all .1s', fontFamily: 'inherit' }),
    dockStatus: { display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '9px', color: '#2a2a3a' },
    dockStatusBtn: { background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '3px', color: '#555', padding: '2px 8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .1s' },
    statusBadge: { padding: '2px 8px', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: '3px', color: '#10b981', fontSize: '9px', fontWeight: 700, letterSpacing: '1px' },
    statusCount: { marginLeft: 'auto', fontSize: '10px', color: '#555' },
    toastStyle: { position: 'fixed' as const, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#10b981', color: '#000', padding: '6px 16px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', zIndex: 9999, pointerEvents: 'none' as const },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden select-none" style={{ ...css.body, maxWidth: '200px', margin: '0', width: '100%', borderRight: '1px solid #1e1e2e' }}>
      {/* SEARCH BAR */}
      <div style={css.searchBar}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#3a3a4a', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clips..."
            style={css.searchInput} />
        </div>
        <div style={css.brandBadge}>
          <span style={css.dot} className="animate-pulse" />
          {' '}POF 2828
        </div>
      </div>

      {/* TABS */}
      <div style={css.tabBar}>
        {([['hotkeys', 'HOTKEYS'], ['history', 'HISTORY'], ['ai', 'AI'], ['saved', '+']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            style={{
              ...css.tab(tab === key),
              ...(key === 'saved' ? { maxWidth: '36px' } : {}),
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* PANELS */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TAB 1: HOTKEYS */}
        {tab === 'hotkeys' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px', display: 'grid', gridTemplateColumns: '1fr', gap: '3px', alignContent: 'start' }}>
            {Array.from({ length: SLOTS_PER_PAGE }, (_, pageIdx) => {
              const i = currentPage * SLOTS_PER_PAGE + pageIdx;
              if (i >= MAX_SLOTS) return null;
              const clip = getSlotClip(i);
              const hasFill = !!clip;
              if (search && hasFill && !clip.content.toLowerCase().includes(search.toLowerCase())) return null;
              if (search && !hasFill) return null;
              const title = hasFill ? clip.content.split('\n')[0].substring(0, 30) : '';
              const preview = hasFill ? clip.content.replace(/\n/g, ' ').substring(0, 50) : '';

              return (
                <div key={i} style={css.slotCard(hasFill)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={css.slotLabel}>SLOT {i + 1}</span>
                    {hasFill && <span style={css.slotStatus}>READY</span>}
                  </div>
                  {hasFill && <div style={css.slotTitle}>{title}</div>}
                  <div style={css.slotPreview}>{hasFill ? preview : ''}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: 'auto' }}>
                    {hasFill ? (
                      <>
                        <button onClick={() => copyClip(clip)} style={{ ...css.slotBtn, ...css.copyBtn }}>
                          {copiedId === clip.id ? 'COPIED' : 'COPY'}
                        </button>
                        <button style={css.slotBtn}>—</button>
                        <button onClick={() => deleteClip(clip.id)} style={css.slotBtn}>×</button>
                      </>
                    ) : (
                      <button onClick={() => saveToSlot(i)} style={{ ...css.slotBtn, ...css.saveBtn }}>+ SAVE</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {tab === 'history' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
            {regularClips.length === 0 ? (
              <div style={css.emptyState}>
                <div style={{ fontSize: '11px', letterSpacing: '2px' }}>NO HISTORY</div>
                <div style={{ fontSize: '10px', color: '#1e1e2e' }}>clips appear as you copy</div>
              </div>
            ) : (
              regularClips.map(clip => (
                <div key={clip.id} style={css.clipItem(false)} onClick={() => copyClip(clip)}>
                  <div style={css.clipTitle}>
                    {clip.title || clip.content.split('\n')[0].slice(0, 60) || 'Untitled clip'}
                  </div>
                  <div style={css.clipDesc}>
                    {clip.content.replace(/\s+/g, ' ').trim().slice(0, 280) || 'No description'}
                  </div>
                  <div style={css.clipMeta}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                      {clip.pinned && <span style={css.clipTag(true)}>Pinned</span>}
                      {clip.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={css.clipTag(false)}>{tag}</span>
                      ))}
                    </div>
                    <span style={css.clipTime}>{timeAgo(clip.created_at || clip.ts || '')}</span>
                  </div>
                  <div style={css.clipActions}>
                    <button onClick={e => { e.stopPropagation(); updateClip(clip.id, { pinned: true }); showToast('SAVED'); }}
                      style={css.clipActionBtn}>SAVE</button>
                    <button onClick={e => { e.stopPropagation(); deleteClip(clip.id); }}
                      style={{ ...css.clipActionBtn, color: '#ef4444' }}>DEL</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: AI — Bill predictions */}
        {tab === 'ai' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', letterSpacing: '1px', color: bilOnline ? '#10b981' : '#ef4444' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: bilOnline ? '#10b981' : '#ef4444', boxShadow: bilOnline ? '0 0 4px rgba(16,185,129,0.5)' : 'none' }} />
                BIL {bilOnline ? 'ONLINE' : 'OFFLINE'}
              </div>
              <button onClick={fetchPredictions} disabled={predictLoading}
                style={{ background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '3px', color: '#888', padding: '2px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', fontFamily: 'inherit', cursor: 'pointer' }}>
                {predictLoading ? '...' : 'REFRESH'}
              </button>
            </div>
            {predictions.length === 0 ? (
              <div style={css.emptyState}>
                <div style={{ fontSize: '11px', letterSpacing: '2px' }}>
                  {bilOnline ? 'NO PREDICTIONS' : 'BIL OFFLINE'}
                </div>
                <div style={{ fontSize: '10px', color: '#1e1e2e', textAlign: 'center' }}>
                  {bilOnline ? 'copy something to train Bill' : 'start bil_server on :8420'}
                </div>
              </div>
            ) : (
              predictions.map((p, i) => {
                const title = (p.content || '').split('\n')[0].slice(0, 60) || 'prediction';
                const preview = (p.content || '').replace(/\s+/g, ' ').trim().slice(0, 280);
                return (
                  <div key={i} style={css.clipItem(false)}
                    onClick={async () => {
                      await navigator.clipboard.writeText(p.content);
                      showToast('COPIED');
                    }}>
                    <div style={css.clipTitle}>{title}</div>
                    {preview && <div style={css.clipDesc}>{preview}</div>}
                    <div style={css.clipMeta}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                        {p.reason && <span style={css.clipTag(false)}>{p.reason}</span>}
                        {p.source && <span style={css.clipTag(false)}>{p.source}</span>}
                      </div>
                      {typeof p.score === 'number' && (
                        <span style={css.clipTime}>{p.score.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 4: SAVED (+) */}
        {tab === 'saved' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
            {pinnedClips.length === 0 ? (
              <div style={css.emptyState}>
                <div style={{ fontSize: '11px', letterSpacing: '2px' }}>NO SAVED CLIPS</div>
                <div style={{ fontSize: '10px', color: '#1e1e2e' }}>hit SAVE from History to keep items permanently</div>
              </div>
            ) : (
              pinnedClips.map(clip => (
                <div key={clip.id} style={css.clipItem(true)} onClick={() => copyClip(clip)}>
                  <div style={css.clipTitle}>
                    {clip.title || clip.content.split('\n')[0].slice(0, 60) || 'Saved clip'}
                  </div>
                  <div style={css.clipDesc}>
                    {clip.content.replace(/\s+/g, ' ').trim().slice(0, 280) || 'No description'}
                  </div>
                  <div style={css.clipMeta}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
                      {clip.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={css.clipTag(true)}>{tag}</span>
                      ))}
                    </div>
                    <span style={css.clipTime}>{timeAgo(clip.created_at || clip.ts || '')}</span>
                  </div>
                  <div style={css.clipActions}>
                    <button onClick={e => { e.stopPropagation(); updateClip(clip.id, { pinned: false }); }}
                      style={{ ...css.clipActionBtn, color: '#ef4444' }}>REMOVE</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* BOTTOM DOCK */}
      <div style={css.dock}>
        <div style={css.dockIcons}>
          <div style={css.dockIcon(pin1Active)} onClick={() => { setPin1Active(!pin1Active); showToast(pin1Active ? 'UNPINNED' : 'PINNED'); }}>📌</div>
          <div style={css.dockIcon(pin2Active)} onClick={() => { setPin2Active(!pin2Active); showToast(pin2Active ? 'PIN 2 OFF' : 'PIN 2 ON'); }}>📌</div>
          <div style={css.dockIcon(false)} title="Pin any window">✏️</div>
          <div style={css.dockIcon(false)} title="Slot 1">1</div>
          <div style={css.dockIcon(false)} title="Slot 2">2</div>
          <div style={{ flex: 1 }} />
          <button style={css.dockNew} onClick={addNewSlot}>+ New</button>
        </div>
        <div style={css.dockCats}>
          {([['docs', '📄', 'Docs'], ['video', '🎬', 'Video'], ['music', '🎵', 'Music'], ['pics', '🖼️', 'Pics']] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setActiveCat(activeCat === key ? null : key)}
              style={css.dockCat(activeCat === key)}>
              <span style={{ fontSize: '14px' }}>{icon}</span> {label}
            </button>
          ))}
        </div>
        <div style={css.dockStatus}>
          <button style={css.dockStatusBtn} onClick={() => setCurrentPage((currentPage - 1 + totalPages) % totalPages)}>◀</button>
          <button style={css.dockStatusBtn}>▶</button>
          <button style={css.dockStatusBtn} onClick={() => setCurrentPage((currentPage + 1) % totalPages)}>▲</button>
          <span style={css.statusBadge}>Updated</span>
          <span style={css.statusCount}>{currentPage + 1}/{totalPages} · {filledSlotCount} slots</span>
        </div>
      </div>

      {toast && <div style={css.toastStyle}>{toast}</div>}
    </div>
  );
}
