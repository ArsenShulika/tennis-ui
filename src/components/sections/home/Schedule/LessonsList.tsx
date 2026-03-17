import css from "./LessonsList.module.css";
import LessonItem, { type Lesson } from "../../lessons/LessonItem/LessonItem";

const lessons: Lesson[] = [
  {
    id: "l1",
    date: "2025-11-05",
    time: "18:00",
    durationMin: 90,
    hall: "Hala tenisowa AWF Wrocław",
    type: "Групове",
  },
  {
    id: "l2",
    date: "2025-11-07",
    time: "19:30",
    durationMin: 60,
    hall: "Hotel GEM (AZS)",
    type: "Індивідуальне",
  },
  {
    id: "l3",
    date: "2025-11-10",
    time: "17:00",
    durationMin: 120,
    hall: "Korty Morskie Oko",
    type: "Спаринг",
  },
];

const LessonsList = () => {
  const hasItems = lessons.length > 0;
  return (
    <section>
      <div className={css.header}>
        <h2 className={css.title}>Майбутні тренування</h2>
      </div>
      {hasItems ? (
        <ul className={css.list}>
          {lessons.map((l) => (
            <LessonItem key={l.id} lesson={l} />
          ))}
        </ul>
      ) : (
        <p className={css.empty}>Наразі немає запланованих тренувань</p>
      )}
    </section>
  );
};

export default LessonsList;

