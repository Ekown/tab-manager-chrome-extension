import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installMockChrome, createMockTab } from '../__mocks__/chrome';
import type { Tab } from './types';
import { getSessions, saveSession, deleteSession, restoreSession, captureSessionTabs } from './sessions';
import * as tabs from './tabs';

beforeEach(() => {
  installMockChrome();
  chrome.storage.local.get = vi.fn().mockResolvedValue({});
  chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);
});

const mockTabs: Tab[] = [
  { id: 1, windowId: 1, title: 'Example', url: 'https://example.com', favIconUrl: '', discarded: false, active: true, pinned: false },
  { id: 2, windowId: 1, title: 'Test', url: 'https://test.com', favIconUrl: '', discarded: false, active: false, pinned: false },
];

describe('captureSessionTabs', () => {
  it('captures valid http/https tabs', () => {
    const result = captureSessionTabs(mockTabs);
    expect(result).toEqual([
      { url: 'https://example.com', title: 'Example' },
      { url: 'https://test.com', title: 'Test' },
    ]);
  });

  it('excludes chrome:// and about: URLs', () => {
    const tabsWithInternal: Tab[] = [
      ...mockTabs,
      { id: 3, windowId: 1, title: 'Extensions', url: 'chrome://extensions', favIconUrl: '', discarded: false, active: false, pinned: false },
      { id: 4, windowId: 1, title: 'About', url: 'about:blank', favIconUrl: '', discarded: false, active: false, pinned: false },
    ];

    const result = captureSessionTabs(tabsWithInternal);
    expect(result).toHaveLength(2);
  });

  it('excludes tabs with empty url', () => {
    const tabsWithEmpty: Tab[] = [
      ...mockTabs,
      { id: 5, windowId: 1, title: 'Empty', url: '', favIconUrl: '', discarded: false, active: false, pinned: false },
    ];

    const result = captureSessionTabs(tabsWithEmpty);
    expect(result).toHaveLength(2);
  });
});

describe('saveSession and getSessions', () => {
  it('saves a session and persists it to storage', async () => {
    const session = await saveSession('My Session', [
      { url: 'https://a.com', title: 'A' },
    ]);

    expect(session.name).toBe('My Session');
    expect(session.tabs).toHaveLength(1);
    expect(session.id).toBeDefined();
    expect(session.createdAt).toBeGreaterThan(0);

    expect(chrome.storage.local.set).toHaveBeenCalledOnce();
  });

  it('retrieves saved sessions from storage', async () => {
    const saved = await saveSession('S1', [{ url: 'https://x.com', title: 'X' }]);
    chrome.storage.local.get = vi.fn().mockResolvedValue({
      'tab-hoarder-sessions': [saved],
    });

    const sessions = await getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].name).toBe('S1');
  });

  it('returns empty array when no sessions exist', async () => {
    chrome.storage.local.get = vi.fn().mockResolvedValue({});
    const sessions = await getSessions();
    expect(sessions).toEqual([]);
  });
});

describe('deleteSession', () => {
  it('removes a session by id', async () => {
    const s1 = await saveSession('S1', [{ url: 'https://a.com', title: 'A' }]);
    const s2 = await saveSession('S2', [{ url: 'https://b.com', title: 'B' }]);
    chrome.storage.local.get = vi.fn().mockResolvedValue({
      'tab-hoarder-sessions': [s1, s2],
    });

    await deleteSession(s1.id);

    const setCalls = (chrome.storage.local.set as ReturnType<typeof vi.fn>).mock
      .calls;
    const lastCall = setCalls[setCalls.length - 1][0];
    expect(lastCall['tab-hoarder-sessions']).toHaveLength(1);
    expect(lastCall['tab-hoarder-sessions'][0].id).toBe(s2.id);
  });
});

describe('restoreSession', () => {
  it('opens all tabs from the session', async () => {
    vi.spyOn(tabs, 'createTab').mockResolvedValue(1);

    const session = {
      id: 's1',
      name: 'Test',
      createdAt: Date.now(),
      tabs: [
        { url: 'https://a.com', title: 'A' },
        { url: 'https://b.com', title: 'B' },
      ],
    };

    const count = await restoreSession(session);
    expect(count).toBe(2);
  });

  it('returns count of successfully opened tabs', async () => {
    vi.spyOn(tabs, 'createTab')
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error('fail'));

    const session = {
      id: 's2',
      name: 'Partial',
      createdAt: Date.now(),
      tabs: [
        { url: 'https://a.com', title: 'A' },
        { url: 'https://b.com', title: 'B' },
      ],
    };

    const count = await restoreSession(session);
    expect(count).toBe(1);
  });
});
