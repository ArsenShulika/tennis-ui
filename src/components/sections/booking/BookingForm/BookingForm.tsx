import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GetFreeHours } from "../../../../api/freeHours";
import { createLesson, GetAllLessons } from "../../../../api/lessonsapi";
import { hydrateFreeHoursCourts } from "../../../../helpers/freeHourCourts";
import { buildLessonDateTime, parseApiDateTime } from "../../../../helpers/lessonDateTime";
import { hydrateLessonsCourts, saveLessonCourt } from "../../../../helpers/lessonCourts";
import { useLanguage } from "../../../../hooks/useLanguage";
import { useTelegramUser } from "../../../../hooks/useTelegramUser";
import { FreeHour } from "../../../../types/freeHour";
import {
  Lesson,
  LessonDuration,
  LessonLocation,
  LessonType,
  NewLesson,
} from "../../../../types/lesson";
import CustomDatePicker from "../../../shared/CustomDatePicker/CustomDatePicker";
import CustomDropdownSelect from "../../../shared/CustomDropdownSelect/CustomDropdownSelect";
import css from "./BookingForm.module.css";

type SlotStatus = "busy" | "free" | "booked";
type DayGrid = Record<string, Record<string, SlotStatus>>;
type BookingSlot = {
  value: string;
  time: string;
  location: LessonLocation;
  court: number;
  availableMinutes: number;
};

const HOURS_START = 8;
const HOURS_END = 22;

const LOCATION_LABELS: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

const TIME_SLOTS = createTimeSlots();

function createTimeSlots() {
  const result: string[] = [];

  for (let hour = HOURS_START; hour < HOURS_END; hour += 1) {
    for (let minutes = 0; minutes < 60; minutes += 30) {
      result.push(`${pad2(hour)}:${pad2(minutes)}`);
    }
  }

  return result;
}

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTime(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatDateTime(date: Date) {
  return `${formatDate(date)}T${formatTime(date)}:${pad2(date.getSeconds())}`;
}

const parseServerDateTime = parseApiDateTime;

function createSlotDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function createDayRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);

  return {
    fromDate: formatDateTime(start),
    toDate: formatDateTime(end),
  };
}

function getResourceKey(location: LessonLocation, court?: number) {
  return `${location}|${court ?? 1}`;
}

function parseResourceKey(resourceKey: string) {
  const [location, courtValue] = resourceKey.split("|");

  return {
    location: location as LessonLocation,
    court: Number(courtValue) || 1,
  };
}

function ensureResourceGrid(grid: DayGrid, resourceKey: string) {
  if (!grid[resourceKey]) {
    grid[resourceKey] = Object.fromEntries(TIME_SLOTS.map((slot) => [slot, "busy" as const]));
  }
}

function createBlockedDayGrid(freeHours: FreeHour[], lessons: Lesson[]): DayGrid {
  const grid: DayGrid = {};

  freeHours.forEach((freeHour) => {
    ensureResourceGrid(grid, getResourceKey(freeHour.location, freeHour.court));
  });

  lessons.forEach((lesson) => {
    ensureResourceGrid(grid, getResourceKey(lesson.location, lesson.court));
  });

  return grid;
}

function applyIntervalToDayGrid(
  grid: DayGrid,
  location: LessonLocation,
  court: number | undefined,
  start: Date,
  durationMinutes: number,
  status: Exclude<SlotStatus, "busy">
) {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const resourceKey = getResourceKey(location, court);

  ensureResourceGrid(grid, resourceKey);

  TIME_SLOTS.forEach((slotTime) => {
    const slotStart = createSlotDate(formatDate(start), slotTime);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    if (slotStart < end && slotEnd > start) {
      grid[resourceKey][slotTime] = status;
    }
  });
}

function addFreeHourToGrid(grid: DayGrid, freeHour: FreeHour) {
  const start = parseServerDateTime(freeHour.date);
  if (!start) return;

  applyIntervalToDayGrid(grid, freeHour.location, freeHour.court, start, freeHour.duration, "free");
}

function getLessonStart(lesson: Lesson) {
  if (lesson.date.includes("T") || lesson.date.includes(" ")) {
    return parseServerDateTime(lesson.date);
  }

  if (lesson.time) {
    return parseServerDateTime(`${lesson.date}T${lesson.time}:00`);
  }

  return parseServerDateTime(lesson.date);
}

function getLessonDurationMinutes(duration: LessonDuration) {
  const numericValue = Number(duration.slice(1));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function addLessonToGrid(grid: DayGrid, lesson: Lesson) {
  const start = getLessonStart(lesson);
  if (!start) return;

  applyIntervalToDayGrid(
    grid,
    lesson.location,
    lesson.court,
    start,
    getLessonDurationMinutes(lesson.duration),
    "booked"
  );
}

function buildBookingSlots(grid: DayGrid, selectedDate: string, durationOptions: number[]) {
  const result: BookingSlot[] = [];
  const now = new Date();
  const today = formatDate(now);

  Object.keys(grid).forEach((resourceKey) => {
    const { location, court } = parseResourceKey(resourceKey);

    TIME_SLOTS.forEach((slotTime, index) => {
      if (grid[resourceKey][slotTime] !== "free") return;

      const slotStart = createSlotDate(selectedDate, slotTime);
      if (selectedDate === today && slotStart.getTime() < now.getTime()) return;

      let consecutiveSlots = 0;
      for (let cursor = index; cursor < TIME_SLOTS.length; cursor += 1) {
        if (grid[resourceKey][TIME_SLOTS[cursor]] !== "free") break;
        consecutiveSlots += 1;
      }

      const availableMinutes = consecutiveSlots * 30;
      const hasSupportedDuration = durationOptions.some((option) => option <= availableMinutes);

      if (!hasSupportedDuration) return;

      result.push({
        value: `${slotTime}|${location}|${court}`,
        time: slotTime,
        location,
        court,
        availableMinutes,
      });
    });
  });

  return result.sort((left, right) => left.value.localeCompare(right.value));
}

function isLessonLocation(value: string | null): value is LessonLocation {
  return value === "awf" || value === "gem" || value === "oko";
}

export default function BookingForm() {
  const { t } = useLanguage();
  const { telegramUserId } = useTelegramUser();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState("");
  const [selectedSlotValue, setSelectedSlotValue] = useState("");
  const [duration, setDuration] = useState<LessonDuration>("m60");
  const [typeOfLesson, setTypeOfLesson] = useState<LessonType>("individual");
  const [multisport, setMultisport] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<BookingSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const minDate = formatDate(new Date());

  const durationDefinitions = useMemo(
    () => [
      { value: "m30" as LessonDuration, label: `30 ${t("common.minutesShort")}`, minutes: 30 },
      { value: "m60" as LessonDuration, label: `60 ${t("common.minutesShort")}`, minutes: 60 },
      { value: "m90" as LessonDuration, label: `90 ${t("common.minutesShort")}`, minutes: 90 },
      { value: "m120" as LessonDuration, label: `120 ${t("common.minutesShort")}`, minutes: 120 },
    ],
    [t]
  );
  const lessonTypeOptions = useMemo(
    () => [
      { value: "individual", label: t("booking.lessonTypes.individual") },
      { value: "split", label: t("booking.lessonTypes.split") },
    ],
    [t]
  );

  const presetDate = searchParams.get("date") ?? "";
  const presetTime = searchParams.get("time") ?? "";
  const presetLocation = searchParams.get("location");
  const presetCourt = searchParams.get("court");
  const presetSlotValue =
    presetTime && isLessonLocation(presetLocation)
      ? `${presetTime}|${presetLocation}${presetCourt ? `|${presetCourt}` : ""}`
      : "";

  useEffect(() => {
    if (presetDate && presetDate >= minDate) {
      setDate(presetDate);
    }
  }, [presetDate, minDate]);

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.value === selectedSlotValue) ?? null,
    [availableSlots, selectedSlotValue]
  );

  const timeOptions = useMemo(
    () =>
      availableSlots.map((slot) => ({
        value: slot.value,
        label: slot.time,
      })),
    [availableSlots]
  );

  const locationOptions = useMemo(
    () =>
      selectedSlot
        ? [
            {
              value: `${selectedSlot.location}|${selectedSlot.court}`,
              label: `${LOCATION_LABELS[selectedSlot.location]} | Court ${selectedSlot.court}`,
            },
          ]
        : [],
    [selectedSlot]
  );

  const durationOptions = useMemo(() => {
    const maxDuration = selectedSlot?.availableMinutes ?? 0;

    return durationDefinitions
      .filter((option) => option.minutes <= maxDuration)
      .map((option) => ({ value: option.value, label: option.label }));
  }, [durationDefinitions, selectedSlot]);

  const durationValueForSelect = durationOptions.some((option) => option.value === duration)
    ? duration
    : "";

  useEffect(() => {
    if (!durationOptions.some((option) => option.value === duration)) {
      setDuration((durationOptions[0]?.value as LessonDuration | undefined) ?? "m60");
    }
  }, [duration, durationOptions]);

  useEffect(() => {
    if (!date) {
      setAvailableSlots([]);
      setSelectedSlotValue("");
      setLoadError("");
      return;
    }

    if (date < minDate) {
      setAvailableSlots([]);
      setSelectedSlotValue("");
      setLoadError(t("booking.pastDateError"));
      return;
    }

    const loadAvailability = async () => {
      setIsLoading(true);
      setLoadError("");
      setSelectedSlotValue("");

      try {
        const { fromDate, toDate } = createDayRange(date);
        const [freeHoursResponse, lessonsResponse] = await Promise.all([
          GetFreeHours({ fromDate, toDate }),
          GetAllLessons({ fromDate, toDate }),
        ]);

        const hydratedFreeHours = hydrateFreeHoursCourts(freeHoursResponse.freeHours);
        const hydratedLessons = hydrateLessonsCourts(lessonsResponse.lessons);

        const nextGrid = createBlockedDayGrid(hydratedFreeHours, hydratedLessons);

        hydratedFreeHours.forEach((freeHour) => {
          addFreeHourToGrid(nextGrid, freeHour);
        });

        hydratedLessons.forEach((lesson) => {
          addLessonToGrid(nextGrid, lesson);
        });

        const nextSlots = buildBookingSlots(
          nextGrid,
          date,
          durationDefinitions.map((option) => option.minutes)
        );
        setAvailableSlots(nextSlots);

        if (presetSlotValue && nextSlots.some((slot) => slot.value === presetSlotValue)) {
          const matchingSlot = nextSlots.find((slot) => slot.value === presetSlotValue);
          setSelectedSlotValue(matchingSlot?.value ?? "");
        }
      } catch (error) {
        console.error("Failed to load booking availability:", error);
        setAvailableSlots([]);
        setLoadError(t("booking.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [availabilityVersion, date, durationDefinitions, minDate, presetSlotValue, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!date || !selectedSlot) {
      setSubmitError(t("booking.selectDateAndTime"));
      setSubmitMessage("");
      return;
    }

    const selectedDateTime = createSlotDate(date, selectedSlot.time);
    if (selectedDateTime.getTime() < Date.now()) {
      setSubmitError(t("booking.pastTimeError"));
      setSubmitMessage("");
      return;
    }

    setSubmitError("");
    setSubmitMessage("");

    const lesson: NewLesson = {
      date: buildLessonDateTime(date, selectedSlot.time),
      time: selectedSlot.time,
      location: selectedSlot.location,
      court: selectedSlot.court,
      duration,
      typeOfLesson,
      multisport,
      telegramUserId: telegramUserId ?? undefined,
    };

    try {
      saveLessonCourt({
        date: lesson.date ?? "",
        time: lesson.time,
        location: lesson.location ?? "awf",
        duration: lesson.duration ?? "m60",
        telegramUserId: lesson.telegramUserId,
        court: lesson.court ?? 1,
      });
      await createLesson(lesson);
      setSubmitMessage(t("booking.created"));
      setSelectedSlotValue("");
      setMultisport(false);
      setTypeOfLesson("individual");
      setAvailabilityVersion((current) => current + 1);
    } catch (error) {
      console.error("Failed to create lesson:", error);
      setSubmitError(t("booking.submitError"));
    }
  };

  return (
    <form className={css.bookingForm} onSubmit={handleSubmit}>
      <div className={css.headingBlock}>
        <h1 className={css.title}>{t("booking.title")}</h1>
      </div>

      <label htmlFor="date">{t("booking.dateLabel")}:</label>
      <div className={css.selectField}>
        <CustomDatePicker
          id="date"
          value={date}
          onChange={setDate}
          minDate={minDate}
          label={t("booking.dateLabel")}
        />
      </div>

      <label htmlFor="time">{t("booking.timeLabel")}:</label>
      <div className={css.selectField}>
        <CustomDropdownSelect
          id="time"
          value={selectedSlotValue}
          placeholder={isLoading ? t("common.loading") : t("booking.chooseTime")}
          options={timeOptions}
          onChange={setSelectedSlotValue}
          emptyText={t("booking.noSlotsForDate")}
          disabled={isLoading}
        />
      </div>

      <label htmlFor="location">{t("booking.locationLabel")}:</label>
      <div className={css.selectField}>
        <CustomDropdownSelect
          id="location"
          value={selectedSlot ? `${selectedSlot.location}|${selectedSlot.court}` : ""}
          placeholder={t("booking.autoLocation")}
          options={locationOptions}
          onChange={() => {}}
          emptyText={t("booking.chooseTimeForLocation")}
          disabled
        />
      </div>

      <label htmlFor="duration">{t("booking.durationLabel")}:</label>
      <div className={css.selectField}>
        <CustomDropdownSelect
          id="duration"
          value={durationValueForSelect}
          placeholder={t("booking.chooseDuration")}
          options={durationOptions}
          onChange={(value) => setDuration(value as LessonDuration)}
          emptyText={t("booking.noDuration")}
        />
      </div>

      <label htmlFor="typeOfLesson">{t("booking.lessonTypeLabel")}:</label>
      <div className={css.selectField}>
        <CustomDropdownSelect
          id="typeOfLesson"
          value={typeOfLesson}
          placeholder={t("booking.chooseLessonType")}
          options={lessonTypeOptions}
          onChange={(value) => setTypeOfLesson(value as LessonType)}
          emptyText={t("booking.noLessonTypes")}
        />
      </div>

      <div className={css.checkboxRow}>
        <label htmlFor="multisport">{t("booking.multisportLabel")}</label>
        <input
          type="checkbox"
          name="multisport"
          id="multisport"
          checked={multisport}
          onChange={(event) => setMultisport(event.target.checked)}
        />
      </div>

      {loadError ? <p className={css.hintError}>{loadError}</p> : null}
      {!loadError && date && !isLoading && timeOptions.length === 0 ? (
        <p className={css.hint}>{t("booking.noSlots")}</p>
      ) : null}
      {selectedSlot ? (
        <p className={css.hint}>
          {t("booking.availableUpTo", { minutes: selectedSlot.availableMinutes })}
        </p>
      ) : null}
      {submitError ? <p className={css.hintError}>{submitError}</p> : null}
      {submitMessage ? <p className={css.success}>{submitMessage}</p> : null}

      <button type="submit" disabled={!selectedSlot || isLoading}>
        {t("booking.submit")}
      </button>
    </form>
  );
}
