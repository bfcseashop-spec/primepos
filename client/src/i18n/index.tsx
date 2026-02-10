import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { en } from "./en";
import { km } from "./km";
import { zh } from "./zh";

export type Language = "en" | "km" | "zh";

export const LANGUAGES: { code: Language; label: string; nativeLabel: string; flag: string }[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "EN" },
  { code: "km", label: "Khmer", nativeLabel: "ភាសាខ្មែរ", flag: "KH" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", flag: "ZH" },
];

const translations: Record<Language, typeof en> = { en, km: km as typeof en, zh: zh as typeof en };

function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem("clinicpos_language");
    if (saved && ["en", "km", "zh"].includes(saved)) return saved as Language;
  } catch {}
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem("clinicpos_language", lang); } catch {}
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations[language], key);
    if (value === key) {
      value = getNestedValue(translations.en, key);
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v));
      });
    }
    return value;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return context;
}
