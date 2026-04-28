import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export function useNotesAPI() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Note[]>('/notes');
      if (data) setNotes(data);
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  const createNote = useCallback(async (title: string, content: string, tags: string[] = []) => {
    const id = `n_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();
    const newNote: Note = { id, title, content, tags, created_at: now, updated_at: now };
    setNotes(prev => [...prev, newNote]);
    try { await apiPost('/notes', newNote); } catch { /* offline */ }
    return id;
  }, []);

  const updateNote = useCallback(async (id: string, data: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data, updated_at: new Date().toISOString() } : n));
    try { await apiPut(`/notes/${id}`, data); } catch { /* offline */ }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try { await apiDelete(`/notes/${id}`); } catch { /* offline */ }
  }, []);

  return { notes, loading, fetchNotes, createNote, updateNote, deleteNote };
}
