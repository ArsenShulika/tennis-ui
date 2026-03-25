import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GetFreeHours } from "../../../../api/freeHours";
import { createLesson, GetAllLessons } from "../../../../api/lessonsapi";
import { FreeHour } from "../../../../types/freeHour";
import {
  Lesson,
  LessonDuration,
  LessonLocation,
  LessonType,
  NewLesson,
} from "../../../../types/lesson";
import { useTelegramUser } from "../../../../hooks/useTelegramUser";
import NiceSelect from "../../../shared/NiceSelect/NiceSelect";
import css from "./BookingForm.module.css";

type SlotStatus = "busy" | "free" | "booked";
type DayGrid = Record<LessonLocation, Record<string, SlotStatus>>;
type BookingSlot = {
  value: string;
  time: string;
  location: LessonLocation;
  availableMinutes: number;
};

const HOURS_START = 8;
const HOURS_END = 22;

const LOCATION_LABELS: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

const DURATION_OPTIONS: Array<{
  value: LessonDuration;
  label: string;
  minutes: number;
}> = [
  { value: "m60", label: "60 хв", minutes: 60 },
  { value: "m90", label: "90 хв", minutes: 90 },
  { value: "m120", label: "120 хв", minutes: 120 },
];

const LESSON_TYPE_OPTIONS = [
  { value: "individual", label: "Індивідуальне заняття" },
  { value: "split", label: "Спліт заняття (для двох)" },
];

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

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDateTime(d: Date) {
  return `${formatDate(d)}T${formatTime(d)}:${pad2(d.getSeconds())}`;
}

function parseServerDateTime(value: string) {
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

function createBlockedDayGrid(): DayGrid {
  return {
    awf: Object.fromEntries(TIME_SLOTS.map((slot) => [slot, "busy" as const])),
    gem: Object.fromEntries(TIME_SLOTS.map((slot) => [slot, "busy" as const])),
    oko: Object.fromEntries(TIME_SLOTS.map((slot) => [slot, "busy" as const])),
  };
}

function applyIntervalToDayGrid(
  grid: DayGrid,
  location: LessonLocation,
  start: Date,
  durationMinutes: number,
  status: Exclude<SlotStatus, "busy">
) {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  TIME_SLOTS.forEach((slotTime) => {
    const slotStart = createSlotDate(formatDate(start), slotTime);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    if (slotStart < end && slotEnd > start) {
      grid[location][slotTime] = status;
    }
  });
}

function addFreeHourToGrid(grid: DayGrid, freeHour: FreeHour) {
  const start = parseServerDateTime(freeHour.date);
  if (!start) return;

  applyIntervalToDayGrid(grid, freeHour.location, start, freeHour.duration, "free");
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
    start,
    getLessonDurationMinutes(lesson.duration),
    "booked"
  );
}

function buildBookingSlots(grid: DayGrid, selectedDate: string) {
  const result: BookingSlot[] = [];
  const now = new Date();
  const today = formatDate(now);

  (Object.keys(grid) as LessonLocation[]).forEach((location) => {
    TIME_SLOTS.forEach((slotTime, index) => {
      if (grid[location][slotTime] !== "free") return;

      const slotStart = createSlotDate(selectedDate, slotTime);
      if (selectedDate === today && slotStart.getTime() < now.getTime()) return;

      let consecutiveSlots = 0;
      for (let cursor = index; cursor < TIME_SLOTS.length; cursor += 1) {
        if (grid[location][TIME_SLOTS[cursor]] !== "free") break;
        consecutiveSlots += 1;
      }

      const availableMinutes = consecutiveSlots * 30;
      const hasSupportedDuration = DURATION_OPTIONS.some(
        (option) => option.minutes <= availableMinutes
      );

      if (!hasSupportedDuration) return;

      result.push({
        value: `${slotTime}|${location}`,
        time: slotTime,
        location,
        availableMinutes,
      });
    });
  });

  return result.sort((a, b) => a.value.localeCompare(b.value));
}

function isLessonLocation(value: string | null): value is LessonLocation {
  return value === "awf" || value === "gem" || value === "oko";
}

export default function BookingForm() {
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
  const dateRef = useRef<HTMLInputElement | null>(null);
  const minDate = formatDate(new Date());

  const presetDate = searchParams.get("date") ?? "";
  const presetTime = searchParams.get("time") ?? "";
  const presetLocation = searchParams.get("location");
  const presetSlotValue =
    presetTime && isLessonLocation(presetLocation) ? `${presetTime}|${presetLocation}` : "";

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
        label: `${slot.time} • ${LOCATION_LABELS[slot.location]}`,
      })),
    [availableSlots]
  );

  const durationOptions = useMemo(() => {
    const maxDuration = selectedSlot?.availableMinutes ?? 0;

    return DURATION_OPTIONS.filter((option) => option.minutes <= maxDuration).map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }, [selectedSlot]);

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
      setLoadError("Не можна резервувати дату в минулому.");
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

        const nextGrid = createBlockedDayGrid();

        freeHoursResponse.freeHours.forEach((freeHour) => {
          addFreeHourToGrid(nextGrid, freeHour);
        });

        lessonsResponse.lessons.forEach((lesson) => {
          addLessonToGrid(nextGrid, lesson);
        });

        const nextSlots = buildBookingSlots(nextGrid, date);
        setAvailableSlots(nextSlots);

        if (presetSlotValue && nextSlots.some((slot) => slot.value === presetSlotValue)) {
          setSelectedSlotValue(presetSlotValue);
        }
      } catch (error) {
        console.error("Failed to load booking availability:", error);
        setAvailableSlots([]);
        setLoadError("Не вдалося завантажити доступні години.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [date, minDate, presetSlotValue]);

  const handleDatePointerUp = (event: PointerEvent<HTMLInputElement>) => {
    const element = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    element.showPicker?.();
  };

  const handleDateChange = (nextValue: string) => {
    setDate(nextValue);
    window.setTimeout(() => {
      dateRef.current?.blur();
    }, 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!date || !selectedSlot) {
      setSubmitError("Оберіть дату та доступний час.");
      setSubmitMessage("");
      return;
    }

    const selectedDateTime = createSlotDate(date, selectedSlot.time);
    if (selectedDateTime.getTime() < Date.now()) {
      setSubmitError("Не можна резервувати час у минулому.");
      setSubmitMessage("");
      return;
    }

    setSubmitError("");
    setSubmitMessage("");

    const lesson: NewLesson = {
      date: `${date} ${selectedSlot.time}`,
      time: selectedSlot.time,
      location: selectedSlot.location,
      duration,
      typeOfLesson,
      multisport,
      telegramUserId: telegramUserId ?? undefined,
    };

    try {
      await createLesson(lesson);
      setSubmitMessage("Бронювання створено.");
      setSelectedSlotValue("");
      setMultisport(false);
      setTypeOfLesson("individual");
    } catch (error) {
      console.error("Failed to create lesson:", error);
      setSubmitError("Не вдалося створити бронювання.");
    }
  };

  return (
    <form className={css.bookingForm} onSubmit={handleSubmit}>
      <label htmlFor="date">Дата:</label>
      <input
        type="date"
        name="date"
        id="date"
        value={date}
        ref={dateRef}
        onChange={(event) => handleDateChange(event.target.value)}
        onPointerUp={handleDatePointerUp}
        min={minDate}
        required
      />

      <label htmlFor="time">Час:</label>
      <div className={css.selectField}>
        <NiceSelect
          id="time"
          name="time"
          placeholder={isLoading ? "Завантаження..." : "Оберіть час"}
          options={timeOptions}
          defaultValue={selectedSlotValue}
          onChange={setSelectedSlotValue}
          required
        />
      </div>

      <label htmlFor="location">Локація:</label>
      <input
        id="location"
        type="text"
        value={selectedSlot ? LOCATION_LABELS[selectedSlot.location] : ""}
        placeholder="Локація визначається автоматично"
        className={css.readonlyField}
        readOnly
      />

      <label htmlFor="duration">Тривалість:</label>
      <div className={css.selectField}>
        <NiceSelect
          id="duration"
          name="duration"
          placeholder="Виберіть тривалість заняття"
          options={durationOptions}
          defaultValue={durationValueForSelect}
          onChange={(value) => setDuration(value as LessonDuration)}
          required
        />
      </div>

      <label htmlFor="typeOfLesson">Тип заняття:</label>
      <div className={css.selectField}>
        <NiceSelect
          id="typeOfLesson"
          name="typeOfLesson"
          placeholder="Оберіть тип заняття"
          options={LESSON_TYPE_OPTIONS}
          defaultValue={typeOfLesson}
          onChange={(value) => setTypeOfLesson(value as LessonType)}
        />
      </div>

      <div className={css.checkboxRow}>
        <label htmlFor="multisport">Картка MultiSport</label>
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
        <p className={css.hint}>На цю дату немає доступних слотів.</p>
      ) : null}
      {selectedSlot ? (
        <p className={css.hint}>
          Доступно до {selectedSlot.availableMinutes} хв у вибраному слоті.
        </p>
      ) : null}
      {submitError ? <p className={css.hintError}>{submitError}</p> : null}
      {submitMessage ? <p className={css.hintSuccess}>{submitMessage}</p> : null}

      <button type="submit" disabled={!selectedSlot || isLoading}>
        Підтвердити бронювання
      </button>
    </form>
  );
}
