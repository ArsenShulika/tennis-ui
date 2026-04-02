import { ReactNode, Suspense } from "react";
// import Footer from "../customComponents/Footer/Footer";
import Header from "../customComponents/Header/Header";
import css from "./Layout.module.css";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className={css.shell}>
      <Header />
      <main className={css.main}>
        <div className={`container ${css.content}`}>
          <Suspense fallback={<></>}>{children}</Suspense>
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default Layout;
