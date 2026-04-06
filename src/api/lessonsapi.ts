import { formatLocalDateTime } from "../helpers/lessonDateTime";
import { Lesson, NewLesson } from "../types/lesson";
import { serverApi } from "./serverconfig";

type GetAllLessonsParams = {
  telegramUserId?: string;
  page?: number;
  perPage?: number;
  fromDate?: string;
  toDate?: string;
};

type GetAllLessonsResponse = {
  lessons: Lesson[];
};

export const GetAllLessons = async (params: GetAllLessonsParams) => {
  const result = await serverApi.get<GetAllLessonsResponse>("/lessons", {
    params,
  });
  return result.data;
};

export const GetLessonsByDay = async (date: string) => {
  const currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);
  const fromDate = formatLocalDateTime(currentDate);
  currentDate.setHours(23, 59, 59, 0);
  const toDate = formatLocalDateTime(currentDate);

  const result = await serverApi.get<GetAllLessonsResponse>("/lessons", {
    params: { fromDate, toDate },
  });
  return result.data;
};

export const createLesson = async (lesson: NewLesson) => {
  const defaultLesson = { telegramUserId: "-", comments: "-", pricePerHour: 100 };
  const result = await serverApi.post<Lesson>("/lessons", {
    ...defaultLesson,
    ...lesson,
  });
  return result.data;
};

export const updateLesson = async (lessonId: string, lesson: NewLesson) => {
  const result = await serverApi.patch<Lesson>(`/lessons/${lessonId}`, lesson);
  return result.data;
};

export const deleteLesson = async (lessonId: string) => {
  await serverApi.delete(`/lessons/${lessonId}`);
};
