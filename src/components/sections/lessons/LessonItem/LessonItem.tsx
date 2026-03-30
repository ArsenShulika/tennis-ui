import { useQuery } from "@tanstack/react-query";
import { getUserByTelegramId } from "../../../../api/usersapi";
import { useLanguage } from "../../../../hooks/useLanguage";
import { Lesson } from "../../../../types/lesson";
import { User } from "../../../../types/user";
import css from "./LessonItem.module.css";
import {
  formatLessonDateLabel,
  parseLessonStart,
} from "../../home/Schedule/lessonDate";

type Props = {
  lesson: Lesson;
  hallLabel: string;
  typeLabel: string;
  durationLabel: string;
  adminUser?: User | null;
  showAdminDetails?: boolean;
  isDeleting?: boolean;
  onCancel?: (lesson: Lesson) => void;
  showDate?: boolean;
};

function formatStartTime(date: Date | null, fallbackTime?: string) {
  if (date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  return fallbackTime || "--:--";
}

export default function LessonItem({
  lesson,
  hallLabel,
  typeLabel,
  durationLabel,
  adminUser = null,
  showAdminDetails = false,
  isDeleting = false,
  onCancel,
  showDate = true,
}: Props) {
  const { locale, t } = useLanguage();
  const parsedDate = parseLessonStart(lesson);
  const headerDate = formatLessonDateLabel(parsedDate, locale, lesson.date);
  const startTime = formatStartTime(parsedDate, lesson.time);

  const userQuery = useQuery({
    queryKey: ["telegramUser", lesson.telegramUserId],
    queryFn: () => getUserByTelegramId(lesson.telegramUserId),
    enabled: showAdminDetails && Boolean(lesson.telegramUserId),
    initialData: adminUser ?? undefined,
  });
  console.log(userQuery.data)
  const customerName = userQuery.data?.fullName ?? t("common.notSpecified");

  return (
    <li className={`${css.item} ${showAdminDetails ? css.itemCompact : ""}`.trim()}>
      <div className={`${css.topRow} ${showDate ? "" : css.topRowNoDate}`.trim()}>
        {showDate ? <span className={css.dateText}>{headerDate}</span> : null}
        <div className={`${css.scheduleMeta} ${showAdminDetails ? css.scheduleMetaCompact : ""}`.trim()}>
          <span className={css.metaPill}>
            <span className={css.clockIcon} aria-hidden />
            {startTime}
          </span>
          <span className={css.metaPill}>
            <span className={css.durationIcon} aria-hidden />
            {durationLabel}
          </span>
        </div>
      </div>

      {showAdminDetails ? (
        <div className={css.compactBody}>
          <div className={css.compactMain}>
            <h3 className={css.hall}>{hallLabel}</h3>
            <p className={css.customerName}>{customerName}</p>
          </div>
          <div className={css.compactMeta}>
            <span className={css.typeText}>{typeLabel}</span>
            {lesson.multisport ? <span className={css.discountBadge}>M</span> : null}
          </div>
        </div>
      ) : (
        <div className={css.lessonInfo}>
          <div className={css.hallRow}>
            <h3 className={css.hall}>{hallLabel}</h3>
            {lesson.multisport ? <span className={css.discountBadge}>M</span> : null}
          </div>
          <div className={css.lessonMeta}>
            <span className={css.typeText}>{typeLabel}</span>
          </div>
        </div>
      )}

      <div className={css.footer}>
        <button
          type="button"
          className={css.cancelBtn}
          onClick={() => onCancel?.(lesson)}
          aria-label={t("lessons.cancelBooking")}
          disabled={isDeleting}
        >
          {isDeleting ? t("common.deleting") : t("lessons.cancel")}
        </button>
      </div>
    </li>
  );
}
