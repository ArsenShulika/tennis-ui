import { LessonLocation } from "./lesson";

export interface FreeHour {
  _id: string;
  date: string; //дата та час початку
  location: LessonLocation;
  duration: number;   //тривалість в хвилинах
}
