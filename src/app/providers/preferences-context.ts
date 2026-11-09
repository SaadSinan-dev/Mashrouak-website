import { createContext, useContext } from "react";
import type { Language, Theme, TranslationKey } from "../../locales/messages";
export interface PreferencesContextValue {
  language: Language;
  direction: "rtl" | "ltr";
  theme: Theme;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  t: (key: TranslationKey) => string;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(
  null,
);

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context)
    throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}

export function useLocale() {
  const { language, direction, isArabic, setLanguage, toggleLanguage, t } =
    usePreferences();
  return { language, direction, isArabic, setLanguage, toggleLanguage, t };
}

export function useTheme() {
  const { theme, setTheme, toggleTheme } = usePreferences();
  return { theme, setTheme, toggleTheme };
}
