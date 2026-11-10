import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  messages,
  type Language,
  type Theme,
  type TranslationKey,
} from "../../locales/messages";
import { useSettings } from "./content-context";
import {
  PreferencesContext,
  type PreferencesContextValue,
} from "./preferences-context";
function readStoredLanguage(): Language | null {
  try {
    const query = new URLSearchParams(window.location.search);
    const previewLanguage = query.has("preview")
      ? query.get("preview_language")
      : null;
    if (previewLanguage === "ar" || previewLanguage === "en")
      return previewLanguage;
    const stored = window.localStorage.getItem("mashrouak-language");
    return stored === "en" || stored === "ar" ? stored : null;
  } catch {
    return null;
  }
}

function readStoredTheme(): Theme | null {
  try {
    const query = new URLSearchParams(window.location.search);
    const previewTheme = query.has("preview")
      ? query.get("preview_theme")
      : null;
    if (previewTheme === "light" || previewTheme === "dark")
      return previewTheme;
    const stored = window.localStorage.getItem("mashrouak-theme");
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    return null;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [selectedLanguage, setLanguageState] = useState<Language | null>(
    readStoredLanguage,
  );
  const [selectedTheme, setThemeState] = useState<Theme | null>(
    readStoredTheme,
  );
  const language = selectedLanguage ?? settings?.defaultLanguage ?? "ar";
  const theme = selectedTheme ?? settings?.defaultTheme ?? "light";
  const direction: PreferencesContextValue["direction"] =
    language === "ar" ? "rtl" : "ltr";
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = direction;
    root.dataset.language = language;
    const skipLink = document.querySelector<HTMLAnchorElement>(".skip-link");
    if (skipLink) skipLink.textContent = messages[language]["a11y.skip"];
    try {
      if (
        selectedLanguage &&
        !new URLSearchParams(window.location.search).has("preview")
      )
        window.localStorage.setItem("mashrouak-language", selectedLanguage);
    } catch {
      /* Storage may be unavailable in private contexts. */
    }
  }, [direction, language, selectedLanguage]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (themeColor)
      themeColor.content = theme === "dark" ? "#102733" : "#142B3A";
    try {
      if (
        selectedTheme &&
        !new URLSearchParams(window.location.search).has("preview")
      )
        window.localStorage.setItem("mashrouak-theme", selectedTheme);
    } catch {
      /* Storage may be unavailable in private contexts. */
    }
  }, [theme, selectedTheme]);

  const setLanguage = useCallback(
    (nextLanguage: Language) => setLanguageState(nextLanguage),
    [],
  );
  const setTheme = useCallback(
    (nextTheme: Theme) => setThemeState(nextTheme),
    [],
  );
  const toggleLanguage = useCallback(
    () => setLanguageState(language === "ar" ? "en" : "ar"),
    [language],
  );
  const toggleTheme = useCallback(
    () => setThemeState(theme === "light" ? "dark" : "light"),
    [theme],
  );
  const t = useCallback(
    (key: TranslationKey) =>
      settings?.translations[language][key] ?? messages[language][key],
    [language, settings],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      language,
      direction,
      theme,
      isArabic: language === "ar",
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
  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
