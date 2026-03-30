import { useEffect, useMemo, useState } from "react";
import { deleteLesson, GetAllLessons } from "../../api/lessonsapi";
import { getUserByTelegramId } from "../../api/usersapi";
import AdminLessonsList from "../../components/sections/home/Schedule/AdminLessonsList";
import { parseLessonStart } from "../../components/sections/home/Schedule/lessonDate";
import CustomDatePicker from "../../components/shared/CustomDatePicker/CustomDatePicker";
import CustomDropdownSelect from "../../components/shared/CustomDropdownSelect/CustomDropdownSelect";
import { useLanguage } from "../../hooks/useLanguage";
import { Lesson, LessonLocation, LessonType } from "../../types/lesson";
import { User } from "../../types/user";
import css from "./AdminLessonsPage.module.css";

const LOCATION_LABELS: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

type LocationFilter = LessonLocation | "all";
type TypeFilter = LessonType | "all";
type MultisportFilter = "all" | "yes" | "no";

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isOnOrAfterDate(lessonDate: Date, filterDate: string) {
  const filterStart = new Date(`${filterDate}T00:00:00`);
  return lessonDate.getTime() >= filterStart.getTime();
}

function isOnOrBeforeDate(lessonDate: Date, filterDate: string) {
  const filterEnd = new Date(`${filterDate}T23:59:59`);
  return lessonDate.getTime() <= filterEnd.getTime();
}

export default function AdminLessonsPage() {
  const { t } = useLanguage();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [usersByTelegramId, setUsersByTelegramId] = useState<Record<string, User | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingLessonId, setDeletingLessonId] = useState("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [multisportFilter, setMultisportFilter] = useState<MultisportFilter>("all");

  const typeLabels = useMemo(
    () => ({
      individual: t("lessons.types.individual"),
      split: t("lessons.types.split"),
    }),
    [t]
  );
  const durationLabels = useMemo(
    () => ({
      m30: `30 ${t("common.minutesShort")}`,
      m60: `60 ${t("common.minutesShort")}`,
      m90: `90 ${t("common.minutesShort")}`,
      m120: `120 ${t("common.minutesShort")}`,
    }),
    [t]
  );
  const locationOptions = useMemo(
    () => [
      { value: "all", label: t("adminLessons.filters.allLocations") },
      { value: "awf", label: LOCATION_LABELS.awf },
      { value: "gem", label: LOCATION_LABELS.gem },
      { value: "oko", label: LOCATION_LABELS.oko },
    ],
    [t]
  );
  const typeOptions = useMemo(
    () => [
      { value: "all", label: t("adminLessons.filters.allTypes") },
      { value: "individual", label: typeLabels.individual },
      { value: "split", label: typeLabels.split },
    ],
    [t, typeLabels]
  );
  const multisportOptions = useMemo(
    () => [
      { value: "all", label: t("adminLessons.filters.allMultisport") },
      { value: "yes", label: t("adminLessons.filters.onlyMultisport") },
      { value: "no", label: t("adminLessons.filters.withoutMultisport") },
    ],
    [t]
  );
  const minFilterDate = useMemo(() => {
    const firstLessonDate = lessons
      .map((lesson) => parseLessonStart(lesson))
      .find((value): value is Date => Boolean(value));

    return firstLessonDate ? formatDateInputValue(firstLessonDate) : "2024-01-01";
  }, [lessons]);

  useEffect(() => {
    const loadLessons = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await GetAllLessons({ perPage: 500 });
        const sortedLessons = [...response.lessons].sort(
          (a, b) =>
            (parseLessonStart(a)?.getTime() ?? 0) - (parseLessonStart(b)?.getTime() ?? 0)
        );
        setLessons(sortedLessons);

        const uniqueTelegramIds = Array.from(
          new Set(
            sortedLessons
              .map((lesson) => lesson.telegramUserId)
              .filter((value): value is string => Boolean(value))
          )
        );

        const userEntries = await Promise.all(
          uniqueTelegramIds.map(async (id) => {
            try {
              const user = await getUserByTelegramId(id);
              return [id, user] as const;
            } catch (userError) {
              console.error(`Failed to load user by telegram id ${id}:`, userError);
              return [id, null] as const;
            }
          })
        );

        setUsersByTelegramId(Object.fromEntries(userEntries));
      } catch (loadError) {
        console.error("Failed to load admin lessons:", loadError);
        setError(t("adminLessons.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    loadLessons();
  }, [t]);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    if (dateTo >= dateFrom) return;
    setDateTo(dateFrom);
  }, [dateFrom, dateTo]);

  const filteredLessons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return lessons.filter((lesson) => {
      const lessonStart = parseLessonStart(lesson);
      const user = usersByTelegramId[lesson.telegramUserId] ?? null;

      if (dateFrom && (!lessonStart || !isOnOrAfterDate(lessonStart, dateFrom))) {
        return false;
      }

      if (dateTo && (!lessonStart || !isOnOrBeforeDate(lessonStart, dateTo))) {
        return false;
      }

      if (locationFilter !== "all" && lesson.location !== locationFilter) {
        return false;
      }

      if (typeFilter !== "all" && lesson.typeOfLesson !== typeFilter) {
        return false;
      }

      if (multisportFilter === "yes" && !lesson.multisport) {
        return false;
      }

      if (multisportFilter === "no" && lesson.multisport) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        lesson._id,
        lesson.telegramUserId,
        lesson.comments,
        lesson.date,
        lesson.time,
        LOCATION_LABELS[lesson.location],
        typeLabels[lesson.typeOfLesson],
        user?.fullName,
        user?.userName,
        user?.phoneNumber ? String(user.phoneNumber) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [
    dateFrom,
    dateTo,
    lessons,
    locationFilter,
    multisportFilter,
    query,
    typeFilter,
    typeLabels,
    usersByTelegramId,
  ]);

  const resultText = useMemo(
    () =>
      t("adminLessons.results", {
        shown: filteredLessons.length,
        total: lessons.length,
      }),
    [filteredLessons.length, lessons.length, t]
  );

  const emptyStateText = useMemo(() => {
    if (isLoading) return t("common.loading");
    if (error) return error;
    if (lessons.length === 0) return t("adminLessons.empty");
    return t("adminLessons.emptyFiltered");
  }, [error, isLoading, lessons.length, t]);

  const handleResetFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setLocationFilter("all");
    setTypeFilter("all");
    setMultisportFilter("all");
  };

  const handleDelete = async (lesson: Lesson) => {
    const confirmed = window.confirm(t("lessons.deleteConfirm"));
    if (!confirmed) return;

    try {
      setDeletingLessonId(lesson._id);
      setError("");
      await deleteLesson(lesson._id);
      setLessons((current) => current.filter((item) => item._id !== lesson._id));
    } catch (deleteError) {
      console.error("Failed to delete lesson:", deleteError);
      setError(t("lessons.deleteError"));
    } finally {
      setDeletingLessonId("");
    }
  };

  return (
    <div className={css.page}>
      <section className={css.panel}>
        <div className={css.heading}>
          <h1 className={css.title}>{t("adminLessons.title")}</h1>
          <p className={css.subtitle}>{t("adminLessons.subtitle")}</p>
        </div>

        <div className={css.filtersGrid}>
          <label className={css.field}>
            <span className={css.label}>{t("adminLessons.filters.searchLabel")}</span>
            <input
              type="text"
              className={css.input}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("adminLessons.filters.searchPlaceholder")}
            />
          </label>

          <div className={css.field}>
            <span className={css.label}>{t("adminLessons.filters.dateFrom")}</span>
            <div className={css.control}>
              <CustomDatePicker
                id="admin-lessons-date-from"
                value={dateFrom}
                onChange={setDateFrom}
                minDate={minFilterDate}
                label={t("adminLessons.filters.dateFrom")}
                placeholder={t("adminLessons.filters.datePlaceholder")}
              />
            </div>
          </div>

          <div className={css.field}>
            <span className={css.label}>{t("adminLessons.filters.dateTo")}</span>
            <div className={css.control}>
              <CustomDatePicker
                id="admin-lessons-date-to"
                value={dateTo}
                onChange={setDateTo}
                minDate={dateFrom || minFilterDate}
                label={t("adminLessons.filters.dateTo")}
                placeholder={t("adminLessons.filters.datePlaceholder")}
              />
            </div>
          </div>

          <div className={css.field}>
            <span className={css.label}>{t("common.location")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="admin-lessons-location"
                value={locationFilter}
                onChange={(value) => setLocationFilter(value as LocationFilter)}
                options={locationOptions}
                placeholder={t("adminLessons.filters.allLocations")}
              />
            </div>
          </div>

          <div className={css.field}>
            <span className={css.label}>{t("booking.lessonTypeLabel")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="admin-lessons-type"
                value={typeFilter}
                onChange={(value) => setTypeFilter(value as TypeFilter)}
                options={typeOptions}
                placeholder={t("adminLessons.filters.allTypes")}
              />
            </div>
          </div>

          <div className={css.field}>
            <span className={css.label}>{t("adminLessons.filters.multisportLabel")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="admin-lessons-multisport"
                value={multisportFilter}
                onChange={(value) => setMultisportFilter(value as MultisportFilter)}
                options={multisportOptions}
                placeholder={t("adminLessons.filters.allMultisport")}
              />
            </div>
          </div>
        </div>

        <div className={css.actions}>
          <button type="button" className={css.resetButton} onClick={handleResetFilters}>
            {t("adminLessons.filters.reset")}
          </button>
          <p className={css.results}>{resultText}</p>
        </div>

        {error && lessons.length > 0 ? <p className={css.error}>{error}</p> : null}
      </section>

      <section className={css.panel}>
        {filteredLessons.length > 0 ? (
          <AdminLessonsList
            lessons={filteredLessons}
            usersByTelegramId={usersByTelegramId}
            deletingLessonId={deletingLessonId}
            onDelete={handleDelete}
            locationLabels={LOCATION_LABELS}
            typeLabels={typeLabels}
            durationLabels={durationLabels}
          />
        ) : (
          <p className={css.empty}>{emptyStateText}</p>
        )}
      </section>
    </div>
  );
}
