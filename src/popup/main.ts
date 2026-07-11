import { getAllTabs, switchToTab, closeTab, suspendTab } from './tabs';
import { renderTabList } from './renderer';

/** Entry point — fetches all tabs and sets up the UI. */
async function init(): Promise<void> {
  const tabs = await getAllTabs();
  const searchInput = document.getElementById('search') as HTMLInputElement;

  const render = (filter: string): void => {
    const list = document.getElementById('tab-list')!;
    list.innerHTML = '';
    renderTabList(list, tabs, filter);
  };

  searchInput.addEventListener('input', () => render(searchInput.value));

  render('');
}

init();
