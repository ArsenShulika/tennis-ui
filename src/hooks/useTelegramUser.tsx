import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const ADMIN_TELEGRAM_USER_ID = "2076217332";

const DEV_OVERRIDE_STORAGE_KEY = "telegram-webapp-dev-user";

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_bot?: boolean;
  is_premium?: boolean;
};

type TelegramUserSource = "dev-override" | "telegram-webapp" | "none";

type TelegramUserContextValue = {
  telegramUser: TelegramWebAppUser | null;
  telegramUserId: string | null;
  isAdmin: boolean;
  isReady: boolean;
  source: TelegramUserSource;
  isDevOverrideEnabled: boolean;
  setDevUserOverride: (user: TelegramWebAppUser) => void;
  clearDevUserOverride: () => void;
};

const TelegramUserContext = createContext<TelegramUserContextValue | null>(null);

function readDevOverrideUser(): TelegramWebAppUser | null {
  if (!import.meta.env.DEV) return null;

  try {
    const raw = window.localStorage.getItem(DEV_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TelegramWebAppUser;
  } catch {
    return null;
  }
}

function readTelegramWebAppUser(): TelegramWebAppUser | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}

function resolveTelegramUser(): { user: TelegramWebAppUser | null; source: TelegramUserSource } {
  const devOverrideUser = readDevOverrideUser();
  if (devOverrideUser) {
    return { user: devOverrideUser, source: "dev-override" };
  }

  const telegramUser = readTelegramWebAppUser();
  if (telegramUser) {
    return { user: telegramUser, source: "telegram-webapp" };
  }

  return { user: null, source: "none" };
}

export function TelegramUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => resolveTelegramUser());

  useEffect(() => {
    window.Telegram?.WebApp?.ready?.();
    setState(resolveTelegramUser());
  }, []);

  const setDevUserOverride = (user: TelegramWebAppUser) => {
    if (!import.meta.env.DEV) return;

    window.localStorage.setItem(DEV_OVERRIDE_STORAGE_KEY, JSON.stringify(user));
    setState({ user, source: "dev-override" });
  };

  const clearDevUserOverride = () => {
    if (!import.meta.env.DEV) return;

    window.localStorage.removeItem(DEV_OVERRIDE_STORAGE_KEY);
    setState(resolveTelegramUser());
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    window.__telegramUserDev__ = {
      setUser(user: TelegramWebAppUser) {
        setDevUserOverride(user);
      },
      clear() {
        clearDevUserOverride();
      },
    };

    return () => {
      delete window.__telegramUserDev__;
    };
  }, []);

  const value = useMemo<TelegramUserContextValue>(() => {
    const telegramUserId = state.user ? String(state.user.id) : null;

    return {
      telegramUser: state.user,
      telegramUserId,
      isAdmin: telegramUserId === ADMIN_TELEGRAM_USER_ID,
      isReady: state.source !== "none",
      source: state.source,
      isDevOverrideEnabled: import.meta.env.DEV,
      setDevUserOverride,
      clearDevUserOverride,
    };
  }, [state]);

  return <TelegramUserContext.Provider value={value}>{children}</TelegramUserContext.Provider>;
}

export function useTelegramUser() {
  const context = useContext(TelegramUserContext);

  if (!context) {
    throw new Error("useTelegramUser must be used within TelegramUserProvider");
  }

  return context;
}
