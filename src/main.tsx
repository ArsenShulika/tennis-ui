import React from "react";
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import App from "./components/App/App";
import { LanguageProvider } from "./hooks/useLanguage";
import { TelegramUserProvider } from "./hooks/useTelegramUser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLDivElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TelegramUserProvider>
            <App />
          </TelegramUserProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
