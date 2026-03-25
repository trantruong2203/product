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
    <label className="flex items-center gap-2">
      <select 
        value={i18n.resolvedLanguage || i18n.language} 
        onChange={handleChangeLanguage}
        className="bg-primary-600 text-primary-100 border-none text-sm px-2 py-1 rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-400"
      >
        <option value="en">{t("common.languages.english")}</option>
        <option value="vi">{t("common.languages.vietnamese")}</option>
      </select>
    </label>
  );
}
