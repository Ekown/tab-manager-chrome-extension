import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installMockChrome, createMockTab } from '../__mocks__/chrome';
import App from './App';

beforeEach(() => {
  installMockChrome();

  // Provide mock tab data
  chrome.tabs.query = vi.fn().mockResolvedValue([
    createMockTab({ id: 1, title: 'Alpha', url: 'https://alpha.com', active: true }),
    createMockTab({ id: 2, title: 'Beta', url: 'https://beta.com', active: false }),
    createMockTab({ id: 3, title: 'Gamma', url: 'https://gamma.com', active: false, discarded: true }),
  ]);

  chrome.storage.local.get = vi.fn().mockResolvedValue({});
  chrome.storage.local.set = vi.fn().mockResolvedValue(undefined);
});

async function renderApp() {
  render(<App />);
  // waitFor to let the useEffect fetch settle
  await screen.findByText('Alpha');
}

describe('App', () => {
  it('renders the title and search input', async () => {
    await renderApp();

    expect(screen.getByText('Tab Hoarder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tabs…')).toBeInTheDocument();
  });

  it('renders all tabs from chrome.tabs.query', async () => {
    await renderApp();

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('filters tabs when typing in the search box', async () => {
    await renderApp();

    const search = screen.getByPlaceholderText('Search tabs…');
    fireEvent.change(search, { target: { value: 'beta' } });

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
  });

  it('clears filter and shows all tabs again', async () => {
    await renderApp();

    const search = screen.getByPlaceholderText('Search tabs…');
    fireEvent.change(search, { target: { value: 'beta' } });
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('displays Suspend button for active tabs and Reload for discarded', async () => {
    await renderApp();

    const suspendButtons = screen.getAllByText('Suspend');
    // Beta is non-discarded non-active → Suspend
    // Alpha is active → Suspend
    expect(suspendButtons.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Reload')).toBeInTheDocument();
  });

  it('calls switchToTab when clicking a tab item', async () => {
    await renderApp();

    const alphaItem = screen.getByText('Alpha').closest('li')!;
    fireEvent.click(alphaItem);

    await waitFor(() => {
      expect(chrome.windows.update).toHaveBeenCalled();
    });
    expect(chrome.tabs.update).toHaveBeenCalled();
  });

  it('calls closeTab when clicking the close button', async () => {
    await renderApp();

    const closeButtons = screen.getAllByText('✕');
    fireEvent.click(closeButtons[0]);

    expect(chrome.tabs.remove).toHaveBeenCalled();
  });

  it('calls suspendTab when clicking Suspend button', async () => {
    await renderApp();

    // Two non-discarded tabs have "Suspend"; use the first one
    const suspendButtons = screen.getAllByText('Suspend');
    fireEvent.click(suspendButtons[0]);

    expect(chrome.tabs.discard).toHaveBeenCalled();
  });

  it('renders the Suspend All button', async () => {
    await renderApp();
    expect(screen.getByText('Suspend All')).toBeInTheDocument();
  });

  it('renders the sessions toggle section', async () => {
    await renderApp();
    expect(screen.getByText(/Saved Sessions/)).toBeInTheDocument();
  });

  it('shows saved sessions list when expanded', async () => {
    chrome.storage.local.get = vi.fn().mockResolvedValue({
      'tab-hoarder-sessions': [
        { id: 's1', name: 'Work', createdAt: Date.now(), tabs: [{ url: 'https://work.com', title: 'Work' }] },
      ],
    });

    await renderApp();
    fireEvent.click(screen.getByText(/Saved Sessions/));

    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Restore')).toBeInTheDocument();
  });

  it('can save a new session', async () => {
    await renderApp();
    fireEvent.click(screen.getByText(/Saved Sessions/));

    const input = screen.getByPlaceholderText('Session name…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My Saved' } });
    // Wait for React state to flush
    await screen.findByDisplayValue('My Saved');
    fireEvent.keyDown(input, { key: 'Enter' });

    // saveSession calls set asynchronously
    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('shows empty state when no sessions exist', async () => {
    await renderApp();
    fireEvent.click(screen.getByText(/Saved Sessions/));

    expect(screen.getByText('No saved sessions yet.')).toBeInTheDocument();
  });

  it('does not save session with empty name', async () => {
    await renderApp();
    fireEvent.click(screen.getByText(/Saved Sessions/));

    const input = screen.getByPlaceholderText('Session name…');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // set should not have been called again — the save was skipped
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('calls restore and delete on session actions', async () => {
    chrome.storage.local.get = vi.fn().mockResolvedValue({
      'tab-hoarder-sessions': [
        { id: 's1', name: 'Saved', createdAt: Date.now(), tabs: [{ url: 'https://saved.com', title: 'Saved' }] },
      ],
    });

    await renderApp();
    fireEvent.click(screen.getByText(/Saved Sessions/));

    // Click Restore
    fireEvent.click(screen.getByText('Restore'));
    await waitFor(() => {
      expect(chrome.tabs.create).toHaveBeenCalled();
    });

    // Click Delete (session delete button, not tab close)
    const deleteBtn = screen.getAllByText('✕');
    fireEvent.click(deleteBtn[deleteBtn.length - 1]); // last ✕ is the session delete
    // Delete triggers set to persist the filtered list
    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  it('renders tab count and date in session meta', async () => {
    chrome.storage.local.get = vi.fn().mockResolvedValue({
      'tab-hoarder-sessions': [
        { id: 's1', name: 'Multi', createdAt: Date.now(), tabs: [{ url: 'https://a.com', title: 'A' }, { url: 'https://b.com', title: 'B' }] },
      ],
    });

    await renderApp();
    fireEvent.click(screen.getByText(/Saved Sessions/));

    expect(screen.getByText(/2 tabs/)).toBeInTheDocument();
  });

  it('handles favicon load error by falling back to extension icon', async () => {
    await renderApp();

    const imgs = document.querySelectorAll('.tab-favicon');
    expect(imgs.length).toBeGreaterThan(0);

    // Trigger onError on the first img
    fireEvent.error(imgs[0]);
    // After error, src should be the fallback URL
    expect((imgs[0] as HTMLImageElement).src).toContain('chrome-extension://');
  });

  it('skips save when all tabs are internal (chrome://)', async () => {
    // Override query to return only chrome:// tabs
    chrome.tabs.query = vi.fn().mockResolvedValue([
      createMockTab({ id: 1, title: 'Extensions', url: 'chrome://extensions', favIconUrl: '' }),
    ]);

    render(<App />);
    await screen.findByText('Extensions');
    fireEvent.click(screen.getByText(/Saved Sessions/));

    const input = screen.getByPlaceholderText('Session name…') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'No Save' } });
    await screen.findByDisplayValue('No Save');
    // Press "Save" button instead of Enter to cover the onClick path
    fireEvent.click(screen.getByText('Save'));

    // set should not have been called — no valid tabs to capture
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('renders Reload on discarded tab and calls onSwitch', async () => {
    await renderApp();

    // Gamma is discarded, so its button says "Reload"
    const reloadBtn = screen.getByText('Reload');
    expect(reloadBtn).toBeInTheDocument();

    fireEvent.click(reloadBtn);

    // Clicking Reload on a discarded tab calls switchToTab
    await waitFor(() => {
      expect(chrome.windows.update).toHaveBeenCalled();
    });
  });

  it('triggers save via onKeyDown Enter handler', async () => {
    chrome.tabs.query = vi.fn().mockResolvedValue([
      createMockTab({ id: 1, title: 'Tab', url: 'https://tab.com' }),
    ]);

    render(<App />);
    await screen.findByText('Tab');
    fireEvent.click(screen.getByText(/Saved Sessions/));

    // Wait for render, then fire keyDown simulating Enter
    const input = screen.getByPlaceholderText('Session name…');
    fireEvent.change(input, { target: { value: 'Key Enter' } });
    await screen.findByDisplayValue('Key Enter');

    // Use fireEvent with the key property explicitly set
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });
});
