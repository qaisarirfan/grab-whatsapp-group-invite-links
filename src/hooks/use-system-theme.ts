import { useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'themeMode';

const isDarkFor = (mode: ThemeMode, prefersDark: boolean) => mode === 'dark' || (mode === 'system' && prefersDark);

// globals.css gates dark-mode tokens behind a `.dark` class (`@custom-variant dark (&:is(.dark *))`)
// rather than a `prefers-color-scheme` media query, so applying a theme — OS-driven or a manual
// override — has to happen here in JS instead of pure CSS. The chosen mode persists across popup
// opens via chrome.storage.local.
export function useSystemTheme() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    chrome.storage.local
      .get(STORAGE_KEY)
      .then((stored) => {
        setMode((stored[STORAGE_KEY] as ThemeMode | undefined) ?? 'system');
      })
      .catch(() => {});
  }, []);

  // Re-runs whenever `mode` changes (manual override or the initial storage read) so `apply`
  // always reads the current mode — a mode captured only once on mount would let a later OS
  // theme change silently override a manual choice made in between.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.classList.toggle('dark', isDarkFor(mode, media.matches));

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  const changeMode = (next: ThemeMode) => {
    setMode(next);
    chrome.storage.local.set({ [STORAGE_KEY]: next }).catch(() => {});
  };

  return { mode, setMode: changeMode };
}
