import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface Prompt {
  id: string;
  name: string;
  short: string;
  template: string;
  category: string;
  category_label: string;
  color: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export function usePromptsAPI() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Prompt[]>('/prompts');
      if (data) setPrompts(data);
    } catch { /* offline — keep local state */ }
    setLoading(false);
  }, []);

  const createPrompt = useCallback(async (prompt: Omit<Prompt, 'id' | 'created_at' | 'updated_at'>) => {
    const id = `p_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();
    const newPrompt: Prompt = { ...prompt, id, created_at: now, updated_at: now };
    setPrompts(prev => [...prev, newPrompt]);
    try { await apiPost('/prompts', newPrompt); } catch { /* offline */ }
    return id;
  }, []);

  const updatePrompt = useCallback(async (id: string, data: Partial<Prompt>) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p));
    try { await apiPut(`/prompts/${id}`, data); } catch { /* offline */ }
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    try { await apiDelete(`/prompts/${id}`); } catch { /* offline */ }
  }, []);

  return { prompts, loading, fetchPrompts, createPrompt, updatePrompt, deletePrompt };
}
