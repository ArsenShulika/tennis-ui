import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { createFreeHour, deleteFreeHour, GetFreeHours } from "../../api/freeHours";
import { GetAllLessons } from "../../api/lessonsapi";
import CustomDatePicker from "../../components/shared/CustomDatePicker/CustomDatePicker";
import CustomDropdownSelect from "../../components/shared/CustomDropdownSelect/CustomDropdownSelect";
import { useLanguage } from "../../hooks/useLanguage";
import { FreeHour } from "../../types/freeHour";
import { Lesson, LessonDuration, LessonLocation } from "../../types/lesson";
import css from "./AdminPage.module.css";

const HOURS_END_MINUTES = 22 * 60;
const MIN_LESSON_MINUTES = 30;

const locationLabels: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

const timeOptions = Array.from({ length: 28 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  const value = `${hours}:${minutes}`;
  return { value, label: value };
});

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
  const { t } = useLanguage();
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

  const locationOptions = useMemo(
    () => [
      { value: "awf", label: locationLabels.awf },
      { value: "gem", label: locationLabels.gem },
      { value: "oko", label: locationLabels.oko },
    ],
    []
  );
  const durationOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const minutes = (index + 1) * 30;
        return { value: String(minutes), label: `${minutes} ${t("common.minutesShort")}` };
      }),
    [t]
  );

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

  const availableDurationOptions = useMemo(
    () =>
      durationOptions.map((option) => ({
        ...option,
        disabled: !time || Number(option.value) > maxDurationMinutes,
      })),
    [durationOptions, maxDurationMinutes, time]
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
      setListError(t("admin.loadListError"));
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [t]);

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
    if (isLoadingList) return t("admin.loadingList");
    if (listError) return listError;
    return t("admin.emptyList");
  }, [isLoadingList, listError, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!date || !time) {
      setError(t("admin.selectDateTime"));
      setMessage("");
      return;
    }

    const selectedDateTime = parseDateTime(`${date}T${time}:00`);
    if (!selectedDateTime || selectedDateTime.getTime() < Date.now()) {
      setError(t("admin.pastSlotError"));
      setMessage("");
      return;
    }

    if (maxDurationMinutes < MIN_LESSON_MINUTES) {
      setError(t("admin.blockedTime"));
      setMessage("");
      return;
    }

    if (Number(duration) < MIN_LESSON_MINUTES) {
      setError(t("admin.minDuration", { minutes: MIN_LESSON_MINUTES }));
      setMessage("");
      return;
    }

    if (Number(duration) > maxDurationMinutes) {
      setError(t("admin.maxDurationError", { minutes: maxDurationMinutes }));
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

      setMessage(t("admin.slotOpened"));
      setDate("");
      setTime("");
      setLocation("awf");
      setDuration(String(MIN_LESSON_MINUTES));
      await loadAdminData();
    } catch (submitError) {
      console.error("Failed to create free hour:", submitError);
      setError(t("admin.openError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (freeHour: FreeHour) => {
    const overlappingLesson = findOverlappingLesson(freeHour, futureLessons);
    if (overlappingLesson) {
      setListError(
        t("admin.overlapError", {
          date: formatDatePart(freeHour.date),
          time: formatTimePart(freeHour.date),
        })
      );
      return;
    }

    const confirmed = window.confirm(t("admin.deleteConfirm"));
    if (!confirmed) return;

    try {
      setDeletingId(freeHour._id);
      setListError("");
      await deleteFreeHour(freeHour._id);
      setFreeHours((current) => current.filter((item) => item._id !== freeHour._id));
    } catch (deleteError) {
      console.error("Failed to delete free hour:", deleteError);
      setListError(t("admin.deleteError"));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className={css.adminPage}>
      <form ref={formRef} className={css.form} onSubmit={handleSubmit}>
        <div className={css.headingBlock}>
          <h1 className={css.title}>{t("admin.title")}</h1>
          <p className={css.subtitle}>{t("admin.subtitle")}</p>
        </div>

        <label htmlFor="free-hour-date" className={css.label}>
          {t("common.date")}:
        </label>
        <div className={css.selectField}>
          <CustomDatePicker
            id="free-hour-date"
            value={date}
            onChange={setDate}
            minDate={minDate}
            label={t("common.date")}
          />
        </div>

        <label htmlFor="free-hour-time" className={css.label}>
          {t("common.time")}:
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="free-hour-time"
            value={time}
            placeholder={t("admin.chooseTime")}
            options={availableTimeOptions}
            onChange={setTime}
            emptyText={t("admin.noTime")}
          />
        </div>

        <label htmlFor="free-hour-location" className={css.label}>
          {t("common.location")}:
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="free-hour-location"
            value={location}
            placeholder={t("admin.chooseLocation")}
            options={locationOptions}
            onChange={(value) => setLocation(value as LessonLocation)}
            emptyText={t("admin.noLocations")}
          />
        </div>

        <label htmlFor="free-hour-duration" className={css.label}>
          {t("common.duration")}:
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="free-hour-duration"
            value={duration}
            placeholder={t("admin.chooseDuration")}
            options={availableDurationOptions}
            onChange={setDuration}
            emptyText={t("admin.noDuration")}
          />
        </div>

        {time && maxDurationMinutes > 0 ? (
          <p className={css.sectionHint}>
            {t("admin.maxDuration", { minutes: maxDurationMinutes })}
          </p>
        ) : null}

        {message ? <p className={css.success}>{message}</p> : null}
        {error ? <p className={css.error}>{error}</p> : null}

        <button type="submit" className={css.submitButton} disabled={isSubmitting}>
          {isSubmitting ? t("common.saving") : t("admin.openSlot")}
        </button>
      </form>

      <section className={css.listSection}>
        <div className={css.sectionHead}>
          <h2 className={css.sectionTitle}>{t("admin.listTitle")}</h2>
          <p className={css.sectionHint}>{t("admin.listSubtitle")}</p>
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
                      {formatDatePart(freeHour.date)} • {formatTimePart(freeHour.date)}
                    </span>
                    <span className={css.freeHourSecondary}>
                      {locationLabels[freeHour.location]} • {freeHour.duration} {t("common.minutesShort")}
                    </span>
                    {overlappingLesson ? (
                      <span className={css.freeHourSecondary}>{t("admin.deleteHint")}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={css.deleteButton}
                    onClick={() => handleDelete(freeHour)}
                    disabled={isDeleteDisabled}
                    title={overlappingLesson ? t("admin.deleteHintTitle") : undefined}
                  >
                    {deletingId === freeHour._id ? t("common.deleting") : t("common.delete")}
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
