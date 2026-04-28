import { useEffect, useMemo, useState } from 'react';
import { useBookmarksAPI, type Bookmark } from '@/hooks/useBookmarksAPI';

export function LinksView() {
  const { bookmarks, fetchBookmarks, createBookmark, updateBookmark, deleteBookmark } = useBookmarksAPI();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [form, setForm] = useState<{ title: string; url: string; category: string; tags: string; description: string }>({
    title: '', url: '', category: 'general', tags: '', description: '',
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 900);
  };

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of bookmarks) counts.set(b.category || 'general', (counts.get(b.category || 'general') || 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookmarks.filter(b => {
      if (activeCategory && (b.category || 'general') !== activeCategory) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [bookmarks, search, activeCategory]);

  const openForm = (bm?: Bookmark) => {
    if (bm) {
      setEditing(bm);
      setForm({
        title: bm.title,
        url: bm.url,
        category: bm.category || 'general',
        tags: bm.tags.join(', '),
        description: bm.description || '',
      });
    } else {
      setEditing(null);
      setForm({ title: '', url: '', category: 'general', tags: '', description: '' });
    }
    setShowForm(true);
  };

  const submitForm = async () => {
    const url = form.url.trim();
    if (!url) { showToast('URL REQUIRED'); return; }
    const payload = {
      title: form.title.trim() || url,
      url,
      category: form.category.trim() || 'general',
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      description: form.description.trim(),
    };
    if (editing) {
      await updateBookmark(editing.id, payload);
      showToast('UPDATED');
    } else {
      await createBookmark(payload);
      showToast('SAVED');
    }
    setShowForm(false);
    setEditing(null);
  };

  const css = {
    container: {
      height: '100%', display: 'flex', flexDirection: 'column' as const,
      fontFamily: "'IBM Plex Mono', monospace", background: '#0a0a0f', color: '#c8ccd4',
      overflow: 'hidden',
    },
    header: {
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', borderBottom: '1px solid #1e1e2e',
      background: '#0d0d14', flexShrink: 0,
    },
    title: { fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#22d3ee', whiteSpace: 'nowrap' as const },
    input: {
      flex: 1, background: '#12121c', border: '1px solid #1e1e2e', borderRadius: '4px',
      color: '#c8ccd4', padding: '6px 10px', fontSize: '11px', fontFamily: 'inherit', outline: 'none',
    } as React.CSSProperties,
    btn: {
      background: 'transparent', border: '1px solid #1e1e2e', borderRadius: '4px',
      color: '#22d3ee', padding: '5px 12px', fontSize: '10px', fontWeight: 700,
      letterSpacing: '1px', fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    catsBar: {
      display: 'flex', gap: '4px', padding: '6px 12px', borderBottom: '1px solid #1e1e2e',
      overflowX: 'auto' as const, flexShrink: 0,
    },
    cat: (active: boolean) => ({
      padding: '4px 10px', borderRadius: '3px', fontSize: '9px', fontWeight: 700, letterSpacing: '1px',
      color: active ? '#22d3ee' : '#555',
      background: active ? 'rgba(34,211,238,0.08)' : 'transparent',
      border: `1px solid ${active ? 'rgba(34,211,238,0.3)' : '#1e1e2e'}`,
      cursor: 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit',
    }) as React.CSSProperties,
    list: { flex: 1, overflowY: 'auto' as const, padding: '6px' } as React.CSSProperties,
    card: {
      padding: '10px 12px', marginBottom: '6px', background: '#111118',
      border: '1px solid #1e1e2e', borderRadius: '6px', cursor: 'pointer',
      transition: 'border-color .1s',
    } as React.CSSProperties,
    cardTitle: {
      fontSize: '12px', fontWeight: 600, color: '#eceef6',
      whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
    },
    cardUrl: {
      fontSize: '10px', color: '#22d3ee',
      whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px',
    },
    cardDesc: {
      fontSize: '10px', color: '#8f96ab', marginTop: '4px',
      whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
    },
    cardMeta: {
      display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' as const,
    },
    tag: {
      padding: '1px 6px', fontSize: '8px', fontWeight: 600, letterSpacing: '0.5px',
      color: '#aeb7cb', background: '#171b27', border: '1px solid #2a3145',
      borderRadius: '999px',
    } as React.CSSProperties,
    actions: { display: 'flex', gap: '4px', marginLeft: 'auto' },
    actionBtn: {
      background: '#12121c', border: '1px solid #1e1e2e', borderRadius: '999px',
      color: '#70788f', padding: '2px 8px', fontSize: '9px', fontFamily: 'inherit', cursor: 'pointer',
    } as React.CSSProperties,
    empty: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', height: '100%', color: '#3a3a4a' },
    toast: {
      position: 'fixed' as const, top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      background: '#22d3ee', color: '#000', padding: '6px 16px', borderRadius: '5px',
      fontSize: '11px', fontWeight: 700, letterSpacing: '2px', zIndex: 9999, pointerEvents: 'none' as const,
    },
    modal: {
      position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modalCard: {
      background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: '8px',
      padding: '16px', minWidth: '320px', maxWidth: '420px', width: '90%',
      display: 'flex', flexDirection: 'column' as const, gap: '8px',
    } as React.CSSProperties,
    label: { fontSize: '9px', fontWeight: 700, letterSpacing: '1px', color: '#888' } as React.CSSProperties,
    formInput: {
      background: '#12121c', border: '1px solid #1e1e2e', borderRadius: '4px',
      color: '#c8ccd4', padding: '6px 8px', fontSize: '11px', fontFamily: 'inherit', outline: 'none',
      width: '100%', boxSizing: 'border-box' as const,
    } as React.CSSProperties,
  };

  return (
    <div style={css.container}>
      <div style={css.header}>
        <span style={css.title}>LINKS</span>
        <input
          style={css.input}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title, url, tag, description..."
        />
        <button style={css.btn} onClick={() => openForm()}>+ NEW</button>
        <button style={css.btn} onClick={fetchBookmarks}>RELOAD</button>
      </div>

      {categories.length > 0 && (
        <div style={css.catsBar}>
          <button style={css.cat(activeCategory === null)} onClick={() => setActiveCategory(null)}>
            ALL · {bookmarks.length}
          </button>
          {categories.map(([cat, count]) => (
            <button key={cat} style={css.cat(activeCategory === cat)} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}>
              {cat.toUpperCase()} · {count}
            </button>
          ))}
        </div>
      )}

      <div style={css.list}>
        {filtered.length === 0 ? (
          <div style={css.empty}>
            <div style={{ fontSize: '11px', letterSpacing: '2px' }}>NO LINKS</div>
            <div style={{ fontSize: '10px', color: '#1e1e2e', marginTop: '4px' }}>
              {bookmarks.length === 0 ? 'add your first bookmark' : 'no matches for filters'}
            </div>
          </div>
        ) : (
          filtered.map(bm => (
            <div key={bm.id} style={css.card} onClick={() => window.open(bm.url, '_blank', 'noopener,noreferrer')}>
              <div style={css.cardTitle}>{bm.title || bm.url}</div>
              <div style={css.cardUrl}>{bm.url}</div>
              {bm.description && <div style={css.cardDesc}>{bm.description}</div>}
              <div style={css.cardMeta}>
                {bm.category && <span style={css.tag}>{bm.category}</span>}
                {bm.tags.slice(0, 4).map(t => <span key={t} style={css.tag}>#{t}</span>)}
                <div style={css.actions} onClick={e => e.stopPropagation()}>
                  <button style={css.actionBtn} onClick={() => openForm(bm)}>EDIT</button>
                  <button style={{ ...css.actionBtn, color: '#ef4444' }}
                    onClick={async () => { await deleteBookmark(bm.id); showToast('DELETED'); }}>
                    DEL
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div style={css.modal} onClick={() => setShowForm(false)}>
          <div style={css.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#22d3ee' }}>
              {editing ? 'EDIT LINK' : 'NEW LINK'}
            </div>
            <div>
              <div style={css.label}>URL</div>
              <input style={css.formInput} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." autoFocus />
            </div>
            <div>
              <div style={css.label}>TITLE</div>
              <input style={css.formInput} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="(optional, defaults to URL)" />
            </div>
            <div>
              <div style={css.label}>CATEGORY</div>
              <input style={css.formInput} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="general" />
            </div>
            <div>
              <div style={css.label}>TAGS (comma separated)</div>
              <input style={css.formInput} value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="react, notes, ..." />
            </div>
            <div>
              <div style={css.label}>DESCRIPTION</div>
              <input style={css.formInput} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button style={{ ...css.btn, flex: 1 }} onClick={submitForm}>{editing ? 'SAVE' : 'ADD'}</button>
              <button style={{ ...css.btn, flex: 1, color: '#888' }} onClick={() => setShowForm(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={css.toast}>{toast}</div>}
    </div>
  );
}
