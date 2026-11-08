import { Moon, Sun } from 'lucide-react';
import { useLocale, useTheme } from '../../app/providers/PreferencesProvider';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, toggleLanguage, t } = useLocale();
  const label = language === 'ar' ? 'AR' : 'EN';
  return (
    <button
      className={`preference-control preference-control--language${compact ? ' preference-control--compact' : ''}`}
      type="button"
      onClick={toggleLanguage}
      aria-label={t('a11y.switchLanguage')}
      title={t('a11y.switchLanguage')}
      lang={language}

    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === 'dark';
  return (
    <button
      className={`preference-control preference-control--theme${compact ? ' preference-control--compact' : ''}`}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('a11y.switchThemeLight') : t('a11y.switchThemeDark')}
      title={isDark ? t('a11y.switchThemeLight') : t('a11y.switchThemeDark')}
      aria-pressed={isDark}
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      <span className="sr-only">{isDark ? t('a11y.switchThemeLight') : t('a11y.switchThemeDark')}</span>
    </button>
  );
}
