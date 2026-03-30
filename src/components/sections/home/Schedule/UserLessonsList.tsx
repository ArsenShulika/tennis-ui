import { Lesson } from "../../../../types/lesson";
import LessonItem from "../../lessons/LessonItem/LessonItem";
import css from "./LessonsList.module.css";

type Props = {
  lessons: Lesson[];
  deletingLessonId: string;
  onDelete: (lesson: Lesson) => void;
  locationLabels: Record<Lesson["location"], string>;
  typeLabels: Record<Lesson["typeOfLesson"], string>;
  durationLabels: Record<Lesson["duration"], string>;
};

export default function UserLessonsList({
  lessons,
  deletingLessonId,
  onDelete,
  locationLabels,
  typeLabels,
  durationLabels,
}: Props) {
  return (
    <ul className={css.list}>
      {lessons.map((lesson) => (
        <LessonItem
          key={lesson._id}
          lesson={lesson}
          hallLabel={locationLabels[lesson.location]}
          typeLabel={typeLabels[lesson.typeOfLesson]}
          durationLabel={durationLabels[lesson.duration]}
          isDeleting={deletingLessonId === lesson._id}
          onCancel={onDelete}
          showDate
        />
      ))}
    </ul>
  );
}
