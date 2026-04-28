// ══════��════════════════════════════════════════════════════════════
// COMMS API — Theophysics AI Communications Hub
// Targets: ai-comms-hub.davidokc28.workers.dev (Brief 03 fix pending)
// Schema: messages(id, channel, sender, content, timestamp, read_by)
//         channels(id, name, display_name, created_at, last_seen, orientation_complete, role)
// ═══════════════��═══════════════════════════════════════════════════

const COMMS_URL = 'https://ai-comms-hub.davidokc28.workers.dev';
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

function getBaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY_URL) || COMMS_URL;
}

function getToken(): string {
  return localStorage.getItem(STORAGE_KEY_TOKEN) || '';
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
  return commsGet<CommsChannel[]>('/channels');
}

export async function fetchStatus(): Promise<CommsChannel[]> {
  return commsGet<CommsChannel[]>('/status');
}

export async function fetchUnread(channel?: string): Promise<CommsMessage[]> {
  const ch = channel || getMyChannel();
  return commsGet<CommsMessage[]>(`/channel/${ch}/unread`);
}

export async function fetchMessages(channel: string, limit = 50): Promise<CommsMessage[]> {
  return commsGet<CommsMessage[]>(`/channel/${channel}?limit=${limit}`);
}

export async function fetchBroadcast(limit = 50): Promise<CommsMessage[]> {
  return commsGet<CommsMessage[]>(`/broadcast?limit=${limit}`);
}

export async function sendMessage(to: string, content: string, priority = 'normal', category = 'message'): Promise<unknown> {
  const from = getMyChannel();
  return commsPost(`/channel/${from}`, { to, content, priority, category });
}

export async function sendBroadcast(content: string, priority = 'high', category = 'session-log'): Promise<unknown> {
  const from = getMyChannel();
  return commsPost(`/channel/${from}`, { to: 'broadcast', content, priority, category });
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
