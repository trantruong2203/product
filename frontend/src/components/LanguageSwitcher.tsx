import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChangeLanguage = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextLanguage = event.target.value;
    await i18n.changeLanguage(nextLanguage);
    localStorage.setItem("language", nextLanguage);
  };

  return (
    <label className="language-switcher">
      <span>{t("common.language")}:</span>
      <select value={i18n.resolvedLanguage || i18n.language} onChange={handleChangeLanguage}>
        <option value="en">{t("common.languages.english")}</option>
        <option value="vi">{t("common.languages.vietnamese")}</option>
      </select>
    </label>
  );
}
