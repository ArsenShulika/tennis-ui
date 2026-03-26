import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GetFreeHours } from "../../../../api/freeHours";
import { GetAllLessons } from "../../../../api/lessonsapi";
import { FreeHour } from "../../../../types/freeHour";
import { Lesson, LessonLocation } from "../../../../types/lesson";
import css from "./Schedule.module.css";

type SlotStatus = "busy" | "free" | "booked";
type SlotCell = {
  status: SlotStatus;
  location?: LessonLocation;
  multisport?: boolean;
};
type ScheduleGrid = Record<string, Record<string, SlotCell>>;
type ScheduleMode = "user" | "admin";
type AdminSlotSelection = {
  date: string;
  time: string;
};
type ScheduleProps = {
  mode?: ScheduleMode;
  onAdminSlotSelect?: (slot: AdminSlotSelection) => void;
};

const HOURS_START = 8;
const HOURS_END = 22;
const MIN_BOOKING_DURATION_MINUTES = 60;

const LOCATION_LABELS: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

function pad2(n: number) {
  return n.toString().padStart(2, "0");
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

function getCurrentWeek(): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekRange(week: Date[]) {
  const start = new Date(week[0]);
  const end = new Date(week[week.length - 1]);
  end.setHours(23, 59, 59, 999);

  return {
    fromDate: formatDateTime(start),
    toDate: formatDateTime(end),
  };
}

function hoursRange() {
  const arr: string[] = [];

  for (let h = HOURS_START; h < HOURS_END; h++) {
    for (let m = 0; m < 60; m += 30) {
      arr.push(`${pad2(h)}:${pad2(m)}`);
    }
  }

  return arr;
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

function createSlotDate(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}:00`);
}

function getLessonDurationMinutes(duration: Lesson["duration"]) {
  const numericValue = Number(duration.slice(1));
  return Number.isNaN(numericValue) ? 0 : numericValue;
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

function applyIntervalToGrid(
  grid: ScheduleGrid,
  start: Date,
  durationMinutes: number,
  slotTimes: string[],
  status: Exclude<SlotStatus, "busy">,
  location: LessonLocation,
  multisport = false
) {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  Object.keys(grid).forEach((dateKey) => {
    slotTimes.forEach((slotTime) => {
      const slotStart = createSlotDate(dateKey, slotTime);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

      if (slotStart < end && slotEnd > start) {
        grid[dateKey][slotTime] = {
          status,
          location,
          multisport: status === "booked" ? multisport : false,
        };
      }
    });
  });
}

function addFreeHourToGrid(grid: ScheduleGrid, freeHour: FreeHour, slotTimes: string[]) {
  const start = parseServerDateTime(freeHour.date);
  if (!start) return;

  applyIntervalToGrid(grid, start, freeHour.duration, slotTimes, "free", freeHour.location);
}

function addLessonToGrid(grid: ScheduleGrid, lesson: Lesson, slotTimes: string[]) {
  const start = getLessonStart(lesson);
  if (!start) return;

  applyIntervalToGrid(
    grid,
    start,
    getLessonDurationMinutes(lesson.duration),
    slotTimes,
    "booked",
    lesson.location,
    lesson.multisport
  );
}

const timeSlots = hoursRange();

function createBlockedWeekGrid(week: Date[]): ScheduleGrid {
  return Object.fromEntries(
    week.map((day) => [
      formatDate(day),
      Object.fromEntries(
        timeSlots.map((slotTime) => [slotTime, { status: "busy" as const }])
      ),
    ])
  );
}

function hasBookableDuration(
  grid: ScheduleGrid,
  dateKey: string,
  time: string,
  location?: LessonLocation
) {
  if (!location) return false;

  const slotIndex = timeSlots.indexOf(time);
  if (slotIndex === -1) return false;

  let consecutiveSlots = 0;

  for (let cursor = slotIndex; cursor < timeSlots.length; cursor += 1) {
    const slotTime = timeSlots[cursor];
    const cell = grid[dateKey]?.[slotTime];

    if (cell?.status !== "free" || cell.location !== location) {
      break;
    }

    consecutiveSlots += 1;
  }

  return consecutiveSlots * 30 >= MIN_BOOKING_DURATION_MINUTES;
}

function isToday(d: Date) {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function isPastSlot(dateKey: string, time: string) {
  return createSlotDate(dateKey, time).getTime() < Date.now();
}

const dayFmt = new Intl.DateTimeFormat("uk-UA", { weekday: "short" });

export default function Schedule({ mode = "user", onAdminSlotSelect }: ScheduleProps) {
  const navigate = useNavigate();
  const [week] = useState<Date[]>(() => getCurrentWeek());
  const [grid, setGrid] = useState<ScheduleGrid>(() => createBlockedWeekGrid(week));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSchedule = async () => {
      setIsLoading(true);

      try {
        const { fromDate, toDate } = getWeekRange(week);
        const [freeHoursResponse, lessonsResponse] = await Promise.all([
          GetFreeHours({ fromDate, toDate }),
          GetAllLessons({ fromDate, toDate }),
        ]);

        const nextGrid = createBlockedWeekGrid(week);

        freeHoursResponse.freeHours.forEach((freeHour) => {
          addFreeHourToGrid(nextGrid, freeHour, timeSlots);
        });

        lessonsResponse.lessons.forEach((lesson) => {
          addLessonToGrid(nextGrid, lesson, timeSlots);
        });

        setGrid(nextGrid);
      } catch (error) {
        console.error("Failed to load schedule data:", error);
        setGrid(createBlockedWeekGrid(week));
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [week]);

  const handleFreeSlotSelect = (dateKey: string, time: string, location?: LessonLocation) => {
    if (!location) return;

    const searchParams = new URLSearchParams({
      date: dateKey,
      time,
      location,
    });

    navigate(`/booking?${searchParams.toString()}`);
  };

  return (
    <section className={css.schedule}>
      <div className={css.legend}>
        <span className={css.legendItem}>
          <span className={`${css.legendSwatch} ${css.legendAvail}`} /> Вільно
        </span>
        <span className={css.legendItem}>
          <span className={`${css.legendSwatch} ${css.legendBooked}`} /> Заброньовано
        </span>
        <span className={css.legendItem}>
          <span className={`${css.legendSwatch} ${css.legendBusy}`} /> Недоступно
        </span>
      </div>

      <div className={css.scrollArea}>
        <div className={`${css.grid} ${isLoading ? css.gridLoading : ""}`}>
          {isLoading ? (
            <div className={css.loaderOverlay} aria-live="polite" aria-busy="true">
              <div className={css.loaderSpinner} aria-hidden />
              <p className={css.loaderText}>Завантажуємо вільні та зайняті години...</p>
            </div>
          ) : null}

          <div className={css.headerRow}>
            <div className={css.timeHead}>Час</div>
            {week.map((d) => (
              <div
                key={formatDate(d)}
                className={`${css.dayHead} ${isToday(d) ? css.today : ""}`}
              >
                <div className={css.dayName}>{dayFmt.format(d)}</div>
                <div className={css.dayDate}>{d.getDate()}</div>
              </div>
            ))}
          </div>

          <div className={css.gridInner}>
            <div className={css.timeCol}>
              {timeSlots.map((t) => (
                <div key={t} className={css.timeCell} aria-hidden>
                  {t}
                </div>
              ))}
            </div>

            {week.map((d) => {
              const key = formatDate(d);
              const colClass = `${css.dayCol} ${isToday(d) ? css.today : ""}`;

              return (
                <div key={key} className={colClass}>
                  {timeSlots.map((t) => {
                    const cell = grid[key]?.[t] ?? { status: "busy" as const };
                    const isPast = isPastSlot(key, t);
                    const isBookableFreeSlot =
                      !isPast &&
                      cell.status === "free" &&
                      hasBookableDuration(grid, key, t, cell.location);
                    const isAdminOpenableBusySlot =
                      mode === "admin" && !isPast && cell.status === "busy";
                    const isClickable = isBookableFreeSlot || isAdminOpenableBusySlot;
                    const cls = `${css.slot} ${css[cell.status]} ${
                      isClickable ? css.clickable : ""
                    }`;
                    const locationLabel = cell.location
                      ? LOCATION_LABELS[cell.location]
                      : "Локація не визначена";
                    const statusLabel =
                      cell.status === "booked"
                        ? "Заброньовано"
                        : cell.status === "free"
                          ? "Вільно"
                          : "Недоступно";

                    return (
                      <button
                        key={`${key}-${t}`}
                        type="button"
                        className={cls}
                        title={`${key} ${t} • ${statusLabel}${
                          cell.location ? ` • ${locationLabel}` : ""
                        }`}
                        aria-label={`${key} ${t} • ${statusLabel}${
                          cell.location ? ` • ${locationLabel}` : ""
                        }`}
                        onClick={() => {
                          if (isBookableFreeSlot) {
                            handleFreeSlotSelect(key, t, cell.location);
                          }

                          if (isAdminOpenableBusySlot) {
                            onAdminSlotSelect?.({ date: key, time: t });
                          }
                        }}
                        disabled={!isClickable}
                      >
                        {cell.status === "busy" ? "—" : ""}
                        {cell.status === "booked" && cell.multisport ? (
                          <span className={css.multisportBadge}>M</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
