import { vi } from 'vitest';

/** Creates a minimal tab fixture with defaults. */
export function createMockTab(overrides: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    windowId: 1,
    title: 'Test Tab',
    url: 'https://example.com',
    favIconUrl: 'https://example.com/favicon.ico',
    discarded: false,
    active: false,
    pinned: false,
    highlighted: false,
    incognito: false,
    selected: false,
    autoDiscardable: true,
    groupId: -1,
    index: 0,
    openerTabId: undefined,
    status: 'complete',
    ...overrides,
  } as chrome.tabs.Tab;
}

export function createMockChrome() {
  const mockTabs = {
    query: vi.fn().mockResolvedValue([] as chrome.tabs.Tab[]),
    update: vi.fn().mockResolvedValue(createMockTab()),
    remove: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn().mockResolvedValue(createMockTab({ discarded: true })),
    create: vi.fn().mockResolvedValue(createMockTab()),
  };

  const mockWindows = {
    update: vi.fn().mockResolvedValue({ id: 1, state: 'normal', focused: true, top: 0, left: 0, width: 800, height: 600, incognito: false, type: 'normal', alwaysOnTop: false } as chrome.windows.Window),
    getAll: vi.fn().mockResolvedValue([{ id: 1, state: 'normal', focused: true, top: 0, left: 0, width: 800, height: 600, incognito: false, type: 'normal', alwaysOnTop: false }] as chrome.windows.Window[]),
  };

  const mockStorage = {
    local: {
      get: vi.fn().mockResolvedValue({} as Record<string, unknown>),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
      getBytesInUse: vi.fn().mockResolvedValue(0),
    },
  };

  const mockRuntime = {
    getURL: vi.fn().mockImplementation((path: string) => `chrome-extension://abc/${path}`),
  };

  return {
    tabs: mockTabs,
    windows: mockWindows,
    storage: mockStorage,
    runtime: mockRuntime,
  };
}

/** Set `chrome` on `globalThis` for test environments. */
export function installMockChrome(): void {
  const mock = createMockChrome();
  (globalThis as Record<string, unknown>).chrome = mock;
}
