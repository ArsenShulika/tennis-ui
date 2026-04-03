import { FreeHour } from "../types/freeHour";
import { LessonLocation } from "../types/lesson";

const STORAGE_KEY = "free-hour-courts";

type StoredCourtMap = Record<string, number>;

function pad2(value: number) {
  return value.toString().padStart(2, "0");
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

export function getFreeHourCourtKey(params: {
  date: string;
  location: LessonLocation;
  duration: number;
}) {
  return `${normalizeDateKey(params.date)}|${params.location}|${params.duration}`;
}

export function saveFreeHourCourt(params: {
  date: string;
  location: LessonLocation;
  duration: number;
  court: number;
}) {
  const current = readCourtMap();
  current[getFreeHourCourtKey(params)] = params.court;
  writeCourtMap(current);
}

export function removeFreeHourCourt(params: {
  date: string;
  location: LessonLocation;
  duration: number;
}) {
  const current = readCourtMap();
  delete current[getFreeHourCourtKey(params)];
  writeCourtMap(current);
}

export function hydrateFreeHoursCourts(freeHours: FreeHour[]) {
  const current = readCourtMap();

  return freeHours.map((freeHour) => ({
    ...freeHour,
    court:
      freeHour.court ??
      current[
        getFreeHourCourtKey({
          date: freeHour.date,
          location: freeHour.location,
          duration: freeHour.duration,
        })
      ],
  }));
}
