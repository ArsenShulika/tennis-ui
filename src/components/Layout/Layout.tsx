import { ReactNode, Suspense } from "react";
import Footer from "../customComponents/Footer/Footer";
import css from "./Layout.module.css";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className={css.shell}>
      <main className={css.main}>
        <div className={`container ${css.content}`}>
          <Suspense fallback={<></>}>{children}</Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
