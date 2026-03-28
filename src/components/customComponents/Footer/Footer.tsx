import { useLanguage } from "../../../hooks/useLanguage";
import css from "./Footer.module.css";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <div className={css.footer}>{t("footer.label")}</div>
  );
};

export default Footer;
