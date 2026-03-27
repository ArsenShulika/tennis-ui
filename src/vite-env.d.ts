/// <reference types="vite/client" />

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_bot?: boolean;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
  };
  ready?: () => void;
  openLink?: (url: string) => void;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
  __telegramUserDev__?: {
    setUser: (user: TelegramWebAppUser) => void;
    clear: () => void;
  };
}
