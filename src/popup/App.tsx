import { useState, useEffect } from 'react';
import type { Tab } from './types';
import { getAllTabs, switchToTab, closeTab, suspendTab } from './tabs';

const FALLBACK_ICON = chrome.runtime.getURL('icons/icon-16.png');

function isValidUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getAllTabs().then(setTabs);
  }, []);

  const query = filter.toLowerCase();
  const filtered = tabs.filter(
    (t) =>
      t.title.toLowerCase().includes(query) ||
      t.url.toLowerCase().includes(query),
  );

  return (
    <div className="app">
      <header>
        <h1>Tab Hoarder</h1>
        <input
          className="search-input"
          type="text"
          placeholder="Search tabs…"
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </header>
      <ul className="tab-list">
        {filtered.map((tab) => (
          <TabItem
            key={`${tab.windowId}-${tab.id}`}
            tab={tab}
            onSwitch={() => switchToTab(tab.id, tab.windowId)}
            onClose={() => closeTab(tab.id)}
            onSuspend={() => suspendTab(tab.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function TabItem({
  tab,
  onSwitch,
  onClose,
  onSuspend,
}: {
  tab: Tab;
  onSwitch: () => void;
  onClose: () => void;
  onSuspend: () => void;
}) {
  return (
    <li
      className={`tab-item${tab.discarded ? ' discarded' : ''}`}
      onClick={onSwitch}
    >
      <img
        className="tab-favicon"
        src={isValidUrl(tab.favIconUrl) ? tab.favIconUrl : FALLBACK_ICON}
        alt=""
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = FALLBACK_ICON;
        }}
      />
      <div className="tab-info">
        <div className="tab-title">{tab.title}</div>
        <div className="tab-url">{tab.url}</div>
      </div>
      <div className="tab-actions">
        <button
          className="btn-suspend"
          onClick={(e) => {
            e.stopPropagation();
            if (tab.discarded) onSwitch();
            else onSuspend();
          }}
        >
          {tab.discarded ? 'Reload' : 'Suspend'}
        </button>
        <button
          className="btn-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ✕
        </button>
      </div>
    </li>
  );
}
