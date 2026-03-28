import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import App from "./components/App/App";
import { LanguageProvider } from "./hooks/useLanguage";
import { TelegramUserProvider } from "./hooks/useTelegramUser";

ReactDOM.createRoot(document.getElementById("root") as HTMLDivElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <TelegramUserProvider>
          <App />
        </TelegramUserProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
