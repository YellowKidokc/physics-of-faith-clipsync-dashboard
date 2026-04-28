// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD STORE — Central data management for all panels
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import type { 
  ClipboardItem, 
  Note, 
  FileItem, 
  Tag, 
  Bookmark, 
  Task, 
  Project,
  ViewType,
  Prompt,
  CustomPage
} from '@/types';

// ─── STORAGE KEYS ───
const STORAGE_KEYS = {
  clips: 'pof2828_clips',
  notes: 'pof2828_notes',
  tags: 'pof2828_tags',
  files: 'pof2828_files',
  bookmarks: 'pof2828_bookmarks',
  tasks: 'pof2828_tasks',
  projects: 'pof2828_projects',
  summaries: 'pof2828_summaries',
  prompts: 'pof2828_prompts',
  customPages: 'pof2828_custom_pages',
  settings: 'pof2828_settings',
  view: 'pof2828_current_view',
};

// ─── DEFAULT PROMPTS ───
const DEFAULT_PROMPTS: Prompt[] = [
  // CORE 8
  { id: 'probe', name: '/PROBE', short: 'Structural integrity test', template: `/PROBE: {claim}\n\nFind the exact hold-or-break point. Name the failure mode with precision. If it holds → explain nontriviality (what SHOULD break it but doesn't?).`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  { id: 'deeper', name: '/DEEPER', short: '3+ layers deep', template: `/DEEPER: {topic}\n\nGo minimum 3 layers:\n1. Observation →\n2. Pattern →\n3. LAW\n\nMost AI stops at layer 2. The value is layer 3. If you can't reach L3 → say so.`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  { id: 'integrate', name: '/INTEGRATE', short: 'Structural isomorphism', template: `/INTEGRATE: {domain_a} ↔ {domain_b}\n\nFind structural isomorphism — shared logical architecture, NOT metaphorical similarity. Real iso → constrains predictions in both domains. If analogy only → flag as analogy.`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  { id: 'east', name: '/EAST', short: 'Steelman objection', template: `/EAST: {position}\n\nSteelman the strongest objection. The version that makes a serious physicist or theologian pause. Articulate it as well as the best advocates would. Then let the idea respond.`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  { id: 'north', name: '/NORTH', short: 'Return to bedrock', template: `/NORTH\n\nReturn to bedrock. What do we KNOW?\nAnchors: grace, entropy, curvature, will, Logos, Master Equation.\nUse when drifting from ground truth.`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  { id: 'connect', name: '/CONNECT', short: 'Bridge unlikely domains', template: `/CONNECT: {thing_a} ↔ {thing_b}\n\nBridge things that shouldn't relate. The value IS the bridge, not the domains. If it survives /PROBE → real. If not → discard and say so.`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  { id: 'chain', name: '/CHAIN', short: 'Find weakest link', template: `/CHAIN: {logic_sequence}\n\nWalk the full logic chain. ID the single weakest link. Explain what breaks downstream if it fails. (Complement to /PROBE — /PROBE tests the whole, /CHAIN finds the vulnerability.)`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  { id: 'blindspot', name: '/BLINDSPOT', short: 'What are we not seeing?', template: `/BLINDSPOT: {topic_or_framework}\n\nWhat is DL or the framework NOT seeing? What's unquestioned? What assumption is unexamined? Should produce discomfort if working correctly.`, category: 'core8', categoryLabel: 'CORE 8', color: '#f59e0b' },
  // EXTENDED
  { id: 'west', name: '/WEST', short: 'Structural forensics', template: `/WEST: {target}\n\nStructural forensics underneath. Funding, affiliations, unstated assumptions, the unsaid. Not conspiracy — structural.`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'south', name: '/SOUTH', short: 'Unexpected connection', template: `/SOUTH: {problem}\n\nUnexpected connection from a different field. Untried analogy. An approach nobody took.`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'brain', name: '/BRAIN', short: 'Profile & categorize', template: `/BRAIN: {target}\n\nProfile target (person, idea, institution) → categorize → initial hypothesis.\nSetup for full 360°: /BRAIN + /E + /W + /N + /S`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'risks', name: '/RISKS', short: 'Failure modes', template: `/RISKS: {claim_or_plan}\n\nRight in form AND wrong in substance? Edge cases where logic inverts? Silent assumptions masquerading as conclusions?`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'feedback', name: '/FEEDBACK', short: 'Direct critique', template: `/FEEDBACK: {work}\n\nDirect. Redundancy → name it. Circular → trace the exact loop. Don't soften.`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'verify', name: '/VERIFY', short: 'Check sources & math', template: `/VERIFY: {claim}\n\nCheck sources, math, framework consistency. State confidence: HIGH / MED / LOW + reason.`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'metric', name: '/METRIC', short: 'Quantify it', template: `/METRIC: {claim}\n\nNumbers or relative magnitudes → abstract claims. How much info compressed? How many independent falsification paths? If not quantifiable → state the blocker.`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'decide', name: '/DECIDE', short: 'Options + tradeoffs', template: `/DECIDE: {decision}\n\nOptions + tradeoffs weighted vs axioms. Recommend + show full reasoning chain.`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'scen', name: '/SCEN', short: 'Causal chains', template: `/SCEN: {situation}\n\nWalk causal chains (best AND worst). Identify bifurcation points. What triggers the split?`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  { id: 'pattern', name: '/PATTERN', short: 'Cross-domain repetition', template: `/PATTERN: {observation}\n\nFind repetition across domains. Same structure in physics AND scripture → name it. Then /PROBE. If it doesn't survive → discard.`, category: 'extended', categoryLabel: 'EXTENDED', color: '#3b82f6' },
  // CHAINS
  { id: 'ch_integrity', name: '/PROBE → /CHAIN', short: 'Integrity → vulnerability', template: `/PROBE → /CHAIN: {claim}\n\nFirst test structural integrity of the whole, then walk the chain to find the specific vulnerability point.`, category: 'chains', categoryLabel: 'CHAINS', color: '#10b981' },
  { id: 'ch_360', name: '/BRAIN → /E → /W → /N → /S', short: 'Full 360° analysis', template: `/BRAIN → /EAST → /WEST → /NORTH → /SOUTH: {target}\n\nFull 360°:\n1. Profile & categorize\n2. Steelman opposition\n3. Hidden structural forces\n4. First principles anchor\n5. Novel unexpected angle`, category: 'chains', categoryLabel: 'CHAINS', color: '#10b981' },
  { id: 'ch_law', name: '/DEEPER → /INTEGRATE', short: 'Extract law → merge domains', template: `/DEEPER → /INTEGRATE: {observation}\n\nExtract the law (3 layers min), then merge across physics ∧ theology ∧ consciousness.`, category: 'chains', categoryLabel: 'CHAINS', color: '#10b981' },
  { id: 'ch_fail', name: '/RISKS → /SCEN', short: 'Failure modes → simulate', template: `/RISKS → /SCEN: {plan_or_claim}\n\nSurface failure modes, then simulate their causal trajectories.`, category: 'chains', categoryLabel: 'CHAINS', color: '#10b981' },
  { id: 'ch_crit', name: '/PROBE → /EAST → /FEEDBACK', short: 'Test → object → critique', template: `/PROBE → /EAST → /FEEDBACK: {idea}\n\nStructural test → strongest objection → direct unfiltered critique.`, category: 'chains', categoryLabel: 'CHAINS', color: '#10b981' },
  { id: 'ch_novel', name: '/CONNECT → /BLINDSPOT', short: 'Novel bridge → reveal missed', template: `/CONNECT → /BLINDSPOT: {topic}\n\nForce a novel bridge, then reveal what's been missed.`, category: 'chains', categoryLabel: 'CHAINS', color: '#10b981' },
  { id: 'ch_paper', name: '/PATTERN → /DEEPER → /PAPER', short: 'Pattern → law → formal write', template: `/PATTERN → /DEEPER → /PAPER: {observation}\n\nCross-domain pattern → extract the law → write it formally.`, category: 'chains', categoryLabel: 'CHAINS', color: '#10b981' },
  // OPS
  { id: 'save', name: '/SAVE', short: 'Capture session state', template: `/SAVE\n\nCapture: what was discussed, decided, changed, next steps.\nRoute → Claude memory + DAILY_LOG bucket (10176) + Obsidian daily note.`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  { id: 'recall', name: '/RECALL', short: 'Reconstruct from stored', template: `/RECALL: {topic_or_id}\n\nReconstruct from stored data. Flag what's retrieved vs inferred.`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  { id: 'deep_save', name: '/DEEP', short: 'Breakthroughs ONLY', template: `/DEEP\n\nBreakthroughs ONLY. Record:\n- What shifted\n- Why it matters\n- What it connects to\n- What it invalidated\nRoute → MCP memory + Obsidian canonical.`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  { id: 'title', name: '/TITLE', short: 'Name this session', template: `/TITLE\n\nName this session. Memorable + specific.\nGood: 'Storm-Calming-as-Wavefunction-Collapse'\nBad: 'Physics_Discussion'`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  { id: 'log', name: '/LOG', short: 'Operational status', template: `/LOG\n\nOperational: done, files touched, pending.\nRoute → DAILY_LOG bucket (10176).`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  { id: 'context', name: '/CONTEXT', short: 'Set the stage', template: `/CONTEXT\n\nEstablish: project, directory, database, current state.\nSet the stage before building.`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  { id: 'paper', name: '/PAPER', short: 'Academic output', template: `/PAPER: {topic}\n\nAcademic structure + Theophysics voice.\nRequired: abstract, framework positioning, formal argument, implications, falsification criteria.\nUUID citations per standard.`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  { id: 'workflow', name: '/WORKFLOW', short: 'Define executable steps', template: `/WORKFLOW: {objective}\n\nDefine: objective, steps, dependencies, exit criteria.\nExecutable, NOT aspirational. If a step isn't actionable → rewrite it.`, category: 'ops', categoryLabel: 'OPS', color: '#a855f7' },
  // CUSTOM
  { id: 'cust_audit', name: 'Axiom Audit', short: 'Scan axiom set for gaps', template: `Run a full audit of the current axiom set. For each axiom:\n1. Does it carry unique predictive weight, or is it derivable from others?\n2. Are there gaps — phenomena the framework addresses but no axiom covers?\n3. Rank by load-bearing importance to the Master Equation.\n\nFlag any axiom that's decorative rather than structural.`, category: 'custom', categoryLabel: 'CUSTOM', color: '#ef4444' },
  { id: 'cust_kickstart', name: 'Paper Kickstart', short: 'Bootstrap a Logos Paper', template: `I'm starting Logos Paper {number}: {title}\n\nBefore we write anything:\n1. What's the ONE thing this paper must prove?\n2. What prior papers does it depend on?\n3. What's the strongest objection a physicist would raise?\n4. What's the strongest objection a theologian would raise?\n5. Draft a 3-sentence abstract.`, category: 'custom', categoryLabel: 'CUSTOM', color: '#ef4444' },
  { id: 'cust_stress', name: 'Framework Stress Test', short: 'Try to break the framework', template: `Pick the 3 most vulnerable points in the Theophysics framework and attack them. Not strawmen — the real weak spots.\n\nFor each:\n- State the attack clearly\n- Rate damage if it lands (1-10)\n- Show whether the framework can absorb, adapt, or would break\n\nThen: is there a single point of failure that would collapse everything?`, category: 'custom', categoryLabel: 'CUSTOM', color: '#ef4444' },
];

// ─── DEFAULT DATA ───
const DEFAULT_CLIPS: ClipboardItem[] = [
  {
    id: 'clip_1',
    content: 'χ = ∭(G·M·E·S·T·K·R·Q·F·C) dxdydt',
    title: 'Master Equation',
    tags: ['theophysics', 'equation', 'pinned'],
    pinned: true,
    slot: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'clip_2',
    content: '/PROBE: {claim}\n\nFind the exact hold-or-break point. Name the failure mode with precision.',
    title: '/PROBE Command',
    tags: ['prompt', 'core8'],
    pinned: true,
    slot: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'clip_3',
    content: 'claude --dangerously-skip-permissions',
    title: 'Claude CLI Launch',
    tags: ['code', 'cli'],
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_NOTES: Note[] = [
  {
    id: 'note_1',
    title: 'Dashboard Ideas',
    content: '# Dashboard Ideas\n\n- Unified search across all panels\n- Mobile-first design\n- Dark theme with gold accents\n- AI integration',
    tags: ['ideas', 'dashboard'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    folder: 'General',
  },
  {
    id: 'note_2',
    title: 'Theophysics Framework',
    content: '# Theophysics Framework\n\nPhysics and theology are dual projections of a single coherent reality.',
    tags: ['theophysics', 'research'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    folder: 'Research',
  },
];

const DEFAULT_TAGS: Tag[] = [
  { id: 'tag_1', name: 'theophysics', color: '#F2C94C', count: 5, items: [] },
  { id: 'tag_2', name: 'research', color: '#4F8EF7', count: 3, items: [] },
  { id: 'tag_3', name: 'code', color: '#4ECB71', count: 2, items: [] },
  { id: 'tag_4', name: 'pinned', color: '#E05C6E', count: 2, items: [] },
  { id: 'tag_5', name: 'prompt', color: '#9B7FE8', count: 1, items: [] },
];

const DEFAULT_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm_1',
    title: 'PEAR Lab',
    url: 'https://pearlab.icrl.org',
    category: 'Research',
    tags: ['physics', 'consciousness'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bm_2',
    title: 'Global Consciousness Project',
    url: 'https://noosphere.princeton.edu',
    category: 'Research',
    tags: ['consciousness', 'data'],
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task_1',
    title: 'Build unified dashboard',
    done: false,
    due: new Date().toISOString().split('T')[0],
    priority: '1',
    project: 'proj_today',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task_2',
    title: 'Integrate AI agent',
    done: false,
    priority: '2',
    project: 'proj_work',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_PROJECTS: Project[] = [
  { id: 'proj_today', name: 'TODAY', color: '#E05C6E' },
  { id: 'proj_work', name: 'Work', color: '#4F8EF7' },
  { id: 'proj_research', name: 'Research', color: '#9B7FE8' },
  { id: 'proj_home', name: 'Home', color: '#4ECB71' },
];

const DEFAULT_CUSTOM_PAGES: CustomPage[] = [
  {
    id: 'page_1',
    title: 'Example Page',
    html: '<div style="padding:20px"><h1>Hello World</h1><p>This is a custom HTML page.</p></div>',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── LOAD FROM STORAGE ───
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
  }
  return defaultValue;
}

// ─── SAVE TO STORAGE ───
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
}

// ─── MAIN HOOK ───
export function useDashboardStore() {
  // ─── STATE ───
  const [clips, setClips] = useState<ClipboardItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedCustomPage, setSelectedCustomPage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // ─── LOAD ON MOUNT ───
  useEffect(() => {
    setClips(loadFromStorage(STORAGE_KEYS.clips, DEFAULT_CLIPS));
    setNotes(loadFromStorage(STORAGE_KEYS.notes, DEFAULT_NOTES));
    setTags(loadFromStorage(STORAGE_KEYS.tags, DEFAULT_TAGS));
    setFiles(loadFromStorage(STORAGE_KEYS.files, []));
    setBookmarks(loadFromStorage(STORAGE_KEYS.bookmarks, DEFAULT_BOOKMARKS));
    setTasks(loadFromStorage(STORAGE_KEYS.tasks, DEFAULT_TASKS));
    setProjects(loadFromStorage(STORAGE_KEYS.projects, DEFAULT_PROJECTS));
    setPrompts(loadFromStorage(STORAGE_KEYS.prompts, DEFAULT_PROMPTS));
    setCustomPages(loadFromStorage(STORAGE_KEYS.customPages, DEFAULT_CUSTOM_PAGES));
    setSummaries(loadFromStorage(STORAGE_KEYS.summaries, {}));
    setCurrentView(loadFromStorage(STORAGE_KEYS.view, 'dashboard'));
    setIsLoaded(true);
  }, []);

  // ─── SAVE ON CHANGE ───
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.clips, clips); }, [clips, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.notes, notes); }, [notes, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.tags, tags); }, [tags, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.files, files); }, [files, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.bookmarks, bookmarks); }, [bookmarks, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.tasks, tasks); }, [tasks, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.projects, projects); }, [projects, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.prompts, prompts); }, [prompts, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.customPages, customPages); }, [customPages, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.summaries, summaries); }, [summaries, isLoaded]);
  useEffect(() => { if (isLoaded) saveToStorage(STORAGE_KEYS.view, currentView); }, [currentView, isLoaded]);

  // ─── CLIP ACTIONS ───
  const addClip = useCallback((content: string, title?: string, clipTags: string[] = [], slot?: number) => {
    const newClip: ClipboardItem = {
      id: `clip_${Date.now()}`,
      content,
      title,
      tags: clipTags,
      pinned: false,
      slot,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setClips(prev => [newClip, ...prev]);
    return newClip.id;
  }, []);

  const updateClip = useCallback((id: string, updates: Partial<ClipboardItem>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
  }, []);

  const deleteClip = useCallback((id: string) => {
    setClips(prev => prev.filter(c => c.id !== id));
  }, []);

  const togglePinClip = useCallback((id: string) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned, updatedAt: new Date().toISOString() } : c));
  }, []);

  // ─── NOTE ACTIONS ───
  const addNote = useCallback((title: string, content: string, noteTags: string[] = []) => {
    const newNote: Note = {
      id: `note_${Date.now()}`,
      title,
      content,
      tags: noteTags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    return newNote.id;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  // ─── TAG ACTIONS ───
  const addTag = useCallback((name: string, color: string = '#F2C94C') => {
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name,
      color,
      count: 0,
      items: [],
    };
    setTags(prev => [...prev, newTag]);
    return newTag.id;
  }, []);

  const deleteTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── BOOKMARK ACTIONS ───
  const addBookmark = useCallback((title: string, url: string, category: string, bmTags: string[] = []) => {
    const newBookmark: Bookmark = {
      id: `bm_${Date.now()}`,
      title,
      url,
      category,
      tags: bmTags,
      createdAt: new Date().toISOString(),
    };
    setBookmarks(prev => [newBookmark, ...prev]);
    return newBookmark.id;
  }, []);

  const updateBookmark = useCallback((id: string, updates: Partial<Bookmark>) => {
    setBookmarks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  // ─── TASK ACTIONS ───
  const addTask = useCallback((title: string, project?: string, priority: Task['priority'] = '4', due?: string) => {
    const newTask: Task = {
      id: `task_${Date.now()}`,
      title,
      done: false,
      priority,
      project,
      due,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask.id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── PROJECT ACTIONS ───
  const addProject = useCallback((name: string, color: string) => {
    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name,
      color,
    };
    setProjects(prev => [...prev, newProject]);
    return newProject.id;
  }, []);

  const deleteProject = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.project === id ? { ...t, project: undefined } : t));
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── PROMPT ACTIONS ───
  const addPrompt = useCallback((prompt: Omit<Prompt, 'id'>) => {
    const newPrompt: Prompt = {
      ...prompt,
      id: `prompt_${Date.now()}`,
    };
    setPrompts(prev => [...prev, newPrompt]);
    return newPrompt.id;
  }, []);

  const deletePrompt = useCallback((id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── CUSTOM PAGE ACTIONS ───
  const addCustomPage = useCallback((title: string, html: string) => {
    const newPage: CustomPage = {
      id: `page_${Date.now()}`,
      title,
      html,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCustomPages(prev => [...prev, newPage]);
    return newPage.id;
  }, []);

  const updateCustomPage = useCallback((id: string, updates: Partial<CustomPage>) => {
    setCustomPages(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
  }, []);

  const deleteCustomPage = useCallback((id: string) => {
    setCustomPages(prev => prev.filter(p => p.id !== id));
  }, []);

  // ─── SUMMARY ACTIONS ───
  const setDailySummary = useCallback((date: string, text: string) => {
    setSummaries(prev => ({ ...prev, [`sum_${date}`]: text }));
  }, []);

  // ─── NAVIGATION ───
  const navigateTo = useCallback((view: ViewType, pageId?: string) => {
    setCurrentView(view);
    if (pageId) setSelectedCustomPage(pageId);
  }, []);

  // ─── STATS ───
  const todayStr = new Date().toISOString().split('T')[0];
  const stats = {
    totalClips: clips.length,
    pinnedClips: clips.filter(c => c.pinned).length,
    totalNotes: notes.length,
    totalTags: tags.length,
    totalBookmarks: bookmarks.length,
    totalTasks: tasks.length,
    pendingTasks: tasks.filter(t => !t.done).length,
    todayTasks: tasks.filter(t => !t.done && t.due === todayStr).length,
    inboxTasks: tasks.filter(t => !t.done && !t.project).length,
    totalPrompts: prompts.length,
    totalCustomPages: customPages.length,
  };

  // ─── EXPORT/IMPORT ───
  const exportData = useCallback(() => {
    const data = {
      clips,
      notes,
      tags,
      bookmarks,
      tasks,
      projects,
      prompts,
      customPages,
      summaries,
      exported: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pof2828-export-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [clips, notes, tags, bookmarks, tasks, projects, prompts, customPages, summaries]);

  const importData = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.clips) setClips(data.clips);
      if (data.notes) setNotes(data.notes);
      if (data.tags) setTags(data.tags);
      if (data.bookmarks) setBookmarks(data.bookmarks);
      if (data.tasks) setTasks(data.tasks);
      if (data.projects) setProjects(data.projects);
      if (data.prompts) setPrompts(data.prompts);
      if (data.customPages) setCustomPages(data.customPages);
      if (data.summaries) setSummaries(data.summaries);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }, []);

  return {
    // Data
    clips,
    notes,
    tags,
    files,
    bookmarks,
    tasks,
    projects,
    prompts,
    customPages,
    summaries,
    currentView,
    selectedCustomPage,
    stats,
    isLoaded,
    
    // Actions
    addClip,
    updateClip,
    deleteClip,
    togglePinClip,
    addNote,
    updateNote,
    deleteNote,
    addTag,
    deleteTag,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addProject,
    deleteProject,
    addPrompt,
    deletePrompt,
    addCustomPage,
    updateCustomPage,
    deleteCustomPage,
    setDailySummary,
    navigateTo,
    exportData,
    importData,
    setClips,
    setNotes,
    setTags,
    setFiles,
    setBookmarks,
    setTasks,
    setProjects,
    setPrompts,
    setCustomPages,
    setSummaries,
    setSelectedCustomPage,
  };
}
