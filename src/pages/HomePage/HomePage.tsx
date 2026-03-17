import Schedule from "../../components/sections/schedule/Schedule/Schedule";
import css from "./HomePage.module.css";

const HomePage = () => {
  return (
    <div className={css["homePage"]}>
      <Schedule />
    </div>
  );
};

export default HomePage;
