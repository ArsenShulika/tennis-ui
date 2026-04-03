import { Lesson, LessonDuration, LessonLocation } from "../types/lesson";

const STORAGE_KEY = "lesson-courts";

type StoredCourtMap = Record<string, number>;

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readCourtMap(): StoredCourtMap {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) return {};
    const parsed = JSON.parse(rawValue) as StoredCourtMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCourtMap(value: StoredCourtMap) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function normalizeDateKey(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (match) {
    const [, year, month, day, hours, minutes] = match;
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(
    parsed.getHours()
  )}:${pad2(parsed.getMinutes())}`;
}

function getNormalizedLessonDate(date: string, time?: string) {
  if (time && !date.includes("T") && !date.includes(" ")) {
    return normalizeDateKey(`${date}T${time}:00`);
  }

  return normalizeDateKey(date);
}

function durationToMinutes(duration: LessonDuration | number) {
  if (typeof duration === "number") return duration;

  const numericValue = Number(duration.slice(1));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

export function getLessonCourtKey(params: {
  date: string;
  time?: string;
  location: LessonLocation;
  duration: LessonDuration | number;
  telegramUserId?: string;
}) {
  return `${getNormalizedLessonDate(params.date, params.time)}|${params.location}|${durationToMinutes(
    params.duration
  )}|${params.telegramUserId ?? "-"}`;
}

export function saveLessonCourt(params: {
  date: string;
  time?: string;
  location: LessonLocation;
  duration: LessonDuration | number;
  telegramUserId?: string;
  court: number;
}) {
  const current = readCourtMap();
  current[getLessonCourtKey(params)] = params.court;
  writeCourtMap(current);
}

export function removeLessonCourt(params: {
  date: string;
  time?: string;
  location: LessonLocation;
  duration: LessonDuration | number;
  telegramUserId?: string;
}) {
  const current = readCourtMap();
  delete current[getLessonCourtKey(params)];
  writeCourtMap(current);
}

export function hydrateLessonsCourts(lessons: Lesson[]) {
  const current = readCourtMap();

  return lessons.map((lesson) => ({
    ...lesson,
    court:
      lesson.court ??
      current[
        getLessonCourtKey({
          date: lesson.date,
          time: lesson.time,
          location: lesson.location,
          duration: lesson.duration,
          telegramUserId: lesson.telegramUserId,
        })
      ],
  }));
}
