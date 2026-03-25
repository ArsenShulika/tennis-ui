import { useEffect, useMemo, useState } from "react";
import { deleteLesson, GetAllLessons } from "../../../../api/lessonsapi";
import { useTelegramUser } from "../../../../hooks/useTelegramUser";
import { Lesson } from "../../../../types/lesson";
import LessonItem from "../../lessons/LessonItem/LessonItem";
import css from "./LessonsList.module.css";

const LOCATION_LABELS: Record<Lesson["location"], string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

const TYPE_LABELS: Record<Lesson["typeOfLesson"], string> = {
  individual: "Індивідуальне",
  split: "Спліт",
};

const DURATION_LABELS: Record<Lesson["duration"], string> = {
  m60: "60 хв",
  m90: "90 хв",
  m120: "120 хв",
};

function parseLessonStart(lesson: Lesson) {
  if (lesson.date.includes("T") || lesson.date.includes(" ")) {
    return new Date(lesson.date.replace(" ", "T"));
  }

  return new Date(`${lesson.date}T${lesson.time}:00`);
}

export default function LessonsList() {
  const { telegramUserId, isAdmin } = useTelegramUser();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingLessonId, setDeletingLessonId] = useState("");

  useEffect(() => {
    if (!telegramUserId && !isAdmin) {
      setLessons([]);
      setError("");
      setIsLoading(false);
      return;
    }

    const loadLessons = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await GetAllLessons(isAdmin ? {} : { telegramUserId: telegramUserId ?? undefined });
        const sortedLessons = [...response.lessons].sort(
          (a, b) => parseLessonStart(a).getTime() - parseLessonStart(b).getTime()
        );
        setLessons(sortedLessons);
      } catch (loadError) {
        console.error("Failed to load lessons:", loadError);
        setError("Не вдалося завантажити ваші заброньовані уроки.");
      } finally {
        setIsLoading(false);
      }
    };

    loadLessons();
  }, [telegramUserId, isAdmin]);

  const hasItems = lessons.length > 0;

  const emptyStateText = useMemo(() => {
    if (!telegramUserId && !isAdmin) return "Немає даних Telegram-користувача.";
    if (isLoading) return "Завантаження бронювань...";
    if (error) return error;
    return isAdmin
      ? "Наразі немає запланованих тренувань"
      : "Наразі у вас немає запланованих тренувань";
  }, [error, isLoading, telegramUserId, isAdmin]);

  const handleDelete = async (lesson: Lesson) => {
    const confirmed = window.confirm("Видалити це бронювання?");
    if (!confirmed) return;

    try {
      setDeletingLessonId(lesson._id);
      setError("");
      await deleteLesson(lesson._id);
      setLessons((current) => current.filter((item) => item._id !== lesson._id));
    } catch (deleteError) {
      console.error("Failed to delete lesson:", deleteError);
      setError("Не вдалося видалити бронювання.");
    } finally {
      setDeletingLessonId("");
    }
  };

  return (
    <section>
      <div className={css.header}>
        <h2 className={css.title}>Майбутні тренування</h2>
      </div>

      {hasItems ? (
        <ul className={css.list}>
          {lessons.map((lesson) => (
            <LessonItem
              key={lesson._id}
              lesson={lesson}
              hallLabel={LOCATION_LABELS[lesson.location]}
              typeLabel={TYPE_LABELS[lesson.typeOfLesson]}
              durationLabel={DURATION_LABELS[lesson.duration]}
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
