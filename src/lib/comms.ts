// ══════��════════════════════════════════════════════════════════════
// COMMS API — Theophysics AI Communications Hub
// Targets: comms.faiththruphysics.com
// Schema: messages(id, channel, sender, content, timestamp, read_by)
//         channels(id, name, display_name, created_at, last_seen, orientation_complete, role)
// ═══════════════��═══════════════════════════════════════════════════

const COMMS_URL = 'https://comms.faiththruphysics.com';
const STORAGE_KEY_URL = 'pof_comms_url';
const STORAGE_KEY_TOKEN = 'pof_comms_token';
const STORAGE_KEY_CHANNEL = 'pof_comms_channel';

export interface CommsMessage {
  id: number;
  channel: string;
  sender: string;
  content: string;
  timestamp: string;
  read_by: string; // JSON array
}

export interface CommsChannel {
  id: number;
  name: string;
  display_name: string;
  created_at: string;
  last_seen: string;
  orientation_complete: number;
  role: string;
}

type ChannelsResponse = CommsChannel[] | { channels?: CommsChannel[] };
type MessagesResponse = CommsMessage[] | {
  channel?: string;
  pinned?: unknown[];
  unread?: CommsMessage[];
  messages?: CommsMessage[];
};

const TOKEN_BY_CHANNEL: Record<string, string> = {
  broadcast: 'theophysics-david-2026',
  general: 'theophysics-david-2026',
  david: 'theophysics-david-2026',
  opus: 'theophysics-opus-2026',
  sonnet: 'theophysics-sonnet-2026',
  codex: 'theophysics-codex-2026',
  haiku: 'theophysics-haiku-2026',
  gemini: 'theophysics-gemini-2026',
  gpt: 'theophysics-gpt-2026',
  kimi: 'theophysics-kimi-2026',
  'claude-desktop': 'theophysics-claude-desktop-2026',
  'claude-code': 'theophysics-claude-code-2026',
  cowork: 'theophysics-cowork-2026',
};

function getBaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY_URL) || COMMS_URL;
}

function getToken(): string {
  const stored = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (stored) return stored;
  return TOKEN_BY_CHANNEL[getMyChannel()] || 'theophysics-david-2026';
}

export function getMyChannel(): string {
  return localStorage.getItem(STORAGE_KEY_CHANNEL) || 'david';
}

export function setCommsConfig(url: string, token: string, channel: string) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url);
  if (token) localStorage.setItem(STORAGE_KEY_TOKEN, token);
  if (channel) localStorage.setItem(STORAGE_KEY_CHANNEL, channel);
}

async function commsGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(getBaseUrl() + path, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  if (!res.ok) throw new Error(`Comms ${res.status}: ${res.statusText}`);
  return res.json();
}

async function commsPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(getBaseUrl() + path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Comms ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Public API ───

export async function fetchChannels(): Promise<CommsChannel[]> {
  const data = await commsGet<ChannelsResponse>('/channels');
  return Array.isArray(data) ? data : data.channels || [];
}

export async function fetchStatus(): Promise<CommsChannel[]> {
  return commsGet<CommsChannel[]>('/status');
}

export async function fetchUnread(channel?: string): Promise<CommsMessage[]> {
  const ch = channel || getMyChannel();
  const data = await commsGet<MessagesResponse>(`/channel/${ch}/unread`);
  if (Array.isArray(data)) return data;
  return data.unread || data.messages || [];
}

export async function fetchMessages(channel: string, limit = 50): Promise<CommsMessage[]> {
  const data = await commsGet<MessagesResponse>(`/channel/${channel}?limit=${limit}`);
  if (Array.isArray(data)) return data;
  return data.messages || data.unread || [];
}

export async function fetchBroadcast(limit = 50): Promise<CommsMessage[]> {
  return fetchMessages('broadcast', limit);
}

export async function sendMessage(to: string, content: string, priority = 'normal', category = 'message'): Promise<unknown> {
  const from = getMyChannel();
  return commsPost(`/channel/${to}`, { sender: from, content, priority, category });
}

export async function sendBroadcast(content: string, priority = 'high', category = 'session-log'): Promise<unknown> {
  const from = getMyChannel();
  return commsPost('/broadcast', { sender: from, content, priority, category });
}

export async function markChannelRead(channel: string): Promise<boolean> {
  try {
    const res = await fetch(getBaseUrl() + `/channel/${channel}/mark-read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkCommsOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(getBaseUrl() + '/channels', {
      headers: { 'Authorization': `Bearer ${getToken()}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
