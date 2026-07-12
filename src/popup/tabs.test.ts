import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installMockChrome, createMockTab } from '../__mocks__/chrome';
import { getAllTabs, switchToTab, closeTab, suspendTab, suspendAllTabs, createTab } from './tabs';

beforeEach(() => {
  installMockChrome();
});

describe('getAllTabs', () => {
  it('returns normalised tabs from chrome.tabs.query', async () => {
    chrome.tabs.query = vi.fn().mockResolvedValue([
      createMockTab({ id: 1, title: 'Tab A', url: 'https://a.com' }),
      createMockTab({ id: 2, title: 'Tab B', url: 'https://b.com', discarded: true }),
    ]);

    const tabs = await getAllTabs();

    expect(tabs).toHaveLength(2);
    expect(tabs[0].id).toBe(1);
    expect(tabs[0].title).toBe('Tab A');
    expect(tabs[0].discarded).toBe(false);
    expect(tabs[1].id).toBe(2);
    expect(tabs[1].discarded).toBe(true);
  });

  it('provides safe defaults for missing fields', async () => {
    chrome.tabs.query = vi.fn().mockResolvedValue([
      { id: undefined, windowId: undefined, title: undefined, url: undefined, favIconUrl: undefined, discarded: undefined, active: undefined, pinned: undefined } as unknown as chrome.tabs.Tab,
    ]);

    const tabs = await getAllTabs();

    expect(tabs[0]).toEqual({
      id: -1,
      windowId: -1,
      title: '(untitled)',
      url: '',
      favIconUrl: '',
      discarded: false,
      active: false,
      pinned: false,
    });
  });

  it('returns empty array when no tabs exist', async () => {
    chrome.tabs.query = vi.fn().mockResolvedValue([]);
    const tabs = await getAllTabs();
    expect(tabs).toEqual([]);
  });
});

describe('switchToTab', () => {
  it('focuses the window then activates the tab', async () => {
    await switchToTab(5, 2);

    expect(chrome.windows.update).toHaveBeenCalledWith(2, { focused: true });
    expect(chrome.tabs.update).toHaveBeenCalledWith(5, { active: true });
  });
});

describe('closeTab', () => {
  it('removes the tab', async () => {
    await closeTab(3);
    expect(chrome.tabs.remove).toHaveBeenCalledWith(3);
  });

  it('silently swallows error when tab is already gone', async () => {
    chrome.tabs.remove = vi.fn().mockRejectedValue(new Error('Tab not found'));
    await expect(closeTab(999)).resolves.toBeUndefined();
  });
});

describe('suspendTab', () => {
  it('discards the tab', async () => {
    await suspendTab(4);
    expect(chrome.tabs.discard).toHaveBeenCalledWith(4);
  });

  it('silently swallows error when tab cannot be discarded', async () => {
    chrome.tabs.discard = vi.fn().mockRejectedValue(new Error('Cannot discard'));
    await expect(suspendTab(999)).resolves.toBeUndefined();
  });
});

describe('suspendAllTabs', () => {
  it('discards every non-active tab', async () => {
    chrome.tabs.query = vi.fn().mockResolvedValue([
      createMockTab({ id: 1, active: true }),
      createMockTab({ id: 2, active: false }),
      createMockTab({ id: 3, active: false }),
    ]);

    await suspendAllTabs();

    expect(chrome.tabs.discard).toHaveBeenCalledTimes(2);
    expect(chrome.tabs.discard).toHaveBeenCalledWith(2);
    expect(chrome.tabs.discard).toHaveBeenCalledWith(3);
    expect(chrome.tabs.discard).not.toHaveBeenCalledWith(1);
  });

  it('does nothing when all tabs are active', async () => {
    chrome.tabs.query = vi.fn().mockResolvedValue([
      createMockTab({ id: 1, active: true }),
    ]);

    await suspendAllTabs();

    expect(chrome.tabs.discard).not.toHaveBeenCalled();
  });

  it('handles individual suspend failures gracefully', async () => {
    chrome.tabs.query = vi.fn().mockResolvedValue([
      createMockTab({ id: 1, active: false }),
      createMockTab({ id: 2, active: false }),
    ]);
    // First discard succeeds, second fails
    chrome.tabs.discard = vi.fn()
      .mockResolvedValueOnce(createMockTab({ id: 1, discarded: true }))
      .mockRejectedValueOnce(new Error('Cannot discard'));

    // Should not throw despite the rejection
    await expect(suspendAllTabs()).resolves.toBeUndefined();
  });
});

describe('createTab', () => {
  it('creates a tab with the given url and returns its id', async () => {
    chrome.tabs.create = vi.fn().mockResolvedValue(createMockTab({ id: 42 }));

    const id = await createTab('https://example.com');

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com' });
    expect(id).toBe(42);
  });
});
