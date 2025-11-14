import { Moon, Sun } from 'lucide-react';

import { useTheme } from '../hooks/useTheme';

const ThemeToggle = (): JSX.Element => {
  const [theme, toggleTheme] = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white transition-colors hover:bg-accent dark:border-border dark:bg-primary dark:hover:bg-primary/90"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};

export default ThemeToggle;
