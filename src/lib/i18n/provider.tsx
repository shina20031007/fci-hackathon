"use client";
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
  type ReactElement,
} from "react";
import { Globe, ChevronDown } from "lucide-react";
import french from "./fr.json";
import chinese from "./zh-CN.json";
import additions from "./additions.json";
export type Locale = "en" | "fr" | "zh-CN";
const names = { en: "English", fr: "Français", "zh-CN": "简体中文" };
const dictionaries: Record<Locale, Record<string, string>> = {
  en: {},
  fr: french,
  "zh-CN": chinese,
};
export function translate(text: string, locale: Locale): string {
  if (locale === "en") return text;
  const key = text.replace(/\s+/g, " ").trim();
  const extra = additions as Record<string, { fr: string; "zh-CN": string }>;
  const translated = extra[key]?.[locale] ?? dictionaries[locale][key];
  return translated ? text.replace(text.trim(), translated) : text;
}
const LanguageContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: "en", setLocale: () => {} });
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: (text: string) => translate(text, context.locale) };
}
let sessionLocale: Locale | undefined;
function languageSnapshot(): Locale {
  if (sessionLocale) return sessionLocale;
  try {
    const saved = localStorage.getItem("civictrace:locale");
    return saved === "fr" || saved === "zh-CN" ? saved : "en";
  } catch {
    return "en";
  }
}
function subscribeLanguage(callback: () => void) {
  window.addEventListener("civictrace-language", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("civictrace-language", callback);
    window.removeEventListener("storage", callback);
  };
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLanguage,
    languageSnapshot,
    () => "en" as Locale,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function setLocale(value: Locale) {
    sessionLocale = value;
    try {
      localStorage.setItem("civictrace:locale", value);
    } catch {
      /* The session still supports language switching. */
    }
    window.dispatchEvent(new Event("civictrace-language"));
  }
  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}
/** Translate React presentation trees only. Never mutate stored records, form values, URLs, or the DOM. */
function localize(node: ReactNode, locale: Locale): ReactNode {
  if (typeof node === "string") return translate(node, locale);
  if (Array.isArray(node)) return node.map((child) => localize(child, locale));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const props = element.props;
  if (
    props.translate === "no" ||
    props["data-original"] ||
    element.type === Localized
  )
    return node;
  const translated: Record<string, unknown> = {};
  for (const key of [
    "aria-label",
    "aria-description",
    "placeholder",
    "title",
    "description",
    "eyebrow",
    "label",
    "empty",
    "alt",
  ]) {
    if (typeof props[key] === "string")
      translated[key] = translate(props[key], locale);
  }
  // An option's submitted value must remain the canonical enum even when its label changes.
  if (
    element.type === "option" &&
    props.value === undefined &&
    typeof props.children === "string"
  )
    translated.value = props.children;
  if (props.children !== undefined) {
    const children = localize(props.children as ReactNode, locale);
    // Preserve React's original keys and static sibling positions across RSC refreshes.
    // Variadic children retain static-child semantics without inventing component keys.
    return Array.isArray(children)
      ? cloneElement(element, translated, ...children)
      : cloneElement(element, translated, children);
  }
  return cloneElement(element, translated);
}
export function Localized({ children }: { children: ReactNode }) {
  const { locale } = useLanguage();
  return localize(children, locale);
}
export function LanguageSelector() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <label className="language-selector">
      <Globe size={18} aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Language")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {Object.entries(names).map(([value, name]) => (
          <option key={value} value={value} lang={value}>
            {name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}
export function TranslationNotice() {
  const { locale, t } = useLanguage();
  return (
    <p className="translation-notice">
      {t(
        "Independent civic information prototype. Not an official government website.",
      )}
      {locale !== "en" && (
        <>
          {" "}
          {t(
            "Unofficial translation. Original official documents and quotations remain authoritative; consult them before acting.",
          )}
        </>
      )}
    </p>
  );
}
export function LocalizedDate({
  value,
  timeZone = "America/Toronto",
  includeTime = false,
}: {
  value: string | null;
  timeZone?: string;
  includeTime?: boolean;
}) {
  const { locale, t } = useLanguage();
  if (!value) return t("Not verified");
  return new Intl.DateTimeFormat(
    locale === "en" ? "en-CA" : locale === "fr" ? "fr-CA" : "zh-CN",
    includeTime
      ? { dateStyle: "medium", timeStyle: "short", timeZone }
      : { year: "numeric", month: "short", day: "numeric", timeZone },
  ).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
}
