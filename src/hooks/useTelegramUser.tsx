import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createUser, getUserByTelegramId } from "../api/usersapi";
import { User } from "../types/user";

export const ADMIN_TELEGRAM_USER_ID = "2076217332";

const DEV_OVERRIDE_STORAGE_KEY = "telegram-webapp-dev-user";
const DEV_DEFAULT_ADMIN_USER: TelegramWebAppUser = {
  id: Number(ADMIN_TELEGRAM_USER_ID),
  first_name: "Admin",
  last_name: "Local",
  username: "local_admin",
  language_code: "uk",
};

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
  appUser: User | null;
  isAdmin: boolean;
  isReady: boolean;
  isUserSyncing: boolean;
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

  if (import.meta.env.DEV) {
    return { user: DEV_DEFAULT_ADMIN_USER, source: "dev-override" };
  }

  return { user: null, source: "none" };
}

export function TelegramUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => resolveTelegramUser());
  const [appUser, setAppUser] = useState<User | null>(null);
  const [isUserSyncing, setIsUserSyncing] = useState(false);

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

  useEffect(() => {
    const telegramUser = state.user;
    if (!telegramUser) {
      setAppUser(null);
      setIsUserSyncing(false);
      return;
    }

    const syncUser = async () => {
      try {
        setIsUserSyncing(true);
        const telegramUserId = String(telegramUser.id);
        const existingUser = await getUserByTelegramId(telegramUserId);
        setAppUser(existingUser);
      } catch {
        // const isNotFound =
        //   axios.isAxiosError(error) &&
        //   (error.response?.status === 404 || error.response?.status === 400);

        // if (!isNotFound) {
        //   console.error("Failed to load app user:", error);
        //   setAppUser(null);
        //   setIsUserSyncing(false);
        //   return;
        // }

        try {
          const createdUser = await createUser({
            telegramUserId: String(telegramUser.id),
            userName: telegramUser.username ?? telegramUser.first_name ?? "telegram_user",
            fullName: [telegramUser.first_name, telegramUser.last_name]
              .filter(Boolean)
              .join(" ")
              .trim() || telegramUser.username || `Telegram ${telegramUser.id}`,
            phoneNumber: 0,
            balance: 0,
            currency: "PLN",
          });
          setAppUser(createdUser);
        } catch (createError) {
          console.error("Failed to create app user:", createError);
          setAppUser(null);
        }
      } finally {
        setIsUserSyncing(false);
      }
    };

    syncUser();
  }, [state.user]);

  const value = useMemo<TelegramUserContextValue>(() => {
    const telegramUserId = state.user ? String(state.user.id) : null;

    return {
      telegramUser: state.user,
      telegramUserId,
      appUser,
      isAdmin: telegramUserId === ADMIN_TELEGRAM_USER_ID,
      isReady: state.source !== "none",
      isUserSyncing,
      source: state.source,
      isDevOverrideEnabled: import.meta.env.DEV,
      setDevUserOverride,
      clearDevUserOverride,
    };
  }, [state, appUser, isUserSyncing]);

  return <TelegramUserContext.Provider value={value}>{children}</TelegramUserContext.Provider>;
}

export function useTelegramUser() {
  const context = useContext(TelegramUserContext);

  if (!context) {
    throw new Error("useTelegramUser must be used within TelegramUserProvider");
  }

  return context;
}
