import Navigation from "../Navigation/Navigation";
import css from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={css.footer}>
      <div className={`container ${css.inner}`}>
        <Navigation />
      </div>
    </footer>
  );
};

export default Footer;
