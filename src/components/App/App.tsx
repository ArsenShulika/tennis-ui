import { Navigate, Route, Routes } from "react-router-dom";
import css from "./App.module.css";
import pages from "../../pages";
import Layout from "../Layout/Layout";
import { useTelegramUser } from "../../hooks/useTelegramUser";

const App = () => {
  const { isAdmin } = useTelegramUser();

  return (
    <div className={css["app"]}>
      <Layout>
        <Routes>
          <Route path="/" element={<pages.Home />} />
          <Route
            path="/admin"
            element={isAdmin ? <pages.Admin /> : <Navigate to="/" replace />}
          />
          <Route
            path="/admin/lessons"
            element={
              isAdmin ? <Navigate to="/admin?section=lessons" replace /> : <Navigate to="/" replace />
            }
          />
          <Route
            path="/admin/booking"
            element={
              isAdmin ? <Navigate to="/admin?section=booking" replace /> : <Navigate to="/" replace />
            }
          />
          <Route path="/booking" element={<pages.Booking />} />
          <Route path="/lessons" element={<pages.Lessons />} />
          <Route path="/locations" element={<pages.Locations />} />
          <Route path="/settings" element={<pages.Settings />} />
          <Route path="/payments" element={<pages.Payments />} />
        </Routes>
      </Layout>
    </div>
  );
};

export default App;
