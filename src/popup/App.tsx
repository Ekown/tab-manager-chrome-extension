import { useState, useEffect, useCallback } from 'react';
import type { Tab } from './types';
import type { Session } from './sessions';
import { getAllTabs, switchToTab, closeTab, suspendTab, suspendAllTabs } from './tabs';
import { getSessions, saveSession, deleteSession, restoreSession, captureSessionTabs } from './sessions';

const FALLBACK_ICON = chrome.runtime.getURL('icons/icon-16.png');

function isValidUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [filter, setFilter] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [allTabs, allSessions] = await Promise.all([
      getAllTabs(),
      getSessions(),
    ]);
    setTabs(allTabs);
    setSessions(allSessions);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSession = async () => {
    const name = sessionName.trim();
    if (!name) return;
    const sessionTabs = captureSessionTabs(tabs);
    if (sessionTabs.length === 0) return;
    await saveSession(name, sessionTabs);
    setSessionName('');
    setSessions(await getSessions());
    setSessionsOpen(true);
  };

  const handleRestoreSession = async (session: Session) => {
    await restoreSession(session);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    setSessions(await getSessions());
  };

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

      <div className="toolbar">
        <button className="btn-suspend-all" onClick={suspendAllTabs}>
          Suspend All
        </button>
      </div>

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

      {/* ── Sessions Section ── */}
      <div className="sessions-section">
        <button
          className="sessions-toggle"
          onClick={() => setSessionsOpen(!sessionsOpen)}
        >
          {sessionsOpen ? '▾' : '▸'} Saved Sessions ({sessions.length})
        </button>

        {sessionsOpen && (
          <div className="sessions-content">
            <div className="save-session-row">
              <input
                className="session-name-input"
                type="text"
                placeholder="Session name…"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSession();
                }}
              />
              <button className="btn-save-session" onClick={handleSaveSession}>
                Save
              </button>
            </div>

            {sessions.length === 0 && (
              <p className="sessions-empty">No saved sessions yet.</p>
            )}

            {sessions.map((s) => (
              <div key={s.id} className="session-item">
                <div className="session-info">
                  <div className="session-name">{s.name}</div>
                  <div className="session-meta">
                    {s.tabs.length} tab{s.tabs.length !== 1 ? 's' : ''} · {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="session-actions">
                  <button
                    className="btn-restore"
                    onClick={() => handleRestoreSession(s)}
                  >
                    Restore
                  </button>
                  <button
                    className="btn-delete-session"
                    onClick={() => handleDeleteSession(s.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
