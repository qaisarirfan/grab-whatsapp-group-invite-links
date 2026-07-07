// Deep imports (instead of `from 'lucide-react'`) avoid pulling the whole icon set into the
// bundle — lucide-react's barrel file isn't tree-shaken by this webpack config and previously
// added ~1.5MB to vendors.js for 3 icons.
import MonitorIcon from 'lucide-react/dist/esm/icons/monitor.mjs';
import MoonIcon from 'lucide-react/dist/esm/icons/moon.mjs';
import SunIcon from 'lucide-react/dist/esm/icons/sun.mjs';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { ThemeMode } from '@src/hooks/use-system-theme';

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const MODE_ICON: Record<ThemeMode, typeof SunIcon> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const MODE_LABEL: Record<ThemeMode, string> = {
  system: 'Matching your system theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

interface PropTypes {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

function ThemeToggle({ mode, onChange }: PropTypes) {
  const Icon = MODE_ICON[mode];
  const nextMode = NEXT_MODE[mode];

  return (
    <Tooltip>
      <TooltipTrigger render={<Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(nextMode)} />}>
        <Icon />
        <span className="sr-only">{`Theme: ${MODE_LABEL[mode]}. Click to switch to ${MODE_LABEL[nextMode].toLowerCase()}.`}</span>
      </TooltipTrigger>
      <TooltipContent>{`${MODE_LABEL[mode]} — click to switch to ${MODE_LABEL[nextMode].toLowerCase()}`}</TooltipContent>
    </Tooltip>
  );
}

export default ThemeToggle;
