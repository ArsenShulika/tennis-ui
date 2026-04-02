import { useMemo, useState } from "react";
import { useLanguage } from "../../../../hooks/useLanguage";
import { Lesson } from "../../../../types/lesson";
import { User } from "../../../../types/user";
import EditLessonModal from "../../lessons/EditLessonModal/EditLessonModal";
import LessonItem from "../../lessons/LessonItem/LessonItem";
import css from "./LessonsList.module.css";
import { formatLessonDateLabel, parseLessonStart } from "./lessonDate";

type Props = {
  lessons: Lesson[];
  usersByTelegramId: Record<string, User | null>;
  deletingLessonId: string;
  onDelete: (lesson: Lesson) => void;
  onUpdate: (lesson: Lesson) => void;
  locationLabels: Record<Lesson["location"], string>;
  typeLabels: Record<Lesson["typeOfLesson"], string>;
  durationLabels: Record<Lesson["duration"], string>;
};

export default function AdminLessonsList({
  lessons,
  usersByTelegramId,
  deletingLessonId,
  onDelete,
  onUpdate,
  locationLabels,
  typeLabels,
  durationLabels,
}: Props) {
  const { locale } = useLanguage();
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const groupedLessons = useMemo(() => {
    const groups: Array<{ key: string; label: string; lessons: Lesson[] }> = [];

    lessons.forEach((lesson) => {
      const start = parseLessonStart(lesson);
      const key = start ? start.toISOString().slice(0, 10) : lesson.date;
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.key !== key) {
        groups.push({
          key,
          label: formatLessonDateLabel(start, locale, lesson.date),
          lessons: [lesson],
        });
        return;
      }

      lastGroup.lessons.push(lesson);
    });

    return groups;
  }, [lessons, locale]);

  return (
    <div className={css.groups}>
      {groupedLessons.map((group) => (
        <section key={group.key} className={css.group}>
          <h3 className={css.groupTitle}>{group.label}</h3>
          <ul className={css.list}>
            {group.lessons.map((lesson) => (
              <LessonItem
                key={lesson._id}
                lesson={lesson}
                hallLabel={locationLabels[lesson.location]}
                typeLabel={typeLabels[lesson.typeOfLesson]}
                durationLabel={durationLabels[lesson.duration]}
                adminUser={usersByTelegramId[lesson.telegramUserId] ?? null}
                showAdminDetails
                isDeleting={deletingLessonId === lesson._id}
                onCancel={onDelete}
                onEdit={setEditingLesson}
                showDate={false}
              />
            ))}
          </ul>
        </section>
      ))}

      {editingLesson ? (
        <EditLessonModal
          lesson={editingLesson}
          onClose={() => setEditingLesson(null)}
          onSaved={onUpdate}
        />
      ) : null}
    </div>
  );
}
