import {useComputedColorScheme, useMantineColorScheme} from '@mantine/core';
import classes from './AppLayout.module.scss';

interface ThemeToggleProps {
  /** Shows the choice as text beside the icon, as in the phone menu. */
  withLabel?: boolean;
}

export function ThemeToggle({withLabel = false}: ThemeToggleProps) {
  const {setColorScheme} = useMantineColorScheme();
  const scheme = useComputedColorScheme('light', {getInitialValueInEffect: false});
  const isDark = scheme === 'dark';
  const label = isDark ? 'Light mode' : 'Dark mode';

  return (
    <button
      type="button"
      className={withLabel ? classes.themeLabelled : classes.iconButton}
      aria-label={withLabel ? undefined : `Switch to ${label.toLowerCase()}`}
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isDark
          ? <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
          : <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />}
      </svg>
      {withLabel && label}
    </button>
  );
}
