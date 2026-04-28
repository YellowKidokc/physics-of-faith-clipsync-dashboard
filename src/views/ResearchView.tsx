import { useState, useEffect, useCallback } from 'react';
import { useBookmarksAPI } from '@/hooks/useBookmarksAPI';
import type { Bookmark } from '@/hooks/useBookmarksAPI';

const SEARCH_HISTORY_KEY = 'pof2828_research_search_history';

const PRESETS = {
  general:  { label: 'General',       filter: '' },
  dev:      { label: 'Dev / Code',    filter: '(site:github.com OR site:stackoverflow.com OR site:dev.to)' },
  academic: { label: 'Academic',      filter: '(site:arxiv.org OR site:scholar.google.com) filetype:pdf' },
  obsidian: { label: 'Obsidian',      filter: '(site:github.com OR site:forum.obsidian.md OR site:obsidian.md)' },
  datasets: { label: 'Data',          filter: '(site:kaggle.com OR site:data.gov) (filetype:csv OR filetype:xlsx OR filetype:json)' },
  docs:     { label: 'Docs',          filter: '(filetype:pdf OR filetype:docx)' },
} as const;

type PresetKey = keyof typeof PRESETS;

const CAT_COLORS: Record<string, string> = {
  research:      '#f59e0b',
  dev:           '#60d0ff',
  reference:     '#10b981',
  tools:         '#a855f7',
  news:          '#ef4444',
  personal:      '#ec4899',
};

function getCatColor(cat: string): string {
  return CAT_COLORS[(cat || '').toLowerCase()] ?? '#5a5f6e';
}

export function ResearchView() {
  const { bookmarks, fetchBookmarks, createBookmark, updateBookmark, deleteBookmark } = useBookmarksAPI();

  // ── Search state ──
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchPreset, setSearchPreset]     = useState<PresetKey>('general');
  const [history, setHistory]               = useState<string[]>([]);

  // ── Bookmark filter state ──
  const [filterQuery, setFilterQuery]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // ── Modal state ──
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [formData, setFormData]             = useState({ title: '', url: '', category: '', tags: '' });

  // ── Toast ──
  const [toast, setToast]                   = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 600);
  }, []);

  // ── Load search history ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch { /* ignore */ }
  }, [history]);

  // ── Fetch on mount + poll every 5 s ──
  useEffect(() => {
    fetchBookmarks();
    const id = setInterval(fetchBookmarks, 5000);
    return () => clearInterval(id);
  }, [fetchBookmarks]);

  // ── Derived ──
  const categories = ['all', ...Array.from(new Set(bookmarks.map(b => b.category || 'General')))];

  const filteredBookmarks = bookmarks.filter(b => {
    if (selectedCategory !== 'all' && (b.category || 'General') !== selectedCategory) return false;
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q);
    }
    return true;
  });

  const builtSearch = [searchQuery.trim(), PRESETS[searchPreset].filter]
    .filter(Boolean)
    .join(' ')
    .trim();

  // ── Search actions ──
  const saveSearchToHistory = useCallback((query: string) => {
    if (!query) return;
    setHistory(prev => [query, ...prev.filter(i => i !== query)].slice(0, 8));
  }, []);

  const openSearchTarget = useCallback((target: 'google' | 'exa' | 'crawler') => {
    if (!builtSearch) return;
    saveSearchToHistory(builtSearch);
    const encoded = encodeURIComponent(builtSearch);
    const urls = {
      google:  `https://www.google.com/search?q=${encoded}`,
      exa:     `https://exa.ai/search?q=${encoded}`,
      crawler: `https://searcht1.com/search?q=${encoded}`,
    };
    window.open(urls[target], '_blank', 'noopener,noreferrer');
  }, [builtSearch, saveSearchToHistory]);

  // ── Bookmark modal ──
  const openCreateModal = () => {
    setEditingBookmark(null);
    setFormData({ title: '', url: '', category: '', tags: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    setFormData({
      title:    bookmark.title,
      url:      bookmark.url,
      category: bookmark.category || '',
      tags:     bookmark.tags.join(', '),
    });
    setIsModalOpen(true);
  };

  const saveBookmark = async () => {
    const data = {
      title:    formData.title.trim(),
      url:      formData.url.trim(),
      category: formData.category.trim() || 'General',
      tags:     formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    if (!data.title || !data.url) return;

    if (editingBookmark) {
      await updateBookmark(editingBookmark.id, data);
      showToast('Bookmark updated');
    } else {
      await createBookmark(data);
      showToast('Bookmark saved');
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteBookmark(id);
    showToast('Deleted');
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    showToast('Copied!');
  };

  return (
    <div style={styles.root}>

      {/* ── Toast ── */}
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}

      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>🌐 Research Links + Search</h1>
            <p style={styles.subtitle}>Bookmark library plus smart search presets.</p>
          </div>
          <button onClick={openCreateModal} style={styles.newBtn}>+ NEW</button>
        </div>

        {/* Smart Search Card */}
        <div style={styles.searchCard}>

          {/* Preset tabs */}
          <div style={styles.presetRow}>
            {(Object.entries(PRESETS) as [PresetKey, typeof PRESETS[PresetKey]][]).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setSearchPreset(key)}
                style={{
                  ...styles.presetBtn,
                  ...(searchPreset === key ? styles.presetBtnActive : {}),
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search input + action buttons */}
          <div style={styles.searchRow}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') openSearchTarget('google'); }}
              placeholder="Search the web with preset-aware filters..."
              style={styles.searchInput}
            />
            <button
              onClick={() => openSearchTarget('google')}
              disabled={!builtSearch}
              style={{ ...styles.actionBtn, ...styles.googleBtn }}
            >
              Google
            </button>
            <button
              onClick={() => openSearchTarget('exa')}
              disabled={!builtSearch}
              style={{ ...styles.actionBtn, ...styles.exaBtn }}
            >
              Exa
            </button>
            <button
              onClick={() => openSearchTarget('crawler')}
              disabled={!builtSearch}
              style={{ ...styles.actionBtn, ...styles.crawlerBtn }}
            >
              Smart Crawler
            </button>
          </div>

          {/* Built query display */}
          <div style={styles.builtQuery}>
            <span style={styles.builtQueryLabel}>BUILT QUERY</span>
            <span style={styles.builtQueryText}>
              {builtSearch || 'Choose a preset and enter a query to build the final search string.'}
            </span>
          </div>

          {/* Search history */}
          {history.length > 0 && (
            <div>
              <div style={styles.historyLabel}>⏱ Search history</div>
              <div style={styles.historyRow}>
                {history.map(item => (
                  <button
                    key={item}
                    onClick={() => setSearchQuery(item)}
                    style={styles.historyChip}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bookmark filter + category pills */}
        <div style={styles.filterSection}>
          <input
            type="text"
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder="Filter saved bookmarks..."
            style={styles.filterInput}
          />
          <div style={styles.categoryRow}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...styles.catPill,
                  ...(selectedCategory === cat ? styles.catPillActive : {}),
                }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bookmarks list ── */}
      <div style={styles.listArea}>
        {filteredBookmarks.map(bookmark => (
          <div
            key={bookmark.id}
            style={{
              ...styles.card,
              borderLeft: `3px solid ${getCatColor(bookmark.category || '')}`,
            }}
          >
            <div style={styles.cardTitle}>{bookmark.title}</div>
            <div style={styles.cardUrl}>{bookmark.url}</div>
            {bookmark.tags.length > 0 && (
              <div style={styles.tagRow}>
                {bookmark.tags.map(tag => (
                  <span key={tag} style={styles.tagChip}>{tag}</span>
                ))}
              </div>
            )}
            <div style={styles.cardActions}>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...styles.cardBtn, ...styles.openBtn }}
              >
                OPEN
              </a>
              <button onClick={() => copyUrl(bookmark.url)} style={{ ...styles.cardBtn, ...styles.copyBtn }}>
                COPY
              </button>
              <button onClick={() => openEditModal(bookmark)} style={{ ...styles.cardBtn, ...styles.editBtn }}>
                EDIT
              </button>
              <button onClick={() => handleDelete(bookmark.id)} style={{ ...styles.cardBtn, ...styles.delBtn }}>
                DEL
              </button>
            </div>
          </div>
        ))}
        {filteredBookmarks.length === 0 && (
          <p style={styles.empty}>No bookmarks found</p>
        )}
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{editingBookmark ? 'Edit' : 'New'} Bookmark</h3>
            <div style={styles.modalFields}>
              {([
                { label: 'Title',                   key: 'title',    type: 'text',  placeholder: 'e.g. Theophysics Dashboard' },
                { label: 'URL',                     key: 'url',      type: 'url',   placeholder: 'https://...' },
                { label: 'Category',                key: 'category', type: 'text',  placeholder: 'e.g. Research' },
                { label: 'Tags (comma separated)',  key: 'tags',     type: 'text',  placeholder: 'e.g. dashboard, api' },
              ] as const).map(field => (
                <div key={field.key} style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>{field.label}</label>
                  <input
                    type={field.type}
                    value={formData[field.key]}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    style={styles.fieldInput}
                  />
                </div>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={saveBookmark} style={styles.saveBtn}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--background, #0a0a0f)',
    color: 'var(--foreground, #c8ccd4)',
    position: 'relative',
    overflow: 'hidden',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: '#10b981',
    color: '#fff',
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    zIndex: 9999,
    pointerEvents: 'none',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid var(--border, #1e2028)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flexShrink: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.3,
    color: 'var(--foreground, #c8ccd4)',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--muted-foreground, #5a5f6e)',
    margin: '4px 0 0',
  },
  newBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    background: 'rgba(245,158,11,0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.3)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  searchCard: {
    background: 'var(--card, #111118)',
    border: '1px solid var(--border, #1e2028)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  presetRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  presetBtn: {
    padding: '6px 14px',
    borderRadius: '9999px',
    fontSize: '12px',
    border: '1px solid var(--border, #1e2028)',
    background: 'transparent',
    color: 'var(--muted-foreground, #5a5f6e)',
    cursor: 'pointer',
  },
  presetBtnActive: {
    border: '1px solid #3b82f6',
    background: 'rgba(59,130,246,0.1)',
    color: '#60a5fa',
  },
  searchRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: '1 1 200px',
    padding: '10px 14px',
    background: 'var(--muted, #1a1a24)',
    border: '1px solid var(--border, #1e2028)',
    borderRadius: '8px',
    color: 'var(--foreground, #c8ccd4)',
    fontSize: '13px',
    outline: 'none',
    minWidth: 0,
  },
  actionBtn: {
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  googleBtn: {
    background: '#f59e0b',
    color: '#0a0a0f',
    border: 'none',
  },
  exaBtn: {
    background: 'transparent',
    color: '#60d0ff',
    border: '1px solid rgba(96,208,255,0.4)',
  },
  crawlerBtn: {
    background: 'transparent',
    color: '#10b981',
    border: '1px solid rgba(16,185,129,0.4)',
  },
  builtQuery: {
    background: 'var(--muted, #1a1a24)',
    border: '1px dashed var(--border, #1e2028)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--muted-foreground, #5a5f6e)',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  builtQueryLabel: {
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: 'var(--muted-foreground, #5a5f6e)',
    flexShrink: 0,
    paddingTop: '1px',
  },
  builtQueryText: {
    color: 'var(--foreground, #c8ccd4)',
    wordBreak: 'break-all',
  },
  historyLabel: {
    fontSize: '11px',
    letterSpacing: '0.1em',
    color: 'var(--muted-foreground, #5a5f6e)',
    marginBottom: '6px',
  },
  historyRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  historyChip: {
    padding: '5px 12px',
    borderRadius: '9999px',
    background: 'var(--muted, #1a1a24)',
    border: '1px solid var(--border, #1e2028)',
    color: 'var(--muted-foreground, #5a5f6e)',
    fontSize: '11px',
    cursor: 'pointer',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterInput: {
    width: '100%',
    padding: '8px 14px',
    background: 'var(--muted, #1a1a24)',
    border: '1px solid var(--border, #1e2028)',
    borderRadius: '8px',
    color: 'var(--foreground, #c8ccd4)',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  categoryRow: {
    display: 'flex',
    gap: '4px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  catPill: {
    padding: '5px 12px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    background: 'transparent',
    border: 'none',
    color: 'var(--muted-foreground, #5a5f6e)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  catPillActive: {
    color: '#3b82f6',
    borderBottom: '2px solid #3b82f6',
  },
  listArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    padding: '12px',
    background: 'var(--card, #111118)',
    border: '1px solid var(--border, #1e2028)',
    borderRadius: '8px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--foreground, #c8ccd4)',
  },
  cardUrl: {
    fontSize: '12px',
    color: 'var(--muted-foreground, #5a5f6e)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '2px',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '8px',
  },
  tagChip: {
    fontSize: '10px',
    padding: '2px 8px',
    background: 'var(--muted, #1a1a24)',
    borderRadius: '4px',
    color: 'var(--muted-foreground, #5a5f6e)',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  cardBtn: {
    flex: 1,
    padding: '7px 12px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    border: 'none',
    background: 'transparent',
  },
  openBtn: {
    color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.3)',
  },
  copyBtn: {
    color: '#10b981',
    border: '1px solid rgba(16,185,129,0.3)',
  },
  editBtn: {
    color: '#a855f7',
    border: '1px solid rgba(168,85,247,0.3)',
  },
  delBtn: {
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.3)',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--muted-foreground, #5a5f6e)',
    padding: '32px 0',
    fontSize: '14px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  modal: {
    width: '100%',
    maxWidth: '440px',
    margin: '0 16px',
    background: 'var(--card, #111118)',
    border: '1px solid var(--border, #1e2028)',
    borderRadius: '14px',
    padding: '24px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#f59e0b',
    margin: '0 0 16px',
  },
  modalFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldLabel: {
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--muted-foreground, #5a5f6e)',
  },
  fieldInput: {
    padding: '8px 12px',
    background: 'var(--muted, #1a1a24)',
    border: '1px solid var(--border, #1e2028)',
    borderRadius: '8px',
    color: 'var(--foreground, #c8ccd4)',
    fontSize: '13px',
    outline: 'none',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  cancelBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    fontSize: '13px',
    background: 'transparent',
    border: 'none',
    color: 'var(--muted-foreground, #5a5f6e)',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
  },
};
