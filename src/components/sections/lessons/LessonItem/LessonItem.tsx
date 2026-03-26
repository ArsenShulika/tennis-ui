import { Lesson } from "../../../../types/lesson";
import css from "./LessonItem.module.css";

type Props = {
  lesson: Lesson;
  hallLabel: string;
  typeLabel: string;
  durationLabel: string;
  bookedByLabel?: string | null;
  isDeleting?: boolean;
  onCancel?: (lesson: Lesson) => void;
};

const monthsUk = [
  "ŃŃ–Ń‡",
  "Đ»ŃŽŃ‚",
  "Đ±ĐµŃ€",
  "ĐşĐ˛Ń–",
  "Ń‚Ń€Đ°",
  "Ń‡ĐµŃ€",
  "Đ»Đ¸Đż",
  "ŃĐµŃ€",
  "Đ˛ĐµŃ€",
  "Đ¶ĐľĐ˛",
  "Đ»Đ¸Ń",
  "ĐłŃ€Ń",
];

function parseLocalDateTime(value: string) {
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

function parseLessonDate(dateStr: string, time?: string) {
  if (dateStr.includes("T") || dateStr.includes(" ")) {
    return parseLocalDateTime(dateStr);
  }

  if (time) {
    return parseLocalDateTime(`${dateStr}T${time}:00`);
  }

  return parseLocalDateTime(`${dateStr}T00:00:00`);
}

function getDayLabel(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", { weekday: "short" }).format(date);
}

function getDateParts(date: Date) {
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: monthsUk[date.getMonth()] ?? "",
  };
}

function formatDisplayDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatStartTime(date: Date | null, fallbackTime?: string) {
  if (date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  return fallbackTime || "--:--";
}

export default function LessonItem({
  lesson,
  hallLabel,
  typeLabel,
  durationLabel,
  bookedByLabel = null,
  isDeleting = false,
  onCancel,
}: Props) {
  const parsedDate = parseLessonDate(lesson.date, lesson.time);
  const dayLabel = parsedDate ? getDayLabel(parsedDate) : "--";
  const { day, month } = parsedDate ? getDateParts(parsedDate) : { day: "--", month: "" };
  const displayDate = parsedDate ? formatDisplayDate(parsedDate) : lesson.date;
  const startTime = formatStartTime(parsedDate, lesson.time);

  return (
    <li className={css.item}>
      <div className={css.topRow}>
        <div className={css.date} aria-hidden>
          <div className={css.day}>{dayLabel}</div>
          <div className={css.dateNum}>{day}</div>
          <div className={css.month}>{month}</div>
        </div>
        <div className={css.statuses}>
          <span className={css.timeBadge}>ĐˇŃ‚Đ°Ń€Ń‚ {startTime}</span>
          <span className={css.bookingBadge}>Đ—Đ°Đ±Ń€ĐľĐ˝ŃŚĐľĐ˛Đ°Đ˝Đľ</span>
        </div>
      </div>

      <div className={css.content}>
        <div className={css.titleRow}>
          <h3 className={css.hall}>{hallLabel}</h3>
          <span className={css.type}>{typeLabel}</span>
        </div>

        <div className={css.meta}>
          <span className={css.metaTag}>{displayDate}</span>
          <span className={css.metaTag}>ĐźĐľŃ‡Đ°Ń‚ĐľĐş {startTime}</span>
          <span className={css.metaTag}>{durationLabel}</span>
        </div>

        {bookedByLabel ? <div className={css.bookedBy}>Đ‘Ń€ĐľĐ˝ŃŽĐ˛Đ°Đ˝Đ˝ŃŹ: {bookedByLabel}</div> : null}

        <div className={css.actions}>
          <button
            type="button"
            className={css.cancelBtn}
            onClick={() => onCancel?.(lesson)}
            aria-label="ĐˇĐşĐ°ŃŃĐ˛Đ°Ń‚Đ¸ Đ±Ń€ĐľĐ˝ŃŽĐ˛Đ°Đ˝Đ˝ŃŹ"
            disabled={isDeleting}
          >
            {isDeleting ? "Đ’Đ¸Đ´Đ°Đ»ĐµĐ˝Đ˝ŃŹ..." : "ĐˇĐşĐ°ŃŃĐ˛Đ°Ń‚Đ¸"}
          </button>
        </div>
      </div>
    </li>
  );
}
