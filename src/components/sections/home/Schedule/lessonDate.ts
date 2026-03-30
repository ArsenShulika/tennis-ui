import { Lesson } from "../../../../types/lesson";

export function parseLocalDateTime(value: string) {
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

export function parseLessonStart(lesson: Lesson) {
  if (lesson.date.includes("T") || lesson.date.includes(" ")) {
    return parseLocalDateTime(lesson.date);
  }

  if (lesson.time) {
    return parseLocalDateTime(`${lesson.date}T${lesson.time}:00`);
  }

  return parseLocalDateTime(`${lesson.date}T00:00:00`);
}

export function formatLessonDateLabel(date: Date | null, locale: string, fallback: string) {
  if (!date) return fallback;

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}
