import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AdminAvailabilitySection from "../../components/sections/admin/AdminAvailabilitySection/AdminAvailabilitySection";
import AdminUsersSection from "../../components/sections/admin/AdminUsersSection/AdminUsersSection";
import AdminBookingPage from "../AdminBookingPage/AdminBookingPage";
import AdminLessonsPage from "../AdminLessonsPage/AdminLessonsPage";
import { useLanguage } from "../../hooks/useLanguage";
import css from "./AdminPage.module.css";

type AdminSection = "availability" | "lessons" | "booking" | "users";

function isAdminSection(value: string | null): value is AdminSection {
  return value === "availability" || value === "lessons" || value === "booking" || value === "users";
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = isAdminSection(searchParams.get("section"))
    ? searchParams.get("section")
    : "availability";

  const sections = useMemo(
    () => [
      {
        key: "availability" as const,
        label: t("admin.title"),
        description: t("admin.subtitle"),
      },
      {
        key: "lessons" as const,
        label: t("nav.lessons"),
        description: t("adminLessons.subtitle"),
      },
      {
        key: "booking" as const,
        label: t("adminBooking.title"),
        description: t("adminBooking.subtitle"),
      },
      {
        key: "users" as const,
        label: t("adminUsers.title"),
        description: t("adminUsers.subtitle"),
      },
    ],
    [t]
  );

  const handleSectionChange = (section: AdminSection) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("section", section);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className={css.adminHub}>
      <section className={css.switcherPanel}>
        <div className={css.heading}>
          <h1 className={css.title}>{t("nav.admin")}</h1>
          <p className={css.subtitle}>{sections.find((item) => item.key === activeSection)?.description}</p>
        </div>

        <div className={css.tabList} role="tablist" aria-label={t("nav.admin")}>
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={activeSection === section.key}
              className={`${css.tabButton} ${
                activeSection === section.key ? css.tabButtonActive : ""
              }`}
              onClick={() => handleSectionChange(section.key)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>

      {activeSection === "availability" ? <AdminAvailabilitySection /> : null}
      {activeSection === "lessons" ? <AdminLessonsPage /> : null}
      {activeSection === "booking" ? <AdminBookingPage /> : null}
      {activeSection === "users" ? <AdminUsersSection /> : null}
    </div>
  );
}
