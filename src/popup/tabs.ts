import type { Tab } from './types';

/**
 * Safely normalise a raw Chrome tab into our internal `Tab` shape.
 * Falls back to safe defaults for any missing field.
 */
function toTab(raw: chrome.tabs.Tab): Tab {
  return {
    id: raw.id ?? -1,
    windowId: raw.windowId ?? -1,
    title: raw.title ?? '(untitled)',
    url: raw.url ?? '',
    favIconUrl: raw.favIconUrl ?? '',
    discarded: raw.discarded ?? false,
    active: raw.active ?? false,
    pinned: raw.pinned ?? false,
  };
}

/** Fetch all tabs across all windows. */
export async function getAllTabs(): Promise<Tab[]> {
  const rawTabs = await chrome.tabs.query({});
  return rawTabs.map(toTab);
}

/**
 * Switch to a tab and focus its window.
 * Both calls are needed: the tab might be in a background window.
 */
export async function switchToTab(tabId: number, windowId: number): Promise<void> {
  await chrome.windows.update(windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

/** Close a tab. Silently no-ops if the tab is already gone. */
export async function closeTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // Tab may have been closed by the user between render and click.
  }
}

/**
 * Suspend (discard) a tab to free memory.
 * Silently no-ops if the tab is already discarded on Chrome's end.
 */
export async function suspendTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.discard(tabId);
  } catch {
    // Tab may already be discarded or closing.
  }
}

/** Discard every non-active tab across all windows to free memory. */
export async function suspendAllTabs(): Promise<void> {
  const tabs = await getAllTabs();
  const results = await Promise.allSettled(
    tabs.filter((t) => !t.active).map((t) => chrome.tabs.discard(t.id)),
  );
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Failed to suspend a tab:', result.reason);
    }
  }
}

/** Open a URL in a new tab. Returns the created tab id. */
export async function createTab(url: string): Promise<number> {
  const tab = await chrome.tabs.create({ url });
  return tab.id!;
}
