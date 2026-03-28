import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { Language, messages } from "../i18n/messages";

type TranslateVars = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  t: (key: string, vars?: TranslateVars) => string;
  locale: string;
};

const DEFAULT_LANGUAGE: Language = "en";
const LOCALES: Record<Language, string> = {
  uk: "uk-UA",
  en: "en-US",
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getValueByPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, source);
}

function interpolate(template: string, vars?: TranslateVars) {
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = DEFAULT_LANGUAGE;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: string, vars?: TranslateVars) => {
      const translated = getValueByPath(messages[language], key);
      if (typeof translated !== "string") return key;
      return interpolate(translated, vars);
    };

    return {
      language,
      t,
      locale: LOCALES[language],
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
