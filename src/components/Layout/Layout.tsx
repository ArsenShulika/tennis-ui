import { Suspense } from "react";
import Footer from "../customComponents/Footer/Footer";
import Header from "../customComponents/Header/Header";
import css from "./Layout.module.css";

const Layout = ({ children }) => {
  return (
    <>
      <Header />
      <main>
        <div className="container">
          <Suspense fallback={<></>}>{children}</Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Layout;
