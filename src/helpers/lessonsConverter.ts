import { Lesson, LessonLocation } from "../types/lesson";

export const lessons2TimeList = (
  lessons: Lesson[],
  location: LessonLocation
) => {
  const result = [];
  for (const lesson of lessons) {
    const date = new Date(lesson.date);
    const duration = lesson.duration;
    let iteration = (Number(duration.slice(1)) - 30) / 30;
    if (location !== lesson.location) {
      iteration += 1;
      date.setMinutes(date.getMinutes() - 30);
      const time = getDateTime(date);
      result.push(time);
      date.setMinutes(date.getMinutes() + 30);
    }
    for (let i = 0; i <= iteration; i += 1) {
      const time = getDateTime(date);
      result.push(time);
      date.setMinutes(date.getMinutes() + 30);
    }
  }
  console.log(result);
  return result;
};

export const getBookingTimeOptions = (
  lessons: Lesson[],
  location: LessonLocation
) => {
  const results = [];
  const date = new Date("12.01.2025");
  date.setHours(6);
  const blocked = lessons2TimeList(lessons, location);
  while (date.getHours() < 23) {
    const time = getDateTime(date);
    if (!blocked.includes(time)) {
      results.push({ value: time, label: time });
    }
    date.setMinutes(date.getMinutes() + 30);
  }
  return results;
};

function getDateTime(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
