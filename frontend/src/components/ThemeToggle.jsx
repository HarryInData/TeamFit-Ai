import { useTheme } from '../context/useTheme';

export default function ThemeToggle({ inline = false }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`theme-toggle${inline ? ' theme-toggle--inline' : ''}`} role="group" aria-label="Color theme">
      <button type="button" className={theme === 'light' ? 'is-active' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
        <span aria-hidden="true">☼</span><span>Light</span>
      </button>
      <button type="button" className={theme === 'dark' ? 'is-active' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
        <span aria-hidden="true">◐</span><span>Dark</span>
      </button>
    </div>
  );
}
