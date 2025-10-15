export type LessonDuration = "m60" | "m90" | "m120";
export type LessonLocation = "awf" | "gem" | "oko";
export type LessonType = "individual" | "split";

export interface Lesson {
  date: string;
  duration: LessonDuration;
  location: LessonLocation;
  multisport: boolean;
  time: string;
  typeOfLesson: LessonType;
}
