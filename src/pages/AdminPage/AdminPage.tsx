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
      setListError("ĐťĐµ Đ˛Đ´Đ°Đ»ĐľŃŃŹ Đ·Đ°Đ˛Đ°Đ˝Ń‚Đ°Đ¶Đ¸Ń‚Đ¸ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Ń– ĐłĐľĐ´Đ¸Đ˝Đ¸.");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const listEmptyText = useMemo(() => {
    if (isLoadingList) return "Đ—Đ°Đ˛Đ°Đ˝Ń‚Đ°Đ¶ĐµĐ˝Đ˝ŃŹ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸Ń… ĐłĐľĐ´Đ¸Đ˝...";
    if (listError) return listError;
    return "ĐťĐ°Ń€Đ°Đ·Ń– Đ˝ĐµĐĽĐ°Ń” Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸Ń… ĐłĐľĐ´Đ¸Đ˝.";
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
      setError("ĐžĐ±ĐµŃ€Ń–Ń‚ŃŚ Đ´Đ°Ń‚Ń Ń‚Đ° Ń‡Đ°Ń.");
      setMessage("");
      return;
    }

    const selectedDateTime = parseDateTime(`${date}T${time}:00`);
    if (!selectedDateTime || selectedDateTime.getTime() < Date.now()) {
      setError("ĐťĐµ ĐĽĐľĐ¶Đ˝Đ° Đ˛Ń–Đ´ĐşŃ€Đ¸Đ˛Đ°Ń‚Đ¸ ĐłĐľĐ´Đ¸Đ˝Đ¸ Đ˛ ĐĽĐ¸Đ˝ŃĐ»ĐľĐĽŃ.");
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

      setMessage("Đ’Ń–Đ´ĐşŃ€Đ¸Ń‚Ń ĐłĐľĐ´Đ¸Đ˝Ń ŃŃĐżŃ–ŃĐ˝Đľ Đ´ĐľĐ´Đ°Đ˝Đľ.");
      setDate("");
      setTime("");
      setLocation("awf");
      setDuration("60");
      await loadAdminData();
    } catch (submitError) {
      console.error("Failed to create free hour:", submitError);
      setError("ĐťĐµ Đ˛Đ´Đ°Đ»ĐľŃŃŹ Đ´ĐľĐ´Đ°Ń‚Đ¸ free hour. ĐˇĐżŃ€ĐľĐ±ŃĐąŃ‚Đµ Ń‰Đµ Ń€Đ°Đ·.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (freeHour: FreeHour) => {
    const overlappingLesson = findOverlappingLesson(freeHour, futureLessons);
    const confirmed = overlappingLesson
      ? window.confirm(
          `ĐťĐ° ${formatDatePart(overlappingLesson.date)} Đľ ${formatTimePart(
            overlappingLesson.date.includes("T") || overlappingLesson.date.includes(" ")
              ? overlappingLesson.date
              : `${overlappingLesson.date}T${overlappingLesson.time}:00`
          )} Đ˛Đ¶Đµ Đ·Đ°Ń€ĐµĐ·ĐµŃ€Đ˛ĐľĐ˛Đ°Đ˝Đµ Ń‚Ń€ĐµĐ˝ŃĐ˛Đ°Đ˝Đ˝ŃŹ Ń‚Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŽ ${parseLessonDurationMinutes(
            overlappingLesson.duration
          )} Ń…Đ˛. Đ’Đ¸Đ´Đ°Đ»Đ¸Ń‚Đ¸ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Ń ĐłĐľĐ´Đ¸Đ˝Ń Đ˛ŃĐµ ĐľĐ´Đ˝Đľ?`
        )
      : window.confirm("Đ’Đ¸Đ´Đ°Đ»Đ¸Ń‚Đ¸ Ń†ŃŽ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Ń ĐłĐľĐ´Đ¸Đ˝Ń?");

    if (!confirmed) return;

    try {
      setDeletingId(freeHour._id);
      setListError("");
      await deleteFreeHour(freeHour._id);
      setFreeHours((current) => current.filter((item) => item._id !== freeHour._id));
    } catch (deleteError) {
      console.error("Failed to delete free hour:", deleteError);
      setListError("ĐťĐµ Đ˛Đ´Đ°Đ»ĐľŃŃŹ Đ˛Đ¸Đ´Đ°Đ»Đ¸Ń‚Đ¸ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Ń ĐłĐľĐ´Đ¸Đ˝Ń.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className={css.adminPage}>
      <form className={css.form} onSubmit={handleSubmit}>
        <div className={css.headingBlock}>
          <h1 className={css.title}>Đ”ĐľĐ´Đ°Ń‚Đ¸ free hour</h1>
          <p className={css.subtitle}>
            ĐžĐ±ĐµŃ€Ń–Ń‚ŃŚ Đ´Đ°Ń‚Ń, Ń‡Đ°Ń, Đ»ĐľĐşĐ°Ń†Ń–ŃŽ Ń‚Đ° Ń‚Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ Đ´Đ»ŃŹ Đ˝ĐľĐ˛ĐľĐłĐľ Đ˛Ń–Đ»ŃŚĐ˝ĐľĐłĐľ ŃĐ»ĐľŃ‚Ń.
          </p>
        </div>

        <label htmlFor="free-hour-date" className={css.label}>
          Đ”Đ°Ń‚Đ°
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
          Đ§Đ°Ń
        </label>
        <div className={css.selectField}>
          <NiceSelect
          id="free-hour-time"
          name="time"
          placeholder="ĐžĐ±ĐµŃ€Ń–Ń‚ŃŚ Ń‡Đ°Ń"
          options={availableTimeOptions}
          defaultValue={time}
          onChange={setTime}
          required
        />
        </div>

        <label htmlFor="free-hour-location" className={css.label}>
          Đ›ĐľĐşĐ°Ń†Ń–ŃŹ
        </label>
        <div className={css.selectField}>
          <NiceSelect
            id="free-hour-location"
            name="location"
            placeholder="ĐžĐ±ĐµŃ€Ń–Ń‚ŃŚ Đ»ĐľĐşĐ°Ń†Ń–ŃŽ"
            options={locationOptions}
            defaultValue={location}
            onChange={(value) => setLocation(value as LessonLocation)}
            required
          />
        </div>

        <label htmlFor="free-hour-duration" className={css.label}>
          Đ˘Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ Ń Ń…Đ˛Đ¸Đ»Đ¸Đ˝Đ°Ń…
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
          {isSubmitting ? "Đ—Đ±ĐµŃ€ĐµĐ¶ĐµĐ˝Đ˝ŃŹ..." : "Đ”ĐľĐ´Đ°Ń‚Đ¸ free hour"}
        </button>
      </form>

      <section className={css.listSection}>
        <div className={css.sectionHead}>
          <h2 className={css.sectionTitle}>Đ’Ń–Đ´ĐşŃ€Đ¸Ń‚Ń– ĐłĐľĐ´Đ¸Đ˝Đ¸</h2>
          <p className={css.sectionHint}>ĐśĐ°ĐąĐ±ŃŃ‚Đ˝Ń– ŃĐ»ĐľŃ‚Đ¸, ŃŹĐşŃ– ĐĽĐľĐ¶Đ˝Đ° ŃĐşĐ°ŃŃĐ˛Đ°Ń‚Đ¸.</p>
        </div>

        {freeHours.length > 0 ? (
          <ul className={css.freeHourList}>
            {freeHours.map((freeHour) => (
              <li key={freeHour._id} className={css.freeHourItem}>
                <div className={css.freeHourMeta}>
                  <span className={css.freeHourPrimary}>
                    {formatDatePart(freeHour.date)} â€˘ {formatTimePart(freeHour.date)}
                  </span>
                  <span className={css.freeHourSecondary}>
                    {locationLabels[freeHour.location]} â€˘ {freeHour.duration} Ń…Đ˛
                  </span>
                </div>
                <button
                  type="button"
                  className={css.deleteButton}
                  onClick={() => handleDelete(freeHour)}
                  disabled={deletingId === freeHour._id}
                >
                  {deletingId === freeHour._id ? "Đ’Đ¸Đ´Đ°Đ»ĐµĐ˝Đ˝ŃŹ..." : "Đ’Đ¸Đ´Đ°Đ»Đ¸Ń‚Đ¸"}
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
