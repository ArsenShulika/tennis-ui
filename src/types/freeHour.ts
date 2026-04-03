import { LessonLocation } from "./lesson";

export interface FreeHour {
  _id: string;
  date: string;
  location: LessonLocation;
  court: number;
  duration: number;
}
