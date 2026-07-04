import { useEffect } from 'react';

// globals.css gates dark-mode tokens behind a `.dark` class (`@custom-variant dark (&:is(.dark *))`)
// rather than a `prefers-color-scheme` media query, so it has to be toggled manually here.
export function useSystemTheme() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (isDark: boolean) => document.documentElement.classList.toggle('dark', isDark);

    applySystemTheme(media.matches);
    const onChange = (event: MediaQueryListEvent) => applySystemTheme(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
}
