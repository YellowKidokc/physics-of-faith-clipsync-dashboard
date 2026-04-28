import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export interface Task {
  id: string;
  title: string;
  due: string;
  time: string;
  done: boolean;
  priority: string;
  project: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  created_at?: string;
}

export function useTasksAPI() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Task[]>('/tasks');
      if (data) setTasks(data.map(t => ({ ...t, done: !!t.done })));
    } catch { /* offline */ }
    setLoading(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await apiGet<Project[]>('/projects');
      if (data) setProjects(data);
    } catch { /* offline */ }
  }, []);

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'done' | 'created_at' | 'updated_at'>) => {
    const id = `t_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id, done: false, created_at: now, updated_at: now };
    setTasks(prev => [...prev, newTask]);
    try { await apiPost('/tasks', newTask); } catch { /* offline */ }
    return id;
  }, []);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t));
    try { await apiPut(`/tasks/${id}`, data); } catch { /* offline */ }
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    let newDone: boolean | undefined;
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      newDone = !t.done;
      return { ...t, done: newDone, updated_at: new Date().toISOString() };
    }));
    if (newDone !== undefined) {
      try { await apiPut(`/tasks/${id}`, { done: newDone }); } catch { /* offline */ }
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try { await apiDelete(`/tasks/${id}`); } catch { /* offline */ }
  }, []);

  const createProject = useCallback(async (name: string, color: string) => {
    const id = `proj_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const now = new Date().toISOString();
    const newProj: Project = { id, name, color, created_at: now };
    setProjects(prev => [...prev, newProj]);
    try { await apiPost('/projects', newProj); } catch { /* offline */ }
    return id;
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try { await apiDelete(`/projects/${id}`); } catch { /* offline */ }
  }, []);

  return { tasks, projects, loading, fetchTasks, fetchProjects, createTask, updateTask, toggleTask, deleteTask, createProject, deleteProject };
}
