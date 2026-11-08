import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { messages, type Language, type Theme, type TranslationKey } from '../../locales/messages';

interface PreferencesContextValue {
  language: Language;
  direction: 'rtl' | 'ltr';
  theme: Theme;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  t: (key: TranslationKey) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readStoredLanguage(): Language {
  try {
    return window.localStorage.getItem('mashrouak-language') === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem('mashrouak-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
const direction: PreferencesContextValue['direction'] =
  language === 'ar' ? 'rtl' : 'ltr';
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = direction;
    root.dataset.language = language;
    const skipLink = document.querySelector<HTMLAnchorElement>('.skip-link');
    if (skipLink) skipLink.textContent = messages[language]['a11y.skip'];
    try { window.localStorage.setItem('mashrouak-language', language); } catch { /* Storage may be unavailable in private contexts. */ }
  }, [direction, language]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === 'dark' ? '#102733' : '#142B3A';
    try { window.localStorage.setItem('mashrouak-theme', theme); } catch { /* Storage may be unavailable in private contexts. */ }
  }, [theme]);

  const setLanguage = useCallback((nextLanguage: Language) => setLanguageState(nextLanguage), []);
  const setTheme = useCallback((nextTheme: Theme) => setThemeState(nextTheme), []);
  const toggleLanguage = useCallback(() => setLanguageState((current) => current === 'ar' ? 'en' : 'ar'), []);
  const toggleTheme = useCallback(() => setThemeState((current) => current === 'light' ? 'dark' : 'light'), []);
  const t = useCallback((key: TranslationKey) => messages[language][key], [language]);

const value = useMemo<PreferencesContextValue>(
  () => ({
    language,
    direction,
    theme,
    isArabic: language === 'ar',
    setLanguage,
    setTheme,
    toggleLanguage,
    toggleTheme,
    t,
  }),
  [
    direction,
    language,
    setLanguage,
    setTheme,
    t,
    theme,
    toggleLanguage,
    toggleTheme,
  ],
);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}

export function useLocale() {
  const { language, direction, isArabic, setLanguage, toggleLanguage, t } = usePreferences();
  return { language, direction, isArabic, setLanguage, toggleLanguage, t };
}

export function useTheme() {
  const { theme, setTheme, toggleTheme } = usePreferences();
  return { theme, setTheme, toggleTheme };
}
