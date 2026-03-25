import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createFreeHour, deleteFreeHour, GetFreeHours } from "../../api/freeHours";
import { GetAllLessons } from "../../api/lessonsapi";
import NiceSelect from "../../components/shared/NiceSelect/NiceSelect";
import { FreeHour } from "../../types/freeHour";
import { Lesson, LessonDuration, LessonLocation } from "../../types/lesson";
import css from "./AdminPage.module.css";

const locationOptions = [
  { value: "awf", label: "Hala tenisowa AWF" },
  { value: "gem", label: "Hala wielofunkcyjna GEM" },
  { value: "oko", label: "Korty Morskie Oko" },
];

const timeOptions = Array.from({ length: 28 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  const value = `${hours}:${minutes}`;
  return { value, label: value };
});

const locationLabels: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

function parseDateTime(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )}`;
}

function formatDatePart(value: string) {
  const parsed = parseDateTime(value);
  if (!parsed) return value;

  return formatDateInputValue(parsed);
}

function formatTimePart(value: string) {
  const parsed = parseDateTime(value);
  if (!parsed) return "--:--";

  return formatTimeInputValue(parsed);
}

function sortFreeHours(items: FreeHour[]) {
  return [...items].sort((a, b) => {
    const left = parseDateTime(a.date)?.getTime() ?? 0;
    const right = parseDateTime(b.date)?.getTime() ?? 0;
    return left - right;
  });
}

function parseLessonDurationMinutes(duration: LessonDuration) {
  const numericValue = Number(duration.slice(1));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function getLessonStart(lesson: Lesson) {
  if (lesson.date.includes("T") || lesson.date.includes(" ")) {
    return parseDateTime(lesson.date);
  }

  if (lesson.time) {
    return parseDateTime(`${lesson.date}T${lesson.time}:00`);
  }

  return parseDateTime(lesson.date);
}

function findOverlappingLesson(freeHour: FreeHour, lessons: Lesson[]) {
  const freeHourStart = parseDateTime(freeHour.date);
  if (!freeHourStart) return null;

  const freeHourEnd = new Date(freeHourStart.getTime() + freeHour.duration * 60 * 1000);

  return (
    lessons.find((lesson) => {
      if (lesson.location !== freeHour.location) return false;

      const lessonStart = getLessonStart(lesson);
      if (!lessonStart) return false;

      const lessonEnd = new Date(
        lessonStart.getTime() + parseLessonDurationMinutes(lesson.duration) * 60 * 1000
      );

      return lessonStart < freeHourEnd && lessonEnd > freeHourStart;
    }) ?? null
  );
}

export default function AdminPage() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState<LessonLocation>("awf");
  const [duration, setDuration] = useState("60");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [freeHours, setFreeHours] = useState<FreeHour[]>([]);
  const [futureLessons, setFutureLessons] = useState<Lesson[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const dateRef = useRef<HTMLInputElement | null>(null);

  const now = new Date();
  const minDate = formatDateInputValue(now);
  const minTime = date === minDate ? formatTimeInputValue(now) : undefined;
  const availableTimeOptions = timeOptions.filter((option) => !minTime || option.value >= minTime);

  const loadAdminData = async () => {
    try {
      setIsLoadingList(true);
      setListError("");
      const fromDate = new Date().toISOString();

      const [freeHoursResponse, lessonsResponse] = await Promise.all([
        GetFreeHours({
          fromDate,
          perPage: 200,
        }),
        GetAllLessons({
          fromDate,
          perPage: 200,
        }),
      ]);

      setFreeHours(sortFreeHours(freeHoursResponse.freeHours));
      setFutureLessons(lessonsResponse.lessons);
    } catch (loadError) {
      console.error("Failed to load admin data:", loadError);
      setListError("Не вдалося завантажити відкриті години.");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const listEmptyText = useMemo(() => {
    if (isLoadingList) return "Завантаження відкритих годин...";
    if (listError) return listError;
    return "Наразі немає відкритих годин.";
  }, [isLoadingList, listError]);

  const openDatePicker = () => {
    const element = dateRef.current as unknown as { showPicker?: () => void } | null;
    element?.showPicker?.();
  };

  const handleDateChange = (nextValue: string) => {
    setDate(nextValue);
    window.setTimeout(() => {
      dateRef.current?.blur();
    }, 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!date || !time) {
      setError("Оберіть дату та час.");
      setMessage("");
      return;
    }

    const selectedDateTime = parseDateTime(`${date}T${time}:00`);
    if (!selectedDateTime || selectedDateTime.getTime() < Date.now()) {
      setError("Не можна відкривати години в минулому.");
      setMessage("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      await createFreeHour({
        location,
        duration: Number(duration),
        date: `${date}T${time}:00`,
      });

      setMessage("Відкриту годину успішно додано.");
      setDate("");
      setTime("");
      setLocation("awf");
      setDuration("60");
      await loadAdminData();
    } catch (submitError) {
      console.error("Failed to create free hour:", submitError);
      setError("Не вдалося додати free hour. Спробуйте ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (freeHour: FreeHour) => {
    const overlappingLesson = findOverlappingLesson(freeHour, futureLessons);
    const confirmed = overlappingLesson
      ? window.confirm(
          `На ${formatDatePart(overlappingLesson.date)} о ${formatTimePart(
            overlappingLesson.date.includes("T") || overlappingLesson.date.includes(" ")
              ? overlappingLesson.date
              : `${overlappingLesson.date}T${overlappingLesson.time}:00`
          )} вже зарезервоване тренування тривалістю ${parseLessonDurationMinutes(
            overlappingLesson.duration
          )} хв. Видалити відкриту годину все одно?`
        )
      : window.confirm("Видалити цю відкриту годину?");

    if (!confirmed) return;

    try {
      setDeletingId(freeHour._id);
      setListError("");
      await deleteFreeHour(freeHour._id);
      setFreeHours((current) => current.filter((item) => item._id !== freeHour._id));
    } catch (deleteError) {
      console.error("Failed to delete free hour:", deleteError);
      setListError("Не вдалося видалити відкриту годину.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className={css.adminPage}>
      <form className={css.form} onSubmit={handleSubmit}>
        <div className={css.headingBlock}>
          <h1 className={css.title}>Додати free hour</h1>
          <p className={css.subtitle}>
            Оберіть дату, час, локацію та тривалість для нового вільного слоту.
          </p>
        </div>

        <label htmlFor="free-hour-date" className={css.label}>
          Дата
        </label>
        <input
          id="free-hour-date"
          type="date"
          value={date}
          ref={dateRef}
          onChange={(event) => handleDateChange(event.target.value)}
          onFocus={openDatePicker}
          onClick={openDatePicker}
          className={css.input}
          min={minDate}
          required
        />

        <label htmlFor="free-hour-time" className={css.label}>
          Час
        </label>
        <div className={css.selectField}>
          <NiceSelect
          id="free-hour-time"
          name="time"
          placeholder="Оберіть час"
          options={availableTimeOptions}
          defaultValue={time}
          onChange={setTime}
          required
        />
        </div>

        <label htmlFor="free-hour-location" className={css.label}>
          Локація
        </label>
        <div className={css.selectField}>
          <NiceSelect
            id="free-hour-location"
            name="location"
            placeholder="Оберіть локацію"
            options={locationOptions}
            defaultValue={location}
            onChange={(value) => setLocation(value as LessonLocation)}
            required
          />
        </div>

        <label htmlFor="free-hour-duration" className={css.label}>
          Тривалість у хвилинах
        </label>
        <input
          id="free-hour-duration"
          type="number"
          min={30}
          step={30}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
          className={css.input}
          required
        />

        {message ? <p className={css.success}>{message}</p> : null}
        {error ? <p className={css.error}>{error}</p> : null}

        <button type="submit" className={css.submitButton} disabled={isSubmitting}>
          {isSubmitting ? "Збереження..." : "Додати free hour"}
        </button>
      </form>

      <section className={css.listSection}>
        <div className={css.sectionHead}>
          <h2 className={css.sectionTitle}>Відкриті години</h2>
          <p className={css.sectionHint}>Майбутні слоти, які можна скасувати.</p>
        </div>

        {freeHours.length > 0 ? (
          <ul className={css.freeHourList}>
            {freeHours.map((freeHour) => (
              <li key={freeHour._id} className={css.freeHourItem}>
                <div className={css.freeHourMeta}>
                  <span className={css.freeHourPrimary}>
                    {formatDatePart(freeHour.date)} • {formatTimePart(freeHour.date)}
                  </span>
                  <span className={css.freeHourSecondary}>
                    {locationLabels[freeHour.location]} • {freeHour.duration} хв
                  </span>
                </div>
                <button
                  type="button"
                  className={css.deleteButton}
                  onClick={() => handleDelete(freeHour)}
                  disabled={deletingId === freeHour._id}
                >
                  {deletingId === freeHour._id ? "Видалення..." : "Видалити"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={css.emptyState}>{listEmptyText}</p>
        )}

        {freeHours.length > 0 && listError ? <p className={css.error}>{listError}</p> : null}
      </section>
    </div>
  );
}
