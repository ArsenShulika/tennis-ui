import { useNavigate } from "react-router-dom";
import Schedule from "../../components/sections/schedule/Schedule/Schedule";
import { useTelegramUser } from "../../hooks/useTelegramUser";
import css from "./HomePage.module.css";

const HomePage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useTelegramUser();

  const handleAdminSlotSelect = ({ date, time }: { date: string; time: string }) => {
    const searchParams = new URLSearchParams({ section: "availability", date, time });
    navigate(`/admin?${searchParams.toString()}`);
  };

  return (
    <div className={css["homePage"]}>
      <Schedule
        mode={isAdmin ? "admin" : "user"}
        onAdminSlotSelect={isAdmin ? handleAdminSlotSelect : undefined}
      />
    </div>
  );
};

export default HomePage;
