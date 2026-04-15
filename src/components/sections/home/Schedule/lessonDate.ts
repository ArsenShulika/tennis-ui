import { Lesson } from "../../../../types/lesson";
import { parseApiDateTime } from "../../../../helpers/lessonDateTime";

export function parseLocalDateTime(value: string) {
  return parseApiDateTime(value);
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
