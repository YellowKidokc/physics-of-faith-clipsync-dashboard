// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED SEARCH — Search across all panels (clips, notes, files, tags, bookmarks, prompts)
// ═══════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import type { 
  SearchResult, 
  ClipboardItem, 
  Note, 
  FileItem, 
  Tag, 
  Bookmark,
  Task,
  Axiom,
  Prompt
} from '@/types';

interface SearchableData {
  clips: ClipboardItem[];
  notes: Note[];
  files: FileItem[];
  tags: Tag[];
  bookmarks: Bookmark[];
  tasks: Task[];
  axioms: Axiom[];
  prompts: Prompt[];
}

interface UseUnifiedSearchOptions {
  query: string;
  data: SearchableData;
  filters?: {
    clips?: boolean;
    notes?: boolean;
    files?: boolean;
    tags?: boolean;
    bookmarks?: boolean;
    tasks?: boolean;
    axioms?: boolean;
    prompts?: boolean;
  };
  limit?: number;
}

function calculateScore(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Exact match gets highest score
  if (lowerText === lowerQuery) return 100;
  
  // Starts with query gets high score
  if (lowerText.startsWith(lowerQuery)) return 80;
  
  // Contains query as whole word gets good score
  const wordRegex = new RegExp(`\\b${lowerQuery}\\b`, 'i');
  if (wordRegex.test(lowerText)) return 60;
  
  // Contains query gets base score
  if (lowerText.includes(lowerQuery)) return 40;
  
  return 0;
}

function findMatches(text: string, query: string): string[] {
  const matches: string[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  if (lowerText === lowerQuery) matches.push('exact');
  if (lowerText.startsWith(lowerQuery)) matches.push('starts with');
  const wordRegex = new RegExp(`\\b${lowerQuery}\\b`, 'i');
  if (wordRegex.test(lowerText)) matches.push('word match');
  if (lowerText.includes(lowerQuery)) matches.push('contains');
  
  return matches;
}

export function useUnifiedSearch({ 
  query, 
  data, 
  filters = {},
  limit = 50 
}: UseUnifiedSearchOptions): SearchResult[] {
  
  const allFiltersEnabled = Object.keys(filters).length === 0;
  
  const searchClips = allFiltersEnabled || filters.clips !== false;
  const searchNotes = allFiltersEnabled || filters.notes !== false;
  const searchFiles = allFiltersEnabled || filters.files !== false;
  const searchTags = allFiltersEnabled || filters.tags !== false;
  const searchBookmarks = allFiltersEnabled || filters.bookmarks !== false;
  const searchTasks = allFiltersEnabled || filters.tasks !== false;
  const searchAxioms = allFiltersEnabled || filters.axioms !== false;
  const searchPrompts = allFiltersEnabled || filters.prompts !== false;

  return useMemo(() => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const searchTerm = query.trim();
    
    // Search clips
    if (searchClips) {
      data.clips.forEach(clip => {
        const titleScore = calculateScore(clip.title || clip.content.slice(0, 50), searchTerm);
        const contentScore = calculateScore(clip.content, searchTerm);
        const tagScore = Math.max(...clip.tags.map(t => calculateScore(t, searchTerm)), 0);
        
        const maxScore = Math.max(titleScore, contentScore, tagScore);
        if (maxScore > 0) {
          results.push({
            id: clip.id,
            type: 'clip',
            title: clip.title || clip.content.slice(0, 50) + (clip.content.length > 50 ? '...' : ''),
            content: clip.content.slice(0, 200),
            tags: clip.tags,
            matchedOn: findMatches(clip.content, searchTerm),
            score: maxScore + (clip.pinned ? 10 : 0),
          });
        }
      });
    }
    
    // Search notes
    if (searchNotes) {
      data.notes.forEach(note => {
        const titleScore = calculateScore(note.title, searchTerm);
        const contentScore = calculateScore(note.content, searchTerm);
        const tagScore = Math.max(...note.tags.map(t => calculateScore(t, searchTerm)), 0);
        
        const maxScore = Math.max(titleScore, contentScore, tagScore);
        if (maxScore > 0) {
          results.push({
            id: note.id,
            type: 'note',
            title: note.title,
            content: note.content.slice(0, 200),
            tags: note.tags,
            matchedOn: findMatches(note.title + ' ' + note.content, searchTerm),
            score: maxScore,
          });
        }
      });
    }
    
    // Search files
    if (searchFiles) {
      data.files.forEach(file => {
        const nameScore = calculateScore(file.name, searchTerm);
        const pathScore = calculateScore(file.path, searchTerm);
        const tagScore = Math.max(...file.tags.map(t => calculateScore(t, searchTerm)), 0);
        
        const maxScore = Math.max(nameScore, pathScore, tagScore);
        if (maxScore > 0) {
          results.push({
            id: file.id,
            type: 'file',
            title: file.name,
            subtitle: file.path,
            tags: file.tags,
            matchedOn: findMatches(file.name, searchTerm),
            score: maxScore,
          });
        }
      });
    }
    
    // Search tags
    if (searchTags) {
      data.tags.forEach(tag => {
        const nameScore = calculateScore(tag.name, searchTerm);
        if (nameScore > 0) {
          results.push({
            id: tag.id,
            type: 'tag',
            title: tag.name,
            subtitle: `${tag.count} items`,
            tags: [tag.name],
            matchedOn: findMatches(tag.name, searchTerm),
            score: nameScore,
          });
        }
      });
    }
    
    // Search bookmarks
    if (searchBookmarks) {
      data.bookmarks.forEach(bookmark => {
        const titleScore = calculateScore(bookmark.title, searchTerm);
        const urlScore = calculateScore(bookmark.url, searchTerm);
        const categoryScore = calculateScore(bookmark.category, searchTerm);
        const tagScore = Math.max(...bookmark.tags.map(t => calculateScore(t, searchTerm)), 0);
        
        const maxScore = Math.max(titleScore, urlScore, categoryScore, tagScore);
        if (maxScore > 0) {
          results.push({
            id: bookmark.id,
            type: 'bookmark',
            title: bookmark.title,
            subtitle: bookmark.url,
            tags: [...bookmark.tags, bookmark.category],
            matchedOn: findMatches(bookmark.title + ' ' + bookmark.url, searchTerm),
            score: maxScore,
          });
        }
      });
    }
    
    // Search tasks
    if (searchTasks) {
      data.tasks.forEach(task => {
        const titleScore = calculateScore(task.title, searchTerm);
        const projectScore = task.project ? calculateScore(task.project, searchTerm) : 0;
        
        const maxScore = Math.max(titleScore, projectScore);
        if (maxScore > 0) {
          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.project,
            tags: task.project ? [task.project] : [],
            matchedOn: findMatches(task.title, searchTerm),
            score: maxScore + (task.done ? -5 : 5),
          });
        }
      });
    }
    
    // Search axioms
    if (searchAxioms) {
      data.axioms.forEach(axiom => {
        const idScore = calculateScore(axiom.id, searchTerm);
        const titleScore = calculateScore(axiom.title, searchTerm);
        const contentScore = calculateScore(axiom.formalStatement, searchTerm);
        const tagScore = Math.max(...axiom.tags.map(t => calculateScore(t, searchTerm)), 0);
        
        const maxScore = Math.max(idScore, titleScore, contentScore, tagScore);
        if (maxScore > 0) {
          results.push({
            id: axiom.id,
            type: 'axiom',
            title: `${axiom.id} — ${axiom.title}`,
            content: axiom.formalStatement.slice(0, 200),
            tags: axiom.tags,
            matchedOn: findMatches(axiom.title + ' ' + axiom.formalStatement, searchTerm),
            score: maxScore,
          });
        }
      });
    }
    
    // Search prompts
    if (searchPrompts) {
      data.prompts.forEach(prompt => {
        const nameScore = calculateScore(prompt.name, searchTerm);
        const shortScore = calculateScore(prompt.short, searchTerm);
        const templateScore = calculateScore(prompt.template, searchTerm);
        const categoryScore = calculateScore(prompt.categoryLabel, searchTerm);
        
        const maxScore = Math.max(nameScore, shortScore, templateScore, categoryScore);
        if (maxScore > 0) {
          results.push({
            id: prompt.id,
            type: 'prompt',
            title: prompt.name,
            subtitle: prompt.short,
            content: prompt.template.slice(0, 200),
            tags: [prompt.categoryLabel],
            matchedOn: findMatches(prompt.name + ' ' + prompt.short + ' ' + prompt.template, searchTerm),
            score: maxScore,
          });
        }
      });
    }
    
    // Sort by score descending, then limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [query, data, searchClips, searchNotes, searchFiles, searchTags, searchBookmarks, searchTasks, searchAxioms, searchPrompts, limit]);
}

// Hook for debounced search
export function useDebouncedSearch(
  query: string,
  delay: number = 150
): string {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [query, delay]);
  
  return debouncedQuery;
}

import { useState, useEffect } from 'react';

export function useSearchHighlighter(text: string, query: string): string {
  return useMemo(() => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }, [text, query]);
}
