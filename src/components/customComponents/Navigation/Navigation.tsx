import { NavLink } from "react-router-dom";
import { useLanguage } from "../../../hooks/useLanguage";
import { useTelegramUser } from "../../../hooks/useTelegramUser";
import css from "./Navigation.module.css";

const Navigation = () => {
  const { isAdmin } = useTelegramUser();
  const { t } = useLanguage();
  const items = [
    { to: "/", label: t("nav.home") },
    { to: "/admin", label: t("nav.admin"), adminOnly: true },
    { to: "/booking", label: t("nav.booking") },
    { to: "/lessons", label: t("nav.lessons") },
    { to: "/locations", label: t("nav.locations") },
    { to: "/settings", label: t("nav.settings") },
    { to: "/payments", label: t("nav.payments") },
  ];
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className={css.navigation}>
      <ul>
        {visibleItems.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to}>
              <span className={css.label}>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
