import { Check } from "lucide-react";
import { languages, useI18n } from "../i18n";
import { Dropdown, itemClass } from "./AccountMenu";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const current = languages.find((language) => language.code === lang) ?? languages[0];

  return (
    <Dropdown label={t("menu.language")} icon={<span className="text-lg leading-none" aria-hidden>{current.flag}</span>}>
      {(close) => (
        <>
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => {
                setLang(language.code);
                close();
              }}
              className={itemClass}
            >
              <span className="text-base leading-none" aria-hidden>{language.flag}</span>
              <span className="flex-1">{language.label}</span>
              {language.code === lang && <Check className="h-3.5 w-3.5 text-brand-600 dark:text-brand-300" />}
            </button>
          ))}
        </>
      )}
    </Dropdown>
  );
}
