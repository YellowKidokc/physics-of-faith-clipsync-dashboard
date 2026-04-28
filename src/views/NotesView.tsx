import { useState, useEffect } from 'react';
import { useNotesAPI } from '@/hooks/useNotesAPI';

// ─── NOTES VIEW ───

export function NotesView() {
  const { notes, fetchNotes, createNote, updateNote } = useNotesAPI();

  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [toast, setToast] = useState(false);

  // Fetch on mount + poll every 5s
  useEffect(() => {
    fetchNotes();
    const id = setInterval(fetchNotes, 5000);
    return () => clearInterval(id);
  }, [fetchNotes]);

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 600);
  };

  const startNewNote = () => {
    setIsEditing(true);
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  const startEdit = (note: { id: string; title: string; content: string }) => {
    setIsEditing(true);
    setEditingNote(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const saveNote = async () => {
    if (!title.trim()) return;
    if (editingNote) {
      await updateNote(editingNote, { title, content });
    } else {
      await createNote(title, content);
    }
    showToast();
    setIsEditing(false);
  };

  // ── Edit Mode ──
  if (isEditing) {
    return (
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--background, #0a0a0f)', color: 'var(--foreground, #c8ccd4)' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <button
            onClick={() => setIsEditing(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground, #5A5F6E)', fontSize: '14px' }}
          >
            ← Back
          </button>
          <button
            onClick={saveNote}
            style={{ padding: '8px 16px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
          >
            Save
          </button>
        </div>

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          style={{
            fontSize: '22px',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--foreground, #c8ccd4)',
            marginBottom: '16px',
            width: '100%',
          }}
        />

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: 'var(--foreground, #c8ccd4)',
            lineHeight: 1.6,
          }}
        />
      </div>
    );
  }

  // ── List Mode ──
  return (
    <div style={{ padding: '24px', background: 'var(--background, #0a0a0f)', color: 'var(--foreground, #c8ccd4)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>Notes</h1>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground, #5A5F6E)', margin: '4px 0 0' }}>
            Quick capture and markdown notes
          </p>
        </div>
        <button
          onClick={startNewNote}
          style={{
            padding: '8px 16px',
            background: '#f59e0b',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          + New Note
        </button>
      </div>

      {/* Notes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {notes.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--muted-foreground, #5A5F6E)', padding: '32px 0' }}>
            No notes yet. Create your first note!
          </p>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              onClick={() => startEdit(note)}
              style={{
                padding: '16px',
                background: 'var(--card, #131318)',
                border: '1px solid var(--border, #2a2a3a)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border, #2a2a3a)')}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontWeight: 600, margin: 0, fontSize: '14px', color: 'var(--foreground, #c8ccd4)' }}>
                    {note.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground, #5A5F6E)', marginTop: '4px', marginBottom: '8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {note.content.slice(0, 120)}{note.content.length > 120 ? '…' : ''}
                  </p>
                  {note.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {note.tags.map(tag => (
                        <span
                          key={tag}
                          style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--muted, #1e1e2a)', borderRadius: '4px', color: 'var(--muted-foreground, #5A5F6E)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--muted-foreground, #5A5F6E)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                  {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#22c55e',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 9999,
        }}>
          Saved
        </div>
      )}
    </div>
  );
}
