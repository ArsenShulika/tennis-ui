import css from "./LessonItem.module.css";

export type Lesson = {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  time: string; // HH:mm
  durationMin: number;
  hall: string;
  type: string; // e.g., "Групове", "Індивідуальне"
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

function getDayLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat("uk-UA", { weekday: "short" }).format(d);
}

function getDateParts(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: monthsUk[d.getMonth()],
  };
}

export default function LessonItem({ lesson, onCancel }: { lesson: Lesson; onCancel?: (lesson: Lesson) => void }) {
  const dayLabel = getDayLabel(lesson.date);
  const { day, month } = getDateParts(lesson.date);

  return (
    <li className={css.item}>
      <div className={css.date} aria-hidden>
        <div className={css.day}>{dayLabel}</div>
        <div className={css.dateNum}>{day}</div>
        <div className={css.month}>{month}</div>
      </div>
      <div className={css.content}>
        <div className={css.titleRow}>
          <h3 className={css.hall}>{lesson.hall}</h3>
          <span className={css.type}>{lesson.type}</span>
        </div>
        <div className={css.meta}>
          <span>{lesson.date}</span>
          <span className={css.dot} />
          <span>{lesson.time}</span>
          <span className={css.dot} />
          <span>{lesson.durationMin} хв</span>
        </div>
        <div className={css.actions}>
          <button
            type="button"
            className={css.cancelBtn}
            onClick={() => onCancel?.(lesson)}
            aria-label="Скасувати бронювання"
          >
            Скасувати
          </button>
        </div>
      </div>
    </li>
  );
}
