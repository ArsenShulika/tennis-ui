import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createFreeHour, deleteFreeHour, GetFreeHours } from "../../api/freeHours";
import { GetAllLessons } from "../../api/lessonsapi";
import CustomDatePicker from "../../components/shared/CustomDatePicker/CustomDatePicker";
import CustomDropdownSelect from "../../components/shared/CustomDropdownSelect/CustomDropdownSelect";
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
  const [searchParams, setSearchParams] = useSearchParams();
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

  const presetDate = searchParams.get("date") ?? "";
  const presetTime = searchParams.get("time") ?? "";
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
  const durationValue = Number(duration);
  const isDurationStepValid =
    duration.trim() !== "" && Number.isFinite(durationValue) && durationValue % 30 === 0;
  const durationStepHint =
    duration.trim() !== "" && !isDurationStepValid
      ? "Đ˘Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ ĐĽĐ°Ń” Đ±ŃŃ‚Đ¸ ĐşŃ€Đ°Ń‚Đ˝ĐľŃŽ 30 Ń…Đ˛. ĐťĐ°ĐżŃ€Đ¸ĐşĐ»Đ°Đ´: 30, 60, 90."
      : "";

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

  useEffect(() => {
    if (!presetDate || !presetTime) return;

    const selectedDateTime = parseDateTime(`${presetDate}T${presetTime}:00`);
    if (!selectedDateTime || selectedDateTime.getTime() < Date.now()) {
      setSearchParams({}, { replace: true });
      return;
    }

    setDate(presetDate);
    setTime(presetTime);
    setDuration(String(MIN_LESSON_MINUTES));
    setMessage("");
    setError("");

    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    setSearchParams({}, { replace: true });
  }, [presetDate, presetTime, setSearchParams]);

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
    if (isLoadingList) return "Đ—Đ°Đ˛Đ°Đ˝Ń‚Đ°Đ¶ĐµĐ˝Đ˝ŃŹ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸Ń… ĐłĐľĐ´Đ¸Đ˝...";
    if (listError) return listError;
    return "ĐťĐ°Ń€Đ°Đ·Ń– Đ˝ĐµĐĽĐ°Ń” Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸Ń… ĐłĐľĐ´Đ¸Đ˝.";
  }, [isLoadingList, listError]);

  const handleDateChange = (nextValue: string) => {
    setDate(nextValue);
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

    if (maxDurationMinutes < MIN_LESSON_MINUTES) {
      setError(
        "Đ¦ĐµĐą Ń‡Đ°Ń Đ˝ĐµĐ´ĐľŃŃ‚ŃĐżĐ˝Đ¸Đą Đ´Đ»ŃŹ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Ń‚ŃŹ, Đ±Đľ ŃĐ»ĐľŃ‚ ĐżĐµŃ€ĐµŃ‚Đ˝ĐµŃ‚ŃŚŃŃŹ Đ· ŃĐ¶Đµ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸ĐĽĐ¸ Đ°Đ±Đľ Đ·Đ°Đ±Ń€ĐľĐ˝ŃŚĐľĐ˛Đ°Đ˝Đ¸ĐĽĐ¸ ĐłĐľĐ´Đ¸Đ˝Đ°ĐĽĐ¸."
      );
      setMessage("");
      return;
    }

    if (Number(duration) < MIN_LESSON_MINUTES) {
      setError(`ĐśŃ–Đ˝Ń–ĐĽĐ°Đ»ŃŚĐ˝Đ° Ń‚Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ Ń‚Ń€ĐµĐ˝ŃĐ˛Đ°Đ˝Đ˝ŃŹ ŃŃ‚Đ°Đ˝ĐľĐ˛Đ¸Ń‚ŃŚ ${MIN_LESSON_MINUTES} Ń…Đ˛.`);
      setMessage("");
      return;
    }

    if (!isDurationStepValid) {
      setError("Đ˘Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ ĐĽĐ°Ń” Đ±ŃŃ‚Đ¸ ĐşŃ€Đ°Ń‚Đ˝ĐľŃŽ 30 Ń…Đ˛.");
      setMessage("");
      return;
    }

    if (Number(duration) > maxDurationMinutes) {
      setError(
        `Đ˘Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ Đ˝Đµ ĐĽĐľĐ¶Đµ ĐżĐµŃ€ĐµĐ˛Đ¸Ń‰ŃĐ˛Đ°Ń‚Đ¸ ${maxDurationMinutes} Ń…Đ˛, Ń‰ĐľĐ± Đ˝Đµ ĐżĐµŃ€ĐµĐşŃ€Đ¸Đ˛Đ°Ń‚Đ¸ Đ˛Đ¶Đµ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Ń– Đ°Đ±Đľ Đ·Đ°Đ±Ń€ĐľĐ˝ŃŚĐľĐ˛Đ°Đ˝Ń– ŃĐ»ĐľŃ‚Đ¸.`
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

      setMessage("ĐˇĐ»ĐľŃ‚ Đ´ĐľŃŃ‚ŃĐżĐ˝ĐľŃŃ‚Ń– ŃŃĐżŃ–ŃĐ˝Đľ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đľ.");
      setDate("");
      setTime("");
      setLocation("awf");
      setDuration(String(MIN_LESSON_MINUTES));
      await loadAdminData();
    } catch (submitError) {
      console.error("Failed to create free hour:", submitError);
      setError("ĐťĐµ Đ˛Đ´Đ°Đ»ĐľŃŃŹ Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸ ŃĐ»ĐľŃ‚ Đ´ĐľŃŃ‚ŃĐżĐ˝ĐľŃŃ‚Ń–. ĐˇĐżŃ€ĐľĐ±ŃĐąŃ‚Đµ Ń‰Đµ Ń€Đ°Đ·.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (freeHour: FreeHour) => {
    const overlappingLesson = findOverlappingLesson(freeHour, futureLessons);
    if (Boolean(overlappingLesson)) {
      setListError(
        `ĐťĐµĐĽĐľĐ¶Đ»Đ¸Đ˛Đľ Đ·Đ°ĐşŃ€Đ¸Ń‚Đ¸ ŃĐ»ĐľŃ‚ Đ˝Đ° ${formatDatePart(freeHour.date)} Đľ ${formatTimePart(
          freeHour.date
        )}, Đ±Đľ Đ˝Đ° Ń†ĐµĐą Ń‡Đ°Ń ŃĐ¶Đµ Ń” Đ·Đ°Đ±Ń€ĐľĐ˝ŃŚĐľĐ˛Đ°Đ˝Đµ Ń‚Ń€ĐµĐ˝ŃĐ˛Đ°Đ˝Đ˝ŃŹ. ĐˇĐżĐľŃ‡Đ°Ń‚ĐşŃ ŃĐşĐ°ŃŃĐąŃ‚Đµ Đ±Ń€ĐľĐ˝ŃŽĐ˛Đ°Đ˝Đ˝ŃŹ.`
      );
      return;
    }
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
      <form ref={formRef} className={css.form} onSubmit={handleSubmit}>
        <div className={css.headingBlock}>
          <h1 className={css.title}>Đ’Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸ Đ˝ĐľĐ˛Ń– ŃĐ»ĐľŃ‚Đ¸</h1>
          <p className={css.subtitle}>
            ĐžĐ±ĐµŃ€Ń–Ń‚ŃŚ Đ´Đ°Ń‚Ń, Ń‡Đ°Ń, Đ»ĐľĐşĐ°Ń†Ń–ŃŽ Ń‚Đ° Ń‚Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ, Ń‰ĐľĐ± Đ˛Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸ Đ˝ĐľĐ˛Đ¸Đą ŃĐ»ĐľŃ‚ Đ´Đ»ŃŹ
            Đ±Ń€ĐľĐ˝ŃŽĐ˛Đ°Đ˝Đ˝ŃŹ.
          </p>
        </div>

        <label htmlFor="free-hour-date" className={css.label}>
          Дата:
        </label>
        <div className={css.selectField}>
          <CustomDatePicker
            id="free-hour-date"
            value={date}
            onChange={handleDateChange}
            minDate={minDate}
            label="Дата:"
          />
        </div>

        <label htmlFor="free-hour-time" className={css.label}>
          Час:
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="free-hour-time"
            value={time}
            placeholder="ĐžĐ±ĐµŃ€Ń–Ń‚ŃŚ Ń‡Đ°Ń"
            options={availableTimeOptions}
            onChange={setTime}
            emptyText="ĐťĐµĐĽĐ°Ń” Đ´ĐľŃŃ‚ŃĐżĐ˝ĐľĐłĐľ Ń‡Đ°ŃŃ"
          />
        </div>

        <label htmlFor="free-hour-location" className={css.label}>
          Локація:
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="free-hour-location"
            value={location}
            placeholder="ĐžĐ±ĐµŃ€Ń–Ń‚ŃŚ Đ»ĐľĐşĐ°Ń†Ń–ŃŽ"
            options={locationOptions}
            onChange={(value) => setLocation(value as LessonLocation)}
            emptyText="ĐťĐµĐĽĐ°Ń” Đ´ĐľŃŃ‚ŃĐżĐ˝Đ¸Ń… Đ»ĐľĐşĐ°Ń†Ń–Đą"
          />
        </div>

        <label htmlFor="free-hour-duration" className={css.label}>
          Тривалість:
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
            inputMode="numeric"
            aria-invalid={Boolean(durationStepHint)}
            placeholder="ĐťĐ°ĐżŃ€Đ¸ĐşĐ»Đ°Đ´: 30, 60, 90"
            required
          />
        </div>
        <p className={css.fieldHint}>Đ’Đ˛ĐµĐ´Ń–Ń‚ŃŚ Ń‚Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ Ń Ń…Đ˛Đ¸Đ»Đ¸Đ˝Đ°Ń…. Đ—Đ˝Đ°Ń‡ĐµĐ˝Đ˝ŃŹ ĐĽĐ°Ń” Đ±ŃŃ‚Đ¸ ĐşŃ€Đ°Ń‚Đ˝Đ¸ĐĽ 30.</p>
        {durationStepHint ? <p className={css.fieldHintError}>{durationStepHint}</p> : null}

        {time && maxDurationMinutes > 0 ? (
          <p className={css.sectionHint}>
            ĐśĐ°ĐşŃĐ¸ĐĽĐ°Đ»ŃŚĐ˝Đ° Ń‚Ń€Đ¸Đ˛Đ°Đ»Ń–ŃŃ‚ŃŚ Đ´Đ»ŃŹ Ń†ŃŚĐľĐłĐľ ŃŃ‚Đ°Ń€Ń‚Ń: {maxDurationMinutes} Ń…Đ˛.
          </p>
        ) : null}

        {message ? <p className={css.success}>{message}</p> : null}
        {error ? <p className={css.error}>{error}</p> : null}

        <button type="submit" className={css.submitButton} disabled={isSubmitting}>
          {isSubmitting ? "Đ—Đ±ĐµŃ€ĐµĐ¶ĐµĐ˝Đ˝ŃŹ..." : "Đ’Ń–Đ´ĐşŃ€Đ¸Ń‚Đ¸ ŃĐ»ĐľŃ‚"}
        </button>
      </form>

      <section className={css.listSection}>
        <div className={css.sectionHead}>
          <h2 className={css.sectionTitle}>Đ’Ń–Đ´ĐşŃ€Đ¸Ń‚Ń– ŃĐ»ĐľŃ‚Đ¸</h2>
          <p className={css.sectionHint}>
            ĐśĐ°ĐąĐ±ŃŃ‚Đ˝Ń– Ń–Đ˝Ń‚ĐµŃ€Đ˛Đ°Đ»Đ¸, ŃŹĐşŃ– Đ˛Đ¶Đµ Đ´ĐľŃŃ‚ŃĐżĐ˝Ń– Đ´Đ»ŃŹ Đ±Ń€ĐľĐ˝ŃŽĐ˛Đ°Đ˝Đ˝ŃŹ.
          </p>
        </div>

        {freeHours.length > 0 ? (
          <ul className={css.freeHourList}>
            {freeHours.map((freeHour) => {
              const overlappingLesson = findOverlappingLesson(freeHour, futureLessons);
              const isDeleteDisabled =
                deletingId === freeHour._id || Boolean(overlappingLesson);

	              return (
	                <li key={freeHour._id} className={css.freeHourItem}>
                <div className={css.freeHourMeta}>
                  <span className={css.freeHourPrimary}>
                    {formatDatePart(freeHour.date)} â€˘ {formatTimePart(freeHour.date)}
                  </span>
                  <span className={css.freeHourSecondary}>
                    {locationLabels[freeHour.location]} â€˘ {freeHour.duration} Ń…Đ˛
                  </span>
                  {overlappingLesson ? (
                    <span className={css.freeHourSecondary}>
                      ĐˇĐżĐľŃ‡Đ°Ń‚ĐşŃ ŃĐşĐ°ŃŃĐąŃ‚Đµ Đ·Đ°Đ±Ń€ĐľĐ˝ŃŚĐľĐ˛Đ°Đ˝Đµ Ń‚Ń€ĐµĐ˝ŃĐ˛Đ°Đ˝Đ˝ŃŹ, Ń‰ĐľĐ± Đ·Đ°ĐşŃ€Đ¸Ń‚Đ¸ Ń†ĐµĐą ŃĐ»ĐľŃ‚.
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={css.deleteButton}
                  onClick={() => handleDelete(freeHour)}
	                  disabled={isDeleteDisabled}
	                  title={
	                    overlappingLesson
	                      ? "ĐˇĐżĐľŃ‡Đ°Ń‚ĐşŃ ŃĐşĐ°ŃŃĐąŃ‚Đµ Đ·Đ°Đ±Ń€ĐľĐ˝ŃŚĐľĐ˛Đ°Đ˝Đµ Ń‚Ń€ĐµĐ˝ŃĐ˛Đ°Đ˝Đ˝ŃŹ, Đ° ĐżĐľŃ‚Ń–ĐĽ Đ·Đ°ĐşŃ€Đ¸ĐąŃ‚Đµ ŃĐ»ĐľŃ‚."
	                      : undefined
	                  }
	                >
                  {deletingId === freeHour._id ? "Đ’Đ¸Đ´Đ°Đ»ĐµĐ˝Đ˝ŃŹ..." : "Đ’Đ¸Đ´Đ°Đ»Đ¸Ń‚Đ¸"}
                </button>
	                </li>
	              );
	            })}
          </ul>
        ) : (
          <p className={css.emptyState}>{listEmptyText}</p>
        )}

        {freeHours.length > 0 && listError ? <p className={css.error}>{listError}</p> : null}
      </section>
    </div>
  );
}
