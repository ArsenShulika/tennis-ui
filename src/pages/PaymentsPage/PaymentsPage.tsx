import { useLanguage } from "../../hooks/useLanguage";
import css from "./PaymentsPage.module.css";

const PaymentsPage = () => {
  const { t } = useLanguage();

  return <div className={css.paymentsPage}>{t("pages.payments")}</div>;
};

export default PaymentsPage;
