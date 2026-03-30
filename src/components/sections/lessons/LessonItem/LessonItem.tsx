import { useLanguage } from "../../../../hooks/useLanguage";
import { Lesson } from "../../../../types/lesson";
import { User } from "../../../../types/user";
import css from "./LessonItem.module.css";
import {
  formatLessonDateLabel,
  parseLessonStart,
} from "../../home/Schedule/lessonDate";
import { useQuery } from "@tanstack/react-query";
import { getUserByTelegramId } from "../../../../api/usersapi";

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
  const bookingId = lesson.telegramUserId ? String(lesson.telegramUserId) : lesson._id;
const userQuery = useQuery({queryKey: ["telegramUser", bookingId],
  queryFn: () => getUserByTelegramId(bookingId)
})

const user = userQuery.data;
  return (
    <li className={css.item}>
      <div className={`${css.topRow} ${showDate ? "" : css.topRowNoDate}`.trim()}>
        {showDate ? <span className={css.dateText}>{headerDate}</span> : null}
        <div className={css.scheduleMeta}>
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

      <div className={css.lessonInfo}>
        <div className={css.hallRow}>
          <h3 className={css.hall}>{hallLabel}</h3>
          {lesson.multisport ? <span className={css.discountBadge}>M</span> : null}
        </div>
        <div className={css.lessonMeta}>
          <span className={css.typeText}>{typeLabel}</span>
          {showAdminDetails ? (
            <>
              <span className={css.metaDivider} aria-hidden>
                •
              </span>
              <span className={css.bookingId}>ID: {bookingId}</span>
            </>
          ) : null}
        </div>
      </div>

      {showAdminDetails ? (
        <div className={css.adminPanel}>
          <div className={css.adminHeader}>{t("lessons.customerData")}</div>
          <div className={css.adminGrid}>
            <div className={css.infoItem}>
              <span className={css.infoLabel}>{t("lessons.fullName")}</span>
              <span className={css.infoValue}>
                {user?.fullName ?? t("common.notSpecified")}
              </span>
            </div>
            <div className={css.infoItem}>
              <span className={css.infoLabel}>Telegram Username</span>
              <span className={css.infoValue}>
                {user?.userName ? `@${user.userName}` : t("common.notSpecified")}
              </span>
            </div>
            <div className={css.infoItem}>
              <span className={css.infoLabel}>{t("lessons.phone")}</span>
              <span className={css.infoValue}>
                {user?.phoneNumber ?? t("common.notSpecified")}
              </span>
            </div>
            <div className={css.infoItem}>
              <span className={css.infoLabel}>Telegram ID</span>
              <span className={css.infoValue}>
                {adminUser?.telegramUserId ?? lesson.telegramUserId ?? t("common.notSpecified")}
              </span>
            </div>
          </div>
        </div>
      ) : null}

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
