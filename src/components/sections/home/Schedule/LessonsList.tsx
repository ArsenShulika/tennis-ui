import { useEffect, useMemo, useState } from "react";
import { deleteLesson, GetAllLessons } from "../../../../api/lessonsapi";
import { getUserByTelegramId } from "../../../../api/usersapi";
import { useLanguage } from "../../../../hooks/useLanguage";
import { useTelegramUser } from "../../../../hooks/useTelegramUser";
import { Lesson } from "../../../../types/lesson";
import { User } from "../../../../types/user";
import LessonItem from "../../lessons/LessonItem/LessonItem";
import css from "./LessonsList.module.css";

const LOCATION_LABELS: Record<Lesson["location"], string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

function parseLocalDateTime(value: string) {
  const normalizedValue = value.trim().replace(" ", "T");
  const match = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) {
    const fallback = new Date(normalizedValue);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day, hours, minutes, seconds = "00"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  );
}

function parseLessonStart(lesson: Lesson) {
  if (lesson.date.includes("T") || lesson.date.includes(" ")) {
    return parseLocalDateTime(lesson.date);
  }

  return parseLocalDateTime(`${lesson.date}T${lesson.time}:00`);
}

export default function LessonsList() {
  const { t } = useLanguage();
  const { telegramUserId, isAdmin } = useTelegramUser();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [usersByTelegramId, setUsersByTelegramId] = useState<Record<string, User | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingLessonId, setDeletingLessonId] = useState("");

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

  useEffect(() => {
    if (!telegramUserId && !isAdmin) {
      setLessons([]);
      setUsersByTelegramId({});
      setError("");
      setIsLoading(false);
      return;
    }

    const loadLessons = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await GetAllLessons(
          isAdmin ? {} : { telegramUserId: telegramUserId ?? undefined }
        );
        const sortedLessons = [...response.lessons].sort(
          (a, b) => (parseLessonStart(a)?.getTime() ?? 0) - (parseLessonStart(b)?.getTime() ?? 0)
        );
        setLessons(sortedLessons);

        if (!isAdmin) {
          setUsersByTelegramId({});
          return;
        }

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
        console.error("Failed to load lessons:", loadError);
        setError(isAdmin ? t("lessons.loadErrorAdmin") : t("lessons.loadErrorUser"));
      } finally {
        setIsLoading(false);
      }
    };

    loadLessons();
  }, [telegramUserId, isAdmin, t]);

  const hasItems = lessons.length > 0;

  const emptyStateText = useMemo(() => {
    if (!telegramUserId && !isAdmin) return t("lessons.noTelegramUser");
    if (isLoading) return t("lessons.loading");
    if (error) return error;
    return isAdmin ? t("lessons.emptyAdmin") : t("lessons.emptyUser");
  }, [error, isLoading, telegramUserId, isAdmin, t]);

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
    <section>
      <div className={css.header}>
        <h2 className={css.title}>{t("lessons.title")}</h2>
      </div>

      {hasItems ? (
        <ul className={css.list}>
          {lessons.map((lesson) => (
            <LessonItem
              key={lesson._id}
              lesson={lesson}
              hallLabel={LOCATION_LABELS[lesson.location]}
              typeLabel={typeLabels[lesson.typeOfLesson]}
              durationLabel={durationLabels[lesson.duration]}
              bookedByLabel={
                isAdmin
                  ? usersByTelegramId[lesson.telegramUserId]?.fullName ?? lesson.telegramUserId
                  : null
              }
              adminUser={isAdmin ? usersByTelegramId[lesson.telegramUserId] ?? null : null}
              isDeleting={deletingLessonId === lesson._id}
              onCancel={handleDelete}
            />
          ))}
        </ul>
      ) : (
        <p className={css.empty}>{emptyStateText}</p>
      )}

      {hasItems && error ? <p className={css.error}>{error}</p> : null}
    </section>
  );
}
