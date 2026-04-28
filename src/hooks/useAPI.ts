import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface Clip {
  id: string;
  content: string;
  title?: string;
  tags: string[];
  categories?: string[];
  pinned: boolean;
  slot?: number | null;
  ts?: string;
  created_at?: string;
  updated_at?: string;
}

export function useClipsAPI() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClips = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Clip[]>('/clips?limit=2000');
      if (Array.isArray(data)) setClips(data);
    } catch {
      // Server offline — clips stay as-is
    }
    setLoading(false);
  }, []);

  const createClip = useCallback(async (clip: Partial<Clip>) => {
    const id = clip.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const full = { id, content: '', tags: [], pinned: false, ts: now, created_at: now, ...clip };
    try {
      await apiPost('/clips', full);
      setClips(prev => [full as Clip, ...prev]);
    } catch {
      // Offline — add locally anyway
      setClips(prev => [full as Clip, ...prev]);
    }
    return id;
  }, []);

  const updateClip = useCallback(async (id: string, updates: Partial<Clip>) => {
    try {
      await apiPut(`/clips/${id}`, updates);
    } catch {}
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteClip = useCallback(async (id: string) => {
    try {
      await apiDelete(`/clips/${id}`);
    } catch {}
    setClips(prev => prev.filter(c => c.id !== id));
  }, []);

  return { clips, loading, fetchClips, createClip, updateClip, deleteClip };
}
