export type LessonDuration = "m30" | "m60" | "m90" | "m120";
export type LessonLocation = "awf" | "gem" | "oko";
export type LessonType = "individual" | "split";

export interface Lesson {
  _id: string;
  date: string;
  location: LessonLocation;
  duration: LessonDuration;
  time: string;
  typeOfLesson: LessonType;
  multisport: boolean;
  pricePerHour: number;
  comments?: string;
  telegramUserId: string;
  eventId?: string;
}

export interface NewLesson {
  date?: string;
  location?: LessonLocation;
  duration?: LessonDuration;
  time?: string;
  typeOfLesson?: LessonType;
  multisport?: boolean;
  pricePerHour?: number;
  comments?: string;
  telegramUserId?: string;
  eventId?: string;
}


