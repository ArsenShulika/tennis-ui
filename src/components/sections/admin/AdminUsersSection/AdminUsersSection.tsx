import { useEffect, useMemo, useState } from "react";
import { getAllUsers, updateUser } from "../../../../api/usersapi";
import { useLanguage } from "../../../../hooks/useLanguage";
import { User } from "../../../../types/user";
import css from "./AdminUsersSection.module.css";

type EditableUser = {
  fullName: string;
  userName: string;
  phoneNumber: string;
  balance: string;
  currency: string;
};

function createEditableUser(user: User): EditableUser {
  return {
    fullName: user.fullName,
    userName: user.userName,
    phoneNumber: String(user.phoneNumber ?? ""),
    balance: String(user.balance ?? ""),
    currency: user.currency,
  };
}

export default function AdminUsersSection() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<EditableUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getAllUsers({ perPage: 500 });
        setUsers(response.users);
      } catch (loadError) {
        console.error("Failed to load users:", loadError);
        setError(t("adminUsers.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [t]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) =>
      [
        user.fullName,
        user.userName,
        user.telegramUserId,
        String(user.phoneNumber),
        user.currency,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query, users]);

  const listEmptyText = useMemo(() => {
    if (isLoading) return t("common.loading");
    if (error) return error;
    if (users.length === 0) return t("adminUsers.empty");
    return t("adminUsers.emptyFiltered");
  }, [error, isLoading, t, users.length]);

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    setDraft(createEditableUser(user));
    setError("");
    setSaveMessage("");
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setDraft(null);
    setSaveMessage("");
  };

  const handleDraftChange = (field: keyof EditableUser, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSave = async () => {
    if (!selectedUser || !draft) return;

    setIsSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const updatedUser = await updateUser(selectedUser._id, {
        fullName: draft.fullName.trim(),
        userName: draft.userName.trim(),
        phoneNumber: Number(draft.phoneNumber) || 0,
        balance: Number(draft.balance) || 0,
        currency: draft.currency.trim() || selectedUser.currency,
      });

      setUsers((current) =>
        current.map((user) => (user._id === updatedUser._id ? updatedUser : user))
      );
      setSelectedUser(updatedUser);
      setDraft(createEditableUser(updatedUser));
      setSaveMessage(t("adminUsers.saved"));
    } catch (saveError) {
      console.error("Failed to update user:", saveError);
      setError(t("adminUsers.saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={css.page}>
      <section className={css.panel}>
        <div className={css.heading}>
          <h1 className={css.title}>{t("adminUsers.title")}</h1>
          <p className={css.subtitle}>{t("adminUsers.subtitle")}</p>
        </div>

        <input
          type="text"
          className={css.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("adminUsers.searchPlaceholder")}
        />

        {filteredUsers.length > 0 ? (
          <ul className={css.list}>
            {filteredUsers.map((user) => (
              <li key={user._id}>
                <button type="button" className={css.userButton} onClick={() => openUserModal(user)}>
                  <span className={css.userPrimary}>{user.fullName}</span>
                  <span className={css.userSecondary}>
                    @{user.userName || "-"} • {user.telegramUserId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={css.empty}>{listEmptyText}</p>
        )}
      </section>

      {selectedUser && draft ? (
        <div className={css.backdrop} onClick={closeUserModal}>
          <div
            className={css.modal}
            role="dialog"
            aria-modal="true"
            aria-label={t("adminUsers.modalTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={css.modalHeader}>
              <div>
                <h2 className={css.modalTitle}>{selectedUser.fullName}</h2>
                <p className={css.modalSubtitle}>{t("adminUsers.modalSubtitle")}</p>
              </div>
              <button type="button" className={css.closeButton} onClick={closeUserModal}>
                x
              </button>
            </div>

            <div className={css.formGrid}>
              <label className={css.field}>
                <span className={css.label}>{t("lessons.fullName")}</span>
                <input
                  type="text"
                  className={css.input}
                  value={draft.fullName}
                  onChange={(event) => handleDraftChange("fullName", event.target.value)}
                />
              </label>

              <label className={css.field}>
                <span className={css.label}>Telegram Username</span>
                <input
                  type="text"
                  className={css.input}
                  value={draft.userName}
                  onChange={(event) => handleDraftChange("userName", event.target.value)}
                />
              </label>

              <label className={css.field}>
                <span className={css.label}>{t("lessons.phone")}</span>
                <input
                  type="text"
                  className={css.input}
                  value={draft.phoneNumber}
                  onChange={(event) => handleDraftChange("phoneNumber", event.target.value)}
                />
              </label>

              <label className={css.field}>
                <span className={css.label}>Telegram ID</span>
                <input type="text" className={`${css.input} ${css.readonly}`} value={selectedUser.telegramUserId} readOnly />
              </label>

              <label className={css.field}>
                <span className={css.label}>{t("adminUsers.balanceLabel")}</span>
                <input
                  type="text"
                  className={css.input}
                  value={draft.balance}
                  onChange={(event) => handleDraftChange("balance", event.target.value)}
                />
              </label>

              <label className={css.field}>
                <span className={css.label}>{t("adminUsers.currencyLabel")}</span>
                <input
                  type="text"
                  className={css.input}
                  value={draft.currency}
                  onChange={(event) => handleDraftChange("currency", event.target.value)}
                />
              </label>

              <label className={`${css.field} ${css.fieldFull}`}>
                <span className={css.label}>{t("adminUsers.createdAtLabel")}</span>
                <input
                  type="text"
                  className={`${css.input} ${css.readonly}`}
                  value={selectedUser.createAt}
                  readOnly
                />
              </label>
            </div>

            {error ? <p className={css.error}>{error}</p> : null}
            {saveMessage ? <p className={css.success}>{saveMessage}</p> : null}

            <div className={css.actions}>
              <button type="button" className={css.secondaryButton} onClick={closeUserModal}>
                {t("common.cancel")}
              </button>
              <button type="button" className={css.primaryButton} onClick={handleSave} disabled={isSaving}>
                {isSaving ? t("common.saving") : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
