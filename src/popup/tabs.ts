import type { Tab } from './types';

/** Fetch all tabs across all windows. */
export async function getAllTabs(): Promise<Tab[]> {
  const rawTabs = await chrome.tabs.query({});
  return rawTabs.map((t) => ({
    id: t.id ?? -1,
    windowId: t.windowId ?? -1,
    title: t.title ?? '(untitled)',
    url: t.url ?? '',
    favIconUrl: t.favIconUrl ?? '',
    discarded: t.discarded ?? false,
    active: t.active ?? false,
    pinned: t.pinned ?? false,
  }));
}

/** Switch to a tab and focus its window. */
export async function switchToTab(tabId: number, windowId: number): Promise<void> {
  await chrome.windows.update(windowId, { focused: true });
  await chrome.tabs.update(tabId, { active: true });
}

/** Close a tab. */
export async function closeTab(tabId: number): Promise<void> {
  await chrome.tabs.remove(tabId);
}

/** Suspend (discard) a tab to free memory. */
export async function suspendTab(tabId: number): Promise<void> {
  await chrome.tabs.discard(tabId);
}
