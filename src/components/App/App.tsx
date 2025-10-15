import { Route, Routes } from "react-router-dom";
import css from "./App.module.css";
import pages from "../../pages";
import Layout from "../Layout/Layout";

const App = () => {
  return (
    <div className={css["app"]}>
      <Layout>
        <Routes>
          <Route path="/" element={<pages.Home />} />
          <Route path="/admin" element={<pages.Admin />} />
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
