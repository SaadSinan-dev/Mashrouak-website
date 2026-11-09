import { createContext, useContext } from "react";
import type { CopyKey } from "./copy";
export type { CopyKey } from "./copy";
type I18n = {
  language: "ar" | "en";
  ar: boolean;
  theme: "light" | "dark";
  toggleLanguage: () => void;
  toggleTheme: () => void;
  t: (key: CopyKey) => string;
};
export const Context = createContext<I18n | null>(null);
export function useLocale() {
  const value = useContext(Context);
  if (!value) throw new Error("LocaleProvider required");
  return value;
}
