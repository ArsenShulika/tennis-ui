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
  "січ",
  "лют",
  "бер",
  "кві",
  "тра",
  "чер",
  "лип",
  "сер",
  "вер",
  "жов",
  "лис",
  "гру",
];

function parseLessonDate(dateStr: string, time?: string) {
  const normalized = dateStr.trim().replace(" ", "T");

  if (normalized.includes("T")) {
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (time) {
    const parsed = new Date(`${normalized}T${time}:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

  return (
    <li className={css.item}>
      <div className={css.date} aria-hidden>
        <div className={css.day}>{dayLabel}</div>
        <div className={css.dateNum}>{day}</div>
        <div className={css.month}>{month}</div>
      </div>
      <div className={css.content}>
        <div className={css.titleRow}>
          <h3 className={css.hall}>{hallLabel}</h3>
          <span className={css.type}>{typeLabel}</span>
        </div>
        <div className={css.meta}>
          <span>{displayDate}</span>
          <span className={css.dot} />
          <span>На {lesson.time}</span>
          <span className={css.dot} />
          <span>{durationLabel}</span>
        </div>
        {bookedByLabel ? <div className={css.bookedBy}>Бронювання: {bookedByLabel}</div> : null}
        <div className={css.actions}>
          <button
            type="button"
            className={css.cancelBtn}
            onClick={() => onCancel?.(lesson)}
            aria-label="Скасувати бронювання"
            disabled={isDeleting}
          >
            {isDeleting ? "Видалення..." : "Скасувати"}
          </button>
        </div>
      </div>
    </li>
  );
}
