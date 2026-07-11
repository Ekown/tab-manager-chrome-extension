/** Normalised tab representation used throughout the popup. */
export interface Tab {
  id: number;
  windowId: number;
  title: string;
  url: string;
  favIconUrl: string;
  discarded: boolean;
  active: boolean;
  pinned: boolean;
}
