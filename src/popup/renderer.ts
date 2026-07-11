import type { Tab } from './types';
import { switchToTab, closeTab, suspendTab } from './tabs';

/**
 * Render a filtered list of tabs into the given parent element.
 * Each tab shows a favicon, title, truncated URL, and action buttons.
 */
export function renderTabList(
  parent: HTMLElement,
  tabs: Tab[],
  filter: string,
): void {
  const query = filter.toLowerCase();
  const filtered = tabs.filter(
    (t) =>
      t.title.toLowerCase().includes(query) ||
      t.url.toLowerCase().includes(query),
  );

  const FALLBACK_ICON = chrome.runtime.getURL('icons/icon-16.png');
  const fragment = document.createDocumentFragment();

  for (const tab of filtered) {
    const li = document.createElement('li');
    li.className = `tab-item${tab.discarded ? ' discarded' : ''}`;
    li.dataset.tabId = String(tab.id);
    li.dataset.windowId = String(tab.windowId);

    /* ——— Favicon ——— */
    const img = document.createElement('img');
    img.className = 'tab-favicon';
    img.src = isValidUrl(tab.favIconUrl) ? tab.favIconUrl : FALLBACK_ICON;
    img.alt = '';
    img.addEventListener('error', () => {
      img.src = FALLBACK_ICON;
    });
    li.appendChild(img);

    /* ——— Info block ——— */
    const info = document.createElement('div');
    info.className = 'tab-info';

    const titleEl = document.createElement('div');
    titleEl.className = 'tab-title';
    titleEl.textContent = tab.title;
    info.appendChild(titleEl);

    const urlEl = document.createElement('div');
    urlEl.className = 'tab-url';
    urlEl.textContent = tab.url;
    info.appendChild(urlEl);

    li.appendChild(info);

    /* ——— Action buttons ——— */
    const actions = document.createElement('div');
    actions.className = 'tab-actions';

    const suspendBtn = document.createElement('button');
    suspendBtn.className = 'btn-suspend';
    suspendBtn.textContent = tab.discarded ? 'Reload' : 'Suspend';
    suspendBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (tab.discarded) {
        switchToTab(tab.id, tab.windowId);
      } else {
        suspendTab(tab.id);
      }
    });
    actions.appendChild(suspendBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    actions.appendChild(closeBtn);

    li.appendChild(actions);

    /* ——— Click to switch ——— */
    li.addEventListener('click', () => switchToTab(tab.id, tab.windowId));

    fragment.appendChild(li);
  }

  parent.appendChild(fragment);
}

/**
 * Only http/https URLs are valid for favicons in extension pages.
 * `file://`, `chrome://`, `about:`, etc. will be blocked by CSP.
 */
function isValidUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
