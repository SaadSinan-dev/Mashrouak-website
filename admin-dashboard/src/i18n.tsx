import { useEffect, useState, type ReactNode } from "react";
import { copy } from "./copy";
import { Context } from "./locale-context";
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<"ar" | "en">(() =>
    localStorage.getItem("mashrouak-admin-language") === "en" ? "en" : "ar",
  );
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("mashrouak-admin-theme") === "dark" ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("mashrouak-admin-language", language);
  }, [language]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("mashrouak-admin-theme", theme);
  }, [theme]);
  return (
    <Context.Provider
      value={{
        language,
        ar: language === "ar",
        theme,
        toggleLanguage: () => setLanguage((l) => (l === "ar" ? "en" : "ar")),
        toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
        t: (key) => copy[language][key],
      }}
    >
      {children}
    </Context.Provider>
  );
}
