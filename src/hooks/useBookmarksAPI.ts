import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export function useBookmarksAPI() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Bookmark[]>('/bookmarks');
      if (data) setBookmarks(data);
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  const createBookmark = useCallback(async (bm: Omit<Bookmark, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `bm_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();
    const newBm: Bookmark = { ...bm, id, created_at: now, updated_at: now };
    setBookmarks(prev => [...prev, newBm]);
    try { await apiPost('/bookmarks', newBm); } catch { /* offline */ }
    return id;
  }, []);

  const updateBookmark = useCallback(async (id: string, data: Partial<Bookmark>) => {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, ...data, updated_at: new Date().toISOString() } : b));
    try { await apiPut(`/bookmarks/${id}`, data); } catch { /* offline */ }
  }, []);

  const deleteBookmark = useCallback(async (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    try { await apiDelete(`/bookmarks/${id}`); } catch { /* offline */ }
  }, []);

  return { bookmarks, loading, fetchBookmarks, createBookmark, updateBookmark, deleteBookmark };
}
