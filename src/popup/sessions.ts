import type { Tab } from './types';
import { createTab } from './tabs';

const STORAGE_KEY = 'tab-hoarder-sessions';

/** A saved session — a named snapshot of tab URLs. */
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  tabs: { url: string; title: string }[];
}

/** Fetch all saved sessions from chrome.storage.local. */
export async function getSessions(): Promise<Session[]> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return (data[STORAGE_KEY] ?? []) as Session[];
}

/**
 * Save the current window's tabs as a new session.
 * Uses the active window if none specified.
 */
export async function saveSession(
  name: string,
  tabs: { url: string; title: string }[],
): Promise<Session> {
  const session: Session = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    tabs,
  };

  const existing = await getSessions();
  existing.push(session);
  await chrome.storage.local.set({ [STORAGE_KEY]: existing });

  return session;
}

/** Delete a session by its id. */
export async function deleteSession(sessionId: string): Promise<void> {
  const existing = await getSessions();
  const filtered = existing.filter((s) => s.id !== sessionId);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

/** Capture the current window's tabs into a Session-compatible array. */
export function captureSessionTabs(tabs: Tab[]): { url: string; title: string }[] {
  return tabs
    .filter((t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('about:'))
    .map((t) => ({ url: t.url, title: t.title }));
}

/**
 * Restore a session — open all its URLs in new tabs in a new window.
 * Returns the number of tabs successfully opened.
 */
export async function restoreSession(session: Session): Promise<number> {
  const results = await Promise.allSettled(
    session.tabs.map((t) => createTab(t.url)),
  );
  return results.filter((r) => r.status === 'fulfilled').length;
}
