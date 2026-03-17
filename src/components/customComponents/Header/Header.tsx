import Navigation from "../Navigation/Navigation";
import css from "./Header.module.css";

const Header = () => {
  return (
    <div className={css["header"]}>
      <div className="container">
        <Navigation />
      </div>
    </div>
  );
};

export default Header;
