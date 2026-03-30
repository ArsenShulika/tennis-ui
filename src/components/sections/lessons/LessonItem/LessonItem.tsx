import { useEffect, useState } from "react";
import { useLanguage } from "../../../../hooks/useLanguage";
import { Lesson } from "../../../../types/lesson";
import { User } from "../../../../types/user";
import css from "./LessonItem.module.css";
import { useQuery } from "@tanstack/react-query";
import { getUserByTelegramId } from "../../../../api/usersapi";

type Props = {
  lesson: Lesson;
  hallLabel: string;
  typeLabel: string;
  durationLabel: string;
  bookedByLabel?: string | null;
  adminUser?: User | null;
  isDeleting?: boolean;
  onCancel?: (lesson: Lesson) => void;
};

function parseLocalDateTime(value: string) {
  const normalizedValue = value.trim().replace(" ", "T");
  const match = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );

  if (!match) {
    const fallback = new Date(normalizedValue);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, year, month, day, hours, minutes, seconds = "00"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  );
}

function parseLessonDate(dateStr: string, time?: string) {
  if (dateStr.includes("T") || dateStr.includes(" ")) {
    return parseLocalDateTime(dateStr);
  }

  if (time) {
    return parseLocalDateTime(`${dateStr}T${time}:00`);
  }

  return parseLocalDateTime(`${dateStr}T00:00:00`);
}

function formatStartTime(date: Date | null, fallbackTime?: string) {
  if (date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  return fallbackTime || "--:--";
}

function formatPhoneNumber(phoneNumber?: number) {
  if (!phoneNumber) return null;
  return `+${phoneNumber}`;
}

export default function LessonItem({
  lesson,
  hallLabel,
  typeLabel,
  durationLabel,
  bookedByLabel = null,
  adminUser = null,
  isDeleting = false,
  onCancel,
}: Props) {
  const userId = lesson.telegramUserId;
  const { locale, t } = useLanguage();
  const parsedDate = parseLessonDate(lesson.date, lesson.time);
  const headerDate = parsedDate
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }).format(parsedDate)
    : lesson.date;
  const startTime = formatStartTime(parsedDate, lesson.time);
  const userName = adminUser?.userName ? `@${adminUser.userName}` : null;
  const phoneNumber = formatPhoneNumber(adminUser?.phoneNumber);
  const fullName = adminUser?.fullName?.trim() || bookedByLabel || null;
  const bookingId = lesson.telegramUserId
    ? String(lesson.telegramUserId)
    : lesson._id;

  const userQuery = useQuery({
    queryKey: ["telegramUser", userId],
    queryFn: () => getUserByTelegramId(userId)
  });

  
  const user = userQuery.data;
  
  return (
    <li className={css.item}>
      <div className={css.topRow}>
        <span className={css.dateText}>{headerDate}</span>
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
          {lesson.multisport ? (
            <span className={css.discountBadge}>M</span>
          ) : null}
        </div>
        <div className={css.lessonMeta}>
          <span className={css.typeText}>{typeLabel}</span>
          {adminUser ? (
            <>
              <span className={css.metaDivider} aria-hidden>
                •
              </span>
              <span className={css.bookingId}>ID: {bookingId}</span>
            </>
          ) : null}
        </div>
      </div>

      {adminUser ? (
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
              <span className={css.infoLabel}>Telegram</span>
              <span className={css.infoValue}>
                {user?.userName ?? t("common.notSpecified")}
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
              <span className={css.infoValue}>{lesson.telegramUserId}</span>
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
