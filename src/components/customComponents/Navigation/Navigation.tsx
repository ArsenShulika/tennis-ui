import { NavLink } from "react-router-dom";
import css from "./Navigation.module.css";

const items = [
  { to: "/", label: "Home" },
  { to: "/admin", label: "Admin" },
  { to: "/booking", label: "Booking" },
  { to: "/lessons", label: "Lessons" },
  { to: "/locations", label: "Locations" },
  { to: "/settings", label: "Settings" },
  { to: "/payments", label: "Payments" },
];

const Navigation = () => {
  return (
    <nav className={css.navigation}>
      <ul>
        {items.map((item) => (
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
