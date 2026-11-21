'use client';
import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from './icons';

export type Theme = 'dark' | 'light';

// Runs before paint (inlined in <head>) so the page never flashes the wrong theme.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('ikpmr-theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export function ThemeToggle({ className = 'theme-toggle' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.add('theme-switching');
    root.dataset.theme = next;
    localStorage.setItem('ikpmr-theme', next);
    setTheme(next);
    window.dispatchEvent(new CustomEvent('ikpmr-theme', { detail: next }));
    window.setTimeout(() => root.classList.remove('theme-switching'), 320);
  };

  const label = theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap';
  return (
    <button type="button" className={className} onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  );
}
