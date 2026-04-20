import { useEffect, useMemo, useState } from "react";
import { deleteLesson, GetAllLessons } from "../../../../api/lessonsapi";
import { LOCATION_LABELS } from "../../../../constants/locations";
import { hydrateLessonsCourts, removeLessonCourt } from "../../../../helpers/lessonCourts";
import { getApiErrorDetails } from "../../../../helpers/apiError";
import { getUserByTelegramId } from "../../../../api/usersapi";
import { useLanguage } from "../../../../hooks/useLanguage";
import { useTelegramUser } from "../../../../hooks/useTelegramUser";
import { Lesson } from "../../../../types/lesson";
import { User } from "../../../../types/user";
import css from "./LessonsList.module.css";
import AdminLessonsList from "./AdminLessonsList";
import UserLessonsList from "./UserLessonsList";
import { parseLessonStart } from "./lessonDate";

export default function LessonsList() {
  const { t } = useLanguage();
  const { telegramUserId, isAdmin } = useTelegramUser();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [usersByTelegramId, setUsersByTelegramId] = useState<
    Record<string, User | null>
  >({});
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
        const sortedLessons = [...hydrateLessonsCourts(response.lessons)].sort(
          (a, b) =>
            (parseLessonStart(a)?.getTime() ?? 0) -
            (parseLessonStart(b)?.getTime() ?? 0)
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
              console.error(
                `Failed to load user by telegram id ${id}:`,
                userError
              );
              return [id, null] as const;
            }
          })
        );

        setUsersByTelegramId(Object.fromEntries(userEntries));
      } catch (loadError) {
        console.error("Failed to load lessons:", loadError);
        setError(
          isAdmin ? t("lessons.loadErrorAdmin") : t("lessons.loadErrorUser")
        );
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
    try {
      setDeletingLessonId(lesson._id);
      setError("");
      await deleteLesson(lesson._id);
      removeLessonCourt({
        date: lesson.date,
        time: lesson.time,
        location: lesson.location,
        duration: lesson.duration,
        telegramUserId: lesson.telegramUserId,
      });
      setLessons((current) =>
        current.filter((item) => item._id !== lesson._id)
      );
    } catch (deleteError) {
      console.error("Failed to delete lesson:", getApiErrorDetails(deleteError));
      setError(t("lessons.deleteError"));
    } finally {
      setDeletingLessonId("");
    }
  };

  const handleUpdate = async (updatedLesson: Lesson) => {
    setLessons((current) =>
      current
        .map((lesson) => (lesson._id === updatedLesson._id ? updatedLesson : lesson))
        .sort(
          (a, b) =>
            (parseLessonStart(a)?.getTime() ?? 0) -
            (parseLessonStart(b)?.getTime() ?? 0)
        )
    );

    if (!isAdmin || usersByTelegramId[updatedLesson.telegramUserId]) {
      return;
    }

    try {
      const user = await getUserByTelegramId(updatedLesson.telegramUserId);
      setUsersByTelegramId((current) => ({
        ...current,
        [updatedLesson.telegramUserId]: user,
      }));
    } catch (loadUserError) {
      console.error(
        `Failed to load updated user by telegram id ${updatedLesson.telegramUserId}:`,
        loadUserError
      );
    }
  };

  return (
    <section>
      <div className={css.header}>
        <h2 className={css.title}>{t("lessons.title")}</h2>
      </div>

      {hasItems ? (
        isAdmin ? (
          <AdminLessonsList
            lessons={lessons}
            usersByTelegramId={usersByTelegramId}
            deletingLessonId={deletingLessonId}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            locationLabels={LOCATION_LABELS}
            typeLabels={typeLabels}
            durationLabels={durationLabels}
          />
        ) : (
          <UserLessonsList
            lessons={lessons}
            deletingLessonId={deletingLessonId}
            onDelete={handleDelete}
            locationLabels={LOCATION_LABELS}
            typeLabels={typeLabels}
            durationLabels={durationLabels}
          />
        )
      ) : (
        <p className={css.empty}>{emptyStateText}</p>
      )}

      {hasItems && error ? <p className={css.error}>{error}</p> : null}
    </section>
  );
}
