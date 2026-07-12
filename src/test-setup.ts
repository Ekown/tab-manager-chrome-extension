import '@testing-library/jest-dom/vitest';
import { installMockChrome } from './__mocks__/chrome';

// Install mock chrome before any test modules are loaded,
// so module-level chrome.runtime.getURL() calls work.
installMockChrome();
