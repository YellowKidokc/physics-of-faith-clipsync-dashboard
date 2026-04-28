import { useState, useEffect, useCallback } from 'react';
import { usePromptsAPI } from '@/hooks/usePromptsAPI';
import type { Prompt } from '@/hooks/usePromptsAPI';

const CATEGORIES = [
  { key: null,       label: 'ALL',      color: '#94a3b8' },
  { key: 'core8',    label: 'CORE 8',   color: '#f59e0b' },
  { key: 'extended', label: 'EXTENDED', color: '#3b82f6' },
  { key: 'chains',   label: 'CHAINS',   color: '#10b981' },
  { key: 'ops',      label: 'OPS',      color: '#a855f7' },
  { key: 'custom',   label: 'CUSTOM',   color: '#ef4444' },
];

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightTemplate(tpl: string): string {
  return escapeHtml(tpl)
    .replace(
      /\{[^}]+\}/g,
      match =>
        `<span style="color:#f59e0b;background:rgba(245,158,11,0.1);padding:0 3px;border-radius:3px;border:1px solid rgba(245,158,11,0.2)">${match}</span>`,
    )
    .replace(
      /(\/[A-Z]+)/g,
      '<span style="color:#60d0ff;font-weight:600">$1</span>',
    );
}

export function PromptsView() {
  const { prompts, fetchPrompts } = usePromptsAPI();

  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editMode, setEditMode]             = useState(false);
  const [editText, setEditText]             = useState('');
  const [chain, setChain]                   = useState<Prompt[]>([]);
  const [showChain, setShowChain]           = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
    const id = setInterval(fetchPrompts, 5000);
    return () => clearInterval(id);
  }, [fetchPrompts]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 600);
  }, []);

  const filteredPrompts = prompts.filter(p => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.short.toLowerCase().includes(q) ||
        p.template.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    showToast('COPIED');
  };

  const addToChain = (prompt: Prompt) => {
    if (!chain.some(c => c.id === prompt.id)) {
      setChain(prev => [...prev, prompt]);
      setShowChain(true);
    }
  };

  const removeFromChain = (id: string) => {
    setChain(prev => prev.filter(c => c.id !== id));
  };

  const copyChain = () => {
    const text =
      chain.map(c => c.name).join(' → ') +
      '\n\n' +
      chain.map((c, i) => `--- Step ${i + 1}: ${c.name} ---\n${c.template}`).join('\n\n');
    copyToClipboard(text);
  };

  // ── Layout widths ──────────────────────────────────────────────
  const leftWidth = showChain ? '35%' : '42%';

  return (
    <div style={styles.root}>
      {/* ── LEFT PANEL ──────────────────────────────────────────── */}
      <div style={{ ...styles.leftPanel, width: leftWidth, minWidth: leftWidth, maxWidth: leftWidth }}>
        {/* Header */}
        <div style={styles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <div style={styles.panelTitle}>Prompts</div>
              <div style={styles.panelSub}>{filteredPrompts.length} commands</div>
            </div>
            <button
              onClick={() => setShowChain(!showChain)}
              style={{
                ...styles.chainToggle,
                background: chain.length > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                color:      chain.length > 0 ? '#10b981' : 'var(--cs-text-dim, #6b7280)',
                border:     `1px solid ${chain.length > 0 ? 'rgba(16,185,129,0.3)' : 'var(--cs-border, #1e1e2e)'}`,
              }}
            >
              ⚡ CHAIN{chain.length > 0 ? ` (${chain.length})` : ''}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#3a3a4a', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search commands..."
              style={styles.searchInput}
            />
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {CATEGORIES.map(cat => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key ?? 'all'}
                  onClick={() => setSelectedCategory(cat.key as string | null)}
                  style={{
                    ...styles.catBtn,
                    background:  active ? cat.color : 'rgba(255,255,255,0.04)',
                    color:       active ? '#000'    : 'var(--cs-text-dim, #6b7280)',
                    borderColor: active ? cat.color : 'var(--cs-border, #1e1e2e)',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt list */}
        <div style={styles.scrollArea}>
          {filteredPrompts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '13px', letterSpacing: '2px', marginBottom: '6px' }}>NO COMMANDS</div>
              <div style={{ fontSize: '11px', color: 'var(--cs-border, #1e1e2e)' }}>adjust filters or add prompts</div>
            </div>
          ) : (
            filteredPrompts.map(prompt => {
              const isSelected = selectedPrompt?.id === prompt.id;
              const inChain    = chain.some(c => c.id === prompt.id);
              return (
                <div
                  key={prompt.id}
                  onClick={() => {
                    setSelectedPrompt(prompt);
                    setEditMode(false);
                    setEditText(prompt.template);
                  }}
                  style={{
                    ...styles.promptRow,
                    background:   isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderLeft:   `2px solid ${isSelected ? 'var(--cs-gold, #f59e0b)' : 'transparent'}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      {/* Color dot */}
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: prompt.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ ...styles.promptName, color: prompt.color }}>{prompt.name}</span>
                      <span style={styles.catBadge}>{prompt.category_label || prompt.category}</span>
                    </div>
                    <div style={styles.promptShort}>{prompt.short}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); addToChain(prompt); }}
                    style={{
                      ...styles.chainAddBtn,
                      color:       inChain ? '#10b981' : 'var(--cs-text-dim, #6b7280)',
                      borderColor: inChain ? 'rgba(16,185,129,0.3)' : 'var(--cs-border, #1e1e2e)',
                    }}
                    title="Add to chain"
                  >
                    +
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── CENTER PANEL ─────────────────────────────────────────── */}
      <div style={styles.centerPanel}>
        {selectedPrompt ? (
          <>
            {/* Center header */}
            <div style={styles.panelHeader}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ ...styles.panelTitle, color: selectedPrompt.color }}>{selectedPrompt.name}</span>
                    <span style={styles.panelSub}>{selectedPrompt.short}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    style={{
                      ...styles.actionBtn,
                      background:  editMode ? 'rgba(96,208,255,0.1)' : 'transparent',
                      color:       editMode ? '#60d0ff' : 'var(--cs-text-dim, #6b7280)',
                      borderColor: editMode ? 'rgba(96,208,255,0.3)' : 'var(--cs-border, #1e1e2e)',
                    }}
                  >
                    {editMode ? 'PREVIEW' : 'EDIT'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(editMode ? editText : selectedPrompt.template)}
                    style={styles.copyBtn}
                  >
                    COPY
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={styles.scrollArea}>
              {editMode ? (
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  style={styles.editTextarea}
                />
              ) : (
                <pre
                  style={styles.previewPre}
                  dangerouslySetInnerHTML={{ __html: highlightTemplate(selectedPrompt.template) }}
                />
              )}
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.2 }}>⌘</div>
            <div style={{ fontSize: '13px', letterSpacing: '2px', marginBottom: '4px' }}>SELECT A COMMAND</div>
            <div style={{ fontSize: '11px', color: 'var(--cs-border, #1e1e2e)' }}>or start typing to search</div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL — CHAIN BUILDER ──────────────────────────── */}
      {showChain && (
        <div style={styles.rightPanel}>
          <div style={{ ...styles.panelHeader, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={styles.chainTitle}>CHAIN BUILDER</span>
            <button
              onClick={() => { setChain([]); setShowChain(false); }}
              style={styles.clearBtn}
            >
              CLEAR
            </button>
          </div>

          <div style={styles.scrollArea}>
            {chain.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '11px', color: 'var(--cs-text-dim, #6b7280)', textAlign: 'center' }}>
                Click <span style={{ color: '#10b981' }}>+</span> on any command to build a pipeline
              </div>
            ) : (
              chain.map((item, i) => (
                <div key={item.id}>
                  <div style={styles.chainItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={styles.chainIndex}>{i + 1}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: item.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </div>
                    <button onClick={() => removeFromChain(item.id)} style={styles.removeBtn} title="Remove">×</button>
                  </div>
                  {i < chain.length - 1 && (
                    <div style={{ textAlign: 'center', color: '#10b981', fontSize: '11px', padding: '2px 0' }}>→</div>
                  )}
                </div>
              ))
            )}
          </div>

          {chain.length > 0 && (
            <div style={{ padding: '8px', borderTop: '1px solid var(--cs-border, #1e1e2e)', flexShrink: 0 }}>
              <button onClick={copyChain} style={styles.copyChainBtn}>COPY CHAIN</button>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100%',
    display: 'flex',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    background: 'var(--cs-bg, #0a0a0f)',
    color: 'var(--cs-text, #c8ccd4)',
    overflow: 'hidden',
    userSelect: 'none',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--cs-border, #1e1e2e)',
    flexShrink: 0,
    overflow: 'hidden',
  },
  centerPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--cs-border, #1e1e2e)',
    overflow: 'hidden',
    minWidth: 0,
  },
  rightPanel: {
    width: '224px',
    minWidth: '224px',
    maxWidth: '224px',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  panelHeader: {
    padding: '12px 14px',
    borderBottom: '1px solid var(--cs-border, #1e1e2e)',
    flexShrink: 0,
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--cs-text, #c8ccd4)',
    letterSpacing: '0.5px',
  },
  panelSub: {
    fontSize: '11px',
    color: 'var(--cs-text-dim, #6b7280)',
    marginTop: '1px',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
  },
  searchInput: {
    width: '100%',
    paddingLeft: '32px',
    paddingRight: '10px',
    paddingTop: '8px',
    paddingBottom: '8px',
    background: 'var(--cs-card, #111118)',
    border: '1px solid var(--cs-border, #1e1e2e)',
    borderRadius: '6px',
    color: 'var(--cs-text, #c8ccd4)',
    fontSize: '12px',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    outline: 'none',
    boxSizing: 'border-box',
  },
  catBtn: {
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    transition: 'all 0.1s',
  },
  chainToggle: {
    padding: '5px 10px',
    borderRadius: '5px',
    border: '1px solid',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    cursor: 'pointer',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    transition: 'all 0.1s',
    whiteSpace: 'nowrap',
  },
  promptRow: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--cs-border, #1e1e2e)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    transition: 'background 0.08s',
  },
  promptName: {
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  catBadge: {
    padding: '1px 6px',
    background: 'var(--cs-card, #111118)',
    border: '1px solid var(--cs-border, #1e1e2e)',
    borderRadius: '999px',
    fontSize: '9px',
    fontWeight: 600,
    color: 'var(--cs-text-dim, #6b7280)',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  promptShort: {
    fontSize: '11px',
    color: 'var(--cs-text-dim, #6b7280)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingLeft: '13px',
  },
  chainAddBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    border: '1px solid',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.1s',
    fontFamily: 'inherit',
  },
  emptyState: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--cs-text-dim, #6b7280)',
    padding: '20px',
    textAlign: 'center',
  },
  actionBtn: {
    padding: '5px 10px',
    borderRadius: '4px',
    border: '1px solid',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    transition: 'all 0.1s',
  },
  copyBtn: {
    padding: '5px 10px',
    borderRadius: '4px',
    border: '1px solid rgba(245,158,11,0.3)',
    background: 'rgba(245,158,11,0.1)',
    color: 'var(--cs-gold, #f59e0b)',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    transition: 'all 0.1s',
  },
  previewPre: {
    whiteSpace: 'pre-wrap',
    fontSize: '12px',
    color: 'var(--cs-text-dim, #6b7280)',
    lineHeight: '1.65',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    padding: '16px',
    margin: 0,
  },
  editTextarea: {
    width: '100%',
    height: '100%',
    background: 'var(--cs-card, #111118)',
    border: '1px solid var(--cs-border, #1e1e2e)',
    borderRadius: '6px',
    padding: '14px',
    color: 'var(--cs-text, #c8ccd4)',
    fontSize: '12px',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box',
  },
  chainTitle: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    color: '#10b981',
  },
  clearBtn: {
    padding: '3px 8px',
    borderRadius: '3px',
    border: '1px solid var(--cs-border, #1e1e2e)',
    background: 'transparent',
    color: 'var(--cs-text-dim, #6b7280)',
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
  },
  chainItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 8px',
    margin: '4px 8px',
    background: 'var(--cs-card, #111118)',
    border: '1px solid var(--cs-border, #1e1e2e)',
    borderRadius: '5px',
  },
  chainIndex: {
    fontSize: '10px',
    color: 'var(--cs-text-dim, #6b7280)',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    flexShrink: 0,
    width: '14px',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--cs-text-dim, #6b7280)',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0 2px',
    flexShrink: 0,
    transition: 'color 0.1s',
  },
  copyChainBtn: {
    width: '100%',
    padding: '8px 0',
    borderRadius: '4px',
    border: '1px solid rgba(16,185,129,0.3)',
    background: 'rgba(16,185,129,0.1)',
    color: '#10b981',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    cursor: 'pointer',
    fontFamily: "var(--cs-font-mono, 'IBM Plex Mono', monospace)",
    transition: 'background 0.1s',
  },
  toast: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#10b981',
    color: '#000',
    padding: '10px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    zIndex: 9999,
    pointerEvents: 'none',
  },
};
