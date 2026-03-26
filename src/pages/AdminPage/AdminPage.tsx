import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createFreeHour, deleteFreeHour, GetFreeHours } from "../../api/freeHours";
import { GetAllLessons } from "../../api/lessonsapi";
import Schedule from "../../components/sections/schedule/Schedule/Schedule";
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

const HOURS_END_MINUTES = 22 * 60;
const MIN_LESSON_MINUTES = 30;

const locationLabels: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

function parseDateTime(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) {
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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

function addMinutes(time: string, minutesToAdd: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;

  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
    totalMinutes % 60
  ).padStart(2, "0")}`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getMaxAvailableMinutes(time: string, blockedTimes: Set<string>) {
  if (!time || blockedTimes.has(time)) return 0;

  const startMinutes = timeToMinutes(time);
  let nextBlockedMinutes = HOURS_END_MINUTES;

  blockedTimes.forEach((blockedTime) => {
    const blockedMinutes = timeToMinutes(blockedTime);
    if (blockedMinutes > startMinutes && blockedMinutes < nextBlockedMinutes) {
      nextBlockedMinutes = blockedMinutes;
    }
  });

  return Math.max(0, nextBlockedMinutes - startMinutes);
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
  const [duration, setDuration] = useState(String(MIN_LESSON_MINUTES));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [freeHours, setFreeHours] = useState<FreeHour[]>([]);
  const [futureLessons, setFutureLessons] = useState<Lesson[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);

  const now = new Date();
  const minDate = formatDateInputValue(now);
  const minTime = date === minDate ? formatTimeInputValue(now) : undefined;

  const blockedTimeValues = useMemo(() => {
    if (!date) return new Set<string>();

    const blockedTimes = new Set<string>();

    freeHours.forEach((freeHour) => {
      if (freeHour.location !== location) return;
      if (formatDatePart(freeHour.date) !== date) return;

      const startTime = formatTimePart(freeHour.date);
      const slotsCount = Math.max(1, Math.ceil(freeHour.duration / 30));

      for (let index = 0; index < slotsCount; index += 1) {
        blockedTimes.add(addMinutes(startTime, index * 30));
      }
    });

    futureLessons.forEach((lesson) => {
      if (lesson.location !== location) return;

      const lessonStart = getLessonStart(lesson);
      if (!lessonStart) return;
      if (formatDateInputValue(lessonStart) !== date) return;

      const startTime = formatTimeInputValue(lessonStart);
      const slotsCount = Math.max(1, Math.ceil(parseLessonDurationMinutes(lesson.duration) / 30));

      for (let index = 0; index < slotsCount; index += 1) {
        blockedTimes.add(addMinutes(startTime, index * 30));
      }
    });

    return blockedTimes;
  }, [date, freeHours, futureLessons, location]);

  const availableTimeOptions = useMemo(
    () =>
      timeOptions
        .filter((option) => !minTime || option.value >= minTime)
        .map((option) => {
          const maxMinutes = getMaxAvailableMinutes(option.value, blockedTimeValues);
          return {
            ...option,
            disabled: maxMinutes < MIN_LESSON_MINUTES,
          };
        }),
    [blockedTimeValues, minTime]
  );

  const maxDurationMinutes = useMemo(
    () => getMaxAvailableMinutes(time, blockedTimeValues),
    [blockedTimeValues, time]
  );

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

  useEffect(() => {
    if (time && maxDurationMinutes < MIN_LESSON_MINUTES) {
      setTime("");
    }
  }, [maxDurationMinutes, time]);

  useEffect(() => {
    if (!duration) return;

    const normalizedDuration = Number(duration);
    if (!Number.isFinite(normalizedDuration)) return;

    if (normalizedDuration < MIN_LESSON_MINUTES) {
      setDuration(String(MIN_LESSON_MINUTES));
      return;
    }

    if (maxDurationMinutes > 0 && normalizedDuration > maxDurationMinutes) {
      setDuration(String(maxDurationMinutes));
    }
  }, [duration, maxDurationMinutes]);

  const listEmptyText = useMemo(() => {
    if (isLoadingList) return "Завантаження відкритих годин...";
    if (listError) return listError;
    return "Наразі немає відкритих годин.";
  }, [isLoadingList, listError]);

  const openDatePicker = () => {
    const element = dateRef.current as unknown as { showPicker?: () => void } | null;
    try {
      element?.showPicker?.();
    } catch {
      // Ignore browsers that do not allow programmatic picker opening here.
    }
  };

  const handleDateChange = (nextValue: string) => {
    setDate(nextValue);
    window.setTimeout(() => {
      dateRef.current?.blur();
    }, 0);
  };

  const handleCalendarSlotSelect = ({ date: nextDate, time: nextTime }: {
    date: string;
    time: string;
  }) => {
    const selectedDateTime = parseDateTime(`${nextDate}T${nextTime}:00`);
    if (!selectedDateTime || selectedDateTime.getTime() < Date.now()) return;

    setDate(nextDate);
    setTime(nextTime);
    setDuration(String(MIN_LESSON_MINUTES));
    setMessage("");
    setError("");

    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

    if (maxDurationMinutes < MIN_LESSON_MINUTES) {
      setError(
        "Цей час недоступний для відкриття, бо слот перетнеться з уже відкритими або заброньованими годинами."
      );
      setMessage("");
      return;
    }

    if (Number(duration) < MIN_LESSON_MINUTES) {
      setError(`Мінімальна тривалість тренування становить ${MIN_LESSON_MINUTES} хв.`);
      setMessage("");
      return;
    }

    if (Number(duration) > maxDurationMinutes) {
      setError(
        `Тривалість не може перевищувати ${maxDurationMinutes} хв, щоб не перекривати вже відкриті або заброньовані слоти.`
      );
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

      setMessage("Слот доступності успішно відкрито.");
      setDate("");
      setTime("");
      setLocation("awf");
      setDuration(String(MIN_LESSON_MINUTES));
      await loadAdminData();
    } catch (submitError) {
      console.error("Failed to create free hour:", submitError);
      setError("Не вдалося відкрити слот доступності. Спробуйте ще раз.");
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
      <section className={css.calendarSection}>
        <div className={css.sectionHead}>
          <h1 className={css.sectionTitle}>Календар слотів</h1>
          <p className={css.sectionHint}>
            Натисніть на майбутню клітинку зі статусом "Недоступно", щоб одразу
            підставити дату та час у форму відкриття.
          </p>
        </div>
        <Schedule mode="admin" onAdminSlotSelect={handleCalendarSlotSelect} />
      </section>

      <form ref={formRef} className={css.form} onSubmit={handleSubmit}>
        <div className={css.headingBlock}>
          <h1 className={css.title}>Відкрити нові слоти</h1>
          <p className={css.subtitle}>
            Оберіть дату, час, локацію та тривалість, щоб відкрити новий слот для бронювання.
          </p>
        </div>

        <label htmlFor="free-hour-date" className={css.label}>
          Дата
        </label>
        <div className={css.selectField}>
          <input
            id="free-hour-date"
            type="date"
            value={date}
            ref={dateRef}
            onChange={(event) => handleDateChange(event.target.value)}
            onPointerDown={openDatePicker}
            className={css.input}
            min={minDate}
            required
          />
        </div>

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
        <div className={css.selectField}>
          <input
            id="free-hour-duration"
            type="number"
            min={MIN_LESSON_MINUTES}
            step={30}
            max={maxDurationMinutes || undefined}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className={css.input}
            required
          />
        </div>

        {time && maxDurationMinutes > 0 ? (
          <p className={css.sectionHint}>Максимальна тривалість для цього старту: {maxDurationMinutes} хв.</p>
        ) : null}

        {message ? <p className={css.success}>{message}</p> : null}
        {error ? <p className={css.error}>{error}</p> : null}

        <button type="submit" className={css.submitButton} disabled={isSubmitting}>
          {isSubmitting ? "Збереження..." : "Відкрити слот"}
        </button>
      </form>

      <section className={css.listSection}>
        <div className={css.sectionHead}>
          <h2 className={css.sectionTitle}>Відкриті слоти</h2>
          <p className={css.sectionHint}>Майбутні інтервали, які вже доступні для бронювання.</p>
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
