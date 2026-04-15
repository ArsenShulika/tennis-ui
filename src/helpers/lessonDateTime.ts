function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function buildLocalDate(date: string, time = "00:00", seconds = "00") {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(year, month - 1, day, hours, minutes, Number(seconds));
}

export function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatLocalDateTime(date: Date) {
  return `${formatLocalDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds()
  )}`;
}

export function parseApiDateTime(value: string) {
  const normalizedValue = value.trim().replace(" ", "T");
  const hasExplicitTimezone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(normalizedValue);

  if (hasExplicitTimezone) {
    const parsed = new Date(normalizedValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

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

export function buildApiDateTime(date: string, time: string) {
  return buildLocalDate(date, time).toISOString();
}

export function buildLessonDateTime(date: string, time: string) {
  return buildApiDateTime(date, time);
}
