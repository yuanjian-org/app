import { useRouter } from "next/router";
import { useState, useEffect } from "react";

export function useTranslation() {
  const router = useRouter();
  const locale = router?.locale || "zh";
  const defaultLocale = router?.defaultLocale || "zh";

  const [dict, setDict] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadDictionary() {
      try {
        const dictionaryModule = await import(`./locales/${locale}.ts`);
        setDict(dictionaryModule.default);
      } catch {
        try {
          const fallbackModule = await import(`./locales/${defaultLocale}.ts`);
          setDict(fallbackModule.default);
        } catch (e) {
          console.error("Failed to load language dictionaries", e);
        }
      }
    }
    void loadDictionary();
  }, [locale, defaultLocale]);

  const t = (key: string) => {
    return dict[key] || key;
  };

  return { t, locale, locales: router?.locales || ["zh", "en"] };
}
