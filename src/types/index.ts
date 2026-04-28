// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — Unified Personal Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

// ─── AXIOM TYPES (from existing dashboard) ───
export interface Axiom {
  id: string;
  title: string;
  chainPosition: number;
  stage: number;
  tier: 'primitive' | 'definition' | 'lemma' | 'theorem' | 'corollary';
  status: 'validated' | 'draft' | 'review' | 'critical';
  domain: string;
  category: 'axiom' | 'definition' | 'lemma' | 'theorem' | 'corollary';
  assumes: Assumption[];
  formalStatement: string;
  formalStatementMath?: string;
  mappings: Mapping[];
  enables: Enable[];
  objections: Objection[];
  defeatConditions: DefeatCondition[];
  analytics: Analytics;
  dependencies: string[];
  tags: string[];
}

export interface Assumption {
  id: string;
  title: string;
  description: string;
  validated: boolean;
}

export interface Mapping {
  domain: string;
  mapping: string;
  status: 'grounded' | 'scripture' | 'suggest' | 'empirical' | 'shannon';
  source: string;
}

export interface Enable {
  id: string;
  title: string;
  type: string;
  description: string;
}

export interface Objection {
  id: number;
  title: string;
  objection: string;
  response: string;
  suggestion?: string;
}

export interface DefeatCondition {
  condition: string;
  status: 'no-empirical-defeat' | 'open' | 'resolved';
}

export interface Analytics {
  contradictions: number;
  bridgeScore: number;
  crRating: 'Critical' | 'High' | 'Medium' | 'Low';
  cooccurrence: Cooccurrence[];
}

export interface Cooccurrence {
  name: string;
  percentage: number;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  items: CategoryItem[];
}

export interface CategoryItem {
  id: string;
  title: string;
  chainPosition: number;
  tier: string;
  status: string;
}

export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  type: 'current' | 'dependency' | 'dependent';
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'depends' | 'enables';
}

// ─── DASHBOARD DATA TYPES ───
export interface ClipboardItem {
  id: string;
  content: string;
  title?: string;
  tags: string[];
  pinned: boolean;
  slot?: number;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  folder?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
  items: TagItem[];
}

export interface TagItem {
  id: string;
  type: 'clip' | 'note' | 'file' | 'bookmark';
  title: string;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  folder: 'documents' | 'videos' | 'music' | 'pictures';
  size: number;
  createdAt: string;
  tags: string[];
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  tags: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  due?: string;
  time?: string;
  priority: '1' | '2' | '3' | '4';
  project?: string;
  desc?: string;
  alarm?: number;
  createdAt: string;
  doneAt?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

// ─── PROMPT TYPES ───
export interface Prompt {
  id: string;
  name: string;
  short: string;
  template: string;
  category: string;
  categoryLabel: string;
  color: string;
}

export interface PromptCategory {
  id: string;
  label: string;
  color: string;
  items: Prompt[];
}

// ─── CUSTOM PAGE TYPES ───
export interface CustomPage {
  id: string;
  title: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

// ─── SEARCH TYPES ───
export interface SearchResult {
  id: string;
  type: 'clip' | 'note' | 'file' | 'tag' | 'bookmark' | 'task' | 'axiom' | 'prompt';
  title: string;
  subtitle?: string;
  content?: string;
  tags: string[];
  matchedOn: string[];
  score: number;
}

// ─── AI TYPES ───
export type AiProvider = 'anthropic' | 'openai' | 'ollama' | 'xai';
export type AiRole = 'interface' | 'logic' | 'copilot';
export type AiRoleRouting = 'shared' | 'split';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  provider?: AiProvider;
  contextSummary?: string[];
}

export interface AiStreamCallbacks {
  onToken: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: string) => void;
}

// ─── VIEW TYPES ───
export type ViewType =
  | 'dashboard'
  | 'clipboard'
  | 'files'
  | 'tags'
  | 'notes'
  | 'ai'
  | 'settings'
  | 'axioms'
  | 'prompts'
  | 'research'
  | 'calendar'
  | 'comms'
  | 'tts'
  | 'custom'
  | 'deepcrawl'
  | 'search'
  | 'links';

export interface ViewConfig {
  id: ViewType;
  label: string;
  icon: string;
  color: string;
}
