import Navigation from "../Navigation/Navigation";
import css from "./Header.module.css";

const Header = () => {
  return (
    <div className={css["header"]}>
      <Navigation />
    </div>
  );
};

export default Header;
