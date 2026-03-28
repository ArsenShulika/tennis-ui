import { useLanguage } from "../../hooks/useLanguage";
import css from "./SettingsPage.module.css";

const SettingsPage = () => {
  const { t } = useLanguage();

  return <div className={css.settingsPage}>{t("pages.settings")}</div>;
};

export default SettingsPage;
