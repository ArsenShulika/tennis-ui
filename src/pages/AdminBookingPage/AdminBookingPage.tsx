import { FormEvent, useEffect, useMemo, useState } from "react";
import { createLesson, GetAllLessons } from "../../api/lessonsapi";
import { getAllUsers } from "../../api/usersapi";
import CustomDatePicker from "../../components/shared/CustomDatePicker/CustomDatePicker";
import CustomDropdownSelect from "../../components/shared/CustomDropdownSelect/CustomDropdownSelect";
import { useLanguage } from "../../hooks/useLanguage";
import { Lesson, LessonDuration, LessonLocation, LessonType, NewLesson } from "../../types/lesson";
import { User } from "../../types/user";
import css from "./AdminBookingPage.module.css";

const LOCATION_LABELS: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

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

function parseLessonStart(lesson: Lesson) {
  if (lesson.date.includes("T") || lesson.date.includes(" ")) {
    return parseLocalDateTime(lesson.date);
  }

  if (lesson.time) {
    return parseLocalDateTime(`${lesson.date}T${lesson.time}:00`);
  }

  return parseLocalDateTime(`${lesson.date}T00:00:00`);
}

function getLessonDurationMinutes(duration: LessonDuration) {
  const numericValue = Number(duration.slice(1));
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function createLessonStart(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function formatDateLabel(dateValue: string, locale: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function buildTimeOptions() {
  return Array.from({ length: 24 * 4 }, (_, index) => {
    const totalMinutes = index * 15;
    const hours = pad2(Math.floor(totalMinutes / 60));
    const minutes = pad2(totalMinutes % 60);
    const value = `${hours}:${minutes}`;
    return { value, label: value };
  });
}

const TIME_OPTIONS = buildTimeOptions();

export default function AdminBookingPage() {
  const { locale, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [pendingDate, setPendingDate] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState<LessonLocation>("awf");
  const [duration, setDuration] = useState<LessonDuration>("m60");
  const [typeOfLesson, setTypeOfLesson] = useState<LessonType>("individual");
  const [multisport, setMultisport] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationOptions = useMemo(
    () => [
      { value: "m30", label: `30 ${t("common.minutesShort")}` },
      { value: "m60", label: `60 ${t("common.minutesShort")}` },
      { value: "m90", label: `90 ${t("common.minutesShort")}` },
      { value: "m120", label: `120 ${t("common.minutesShort")}` },
    ],
    [t]
  );
  const locationOptions = useMemo(
    () => [
      { value: "awf", label: LOCATION_LABELS.awf },
      { value: "gem", label: LOCATION_LABELS.gem },
      { value: "oko", label: LOCATION_LABELS.oko },
    ],
    []
  );
  const typeOptions = useMemo(
    () => [
      { value: "individual", label: t("booking.lessonTypes.individual") },
      { value: "split", label: t("booking.lessonTypes.split") },
    ],
    [t]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [usersResponse, lessonsResponse] = await Promise.all([
          getAllUsers({ perPage: 500 }),
          GetAllLessons({ perPage: 500 }),
        ]);

        setUsers(usersResponse.users);
        setLessons(lessonsResponse.lessons);
      } catch (loadError) {
        console.error("Failed to load admin booking data:", loadError);
        setError(t("adminBooking.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [t]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => {
      const haystack = [
        user.fullName,
        user.userName,
        user.telegramUserId,
        String(user.phoneNumber),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [userQuery, users]);

  const userOptions = useMemo(
    () =>
      filteredUsers.map((user) => ({
        value: user.telegramUserId,
        label: `${user.fullName} • @${user.userName || "-"} • ${user.telegramUserId}`,
      })),
    [filteredUsers]
  );

  const selectedUser = useMemo(
    () => users.find((user) => user.telegramUserId === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const sortedSelectedDates = useMemo(
    () => [...selectedDates].sort((left, right) => left.localeCompare(right)),
    [selectedDates]
  );

  const conflictDates = useMemo(() => {
    if (!time || selectedDates.length === 0) return [];

    const requestedDuration = getLessonDurationMinutes(duration);

    return sortedSelectedDates.filter((dateValue) => {
      const requestedStart = createLessonStart(dateValue, time);
      const requestedEnd = new Date(requestedStart.getTime() + requestedDuration * 60 * 1000);

      return lessons.some((lesson) => {
        if (lesson.location !== location) return false;

        const lessonStart = parseLessonStart(lesson);
        if (!lessonStart || formatDate(lessonStart) !== dateValue) return false;

        const lessonEnd = new Date(
          lessonStart.getTime() + getLessonDurationMinutes(lesson.duration) * 60 * 1000
        );

        return requestedStart < lessonEnd && requestedEnd > lessonStart;
      });
    });
  }, [duration, lessons, location, sortedSelectedDates, time]);

  const availableDates = useMemo(
    () => sortedSelectedDates.filter((dateValue) => !conflictDates.includes(dateValue)),
    [conflictDates, sortedSelectedDates]
  );

  const handleAddDate = () => {
    if (!pendingDate) return;

    setSelectedDates((current) =>
      current.includes(pendingDate) ? current : [...current, pendingDate]
    );
    setPendingDate("");
    setError("");
    setSuccess("");
  };

  const handleRemoveDate = (dateValue: string) => {
    setSelectedDates((current) => current.filter((item) => item !== dateValue));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUser) {
      setError(t("adminBooking.validation.user"));
      setSuccess("");
      return;
    }

    if (selectedDates.length === 0) {
      setError(t("adminBooking.validation.dates"));
      setSuccess("");
      return;
    }

    if (!time) {
      setError(t("adminBooking.validation.time"));
      setSuccess("");
      return;
    }

    if (availableDates.length === 0) {
      setError(t("adminBooking.validation.conflicts"));
      setSuccess("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const lessonsToCreate: NewLesson[] = availableDates.map((dateValue) => ({
        date: `${dateValue} ${time}`,
        time,
        location,
        duration,
        typeOfLesson,
        multisport,
        comments: comments.trim() || undefined,
        telegramUserId: selectedUser.telegramUserId,
      }));

      const results = await Promise.allSettled(
        lessonsToCreate.map((lesson) => createLesson(lesson))
      );
      const createdCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = results.length - createdCount;

      const refreshedLessons = await GetAllLessons({ perPage: 500 });
      setLessons(refreshedLessons.lessons);

      if (createdCount > 0) {
        setSelectedDates([]);
        setPendingDate("");
        setTime("");
        setLocation("awf");
        setDuration("m60");
        setTypeOfLesson("individual");
        setMultisport(false);
        setComments("");
      }

      if (failedCount === 0) {
        setSuccess(
          t("adminBooking.created", {
            count: createdCount,
            client: selectedUser.fullName,
          })
        );
        return;
      }

      if (createdCount > 0) {
        setSuccess(
          t("adminBooking.partialCreated", {
            created: createdCount,
            failed: failedCount,
            client: selectedUser.fullName,
          })
        );
        return;
      }

      setError(t("adminBooking.submitError"));
    } catch (submitError) {
      console.error("Failed to create admin bookings:", submitError);
      setError(t("adminBooking.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={css.page}>
      <form className={css.form} onSubmit={handleSubmit}>
        <div className={css.headingBlock}>
          <h1 className={css.title}>{t("adminBooking.title")}</h1>
          <p className={css.subtitle}>{t("adminBooking.subtitle")}</p>
        </div>

        <label htmlFor="admin-booking-user-query" className={css.label}>
          {t("adminBooking.clientSearchLabel")}
        </label>
        <input
          id="admin-booking-user-query"
          type="text"
          className={css.input}
          value={userQuery}
          onChange={(event) => setUserQuery(event.target.value)}
          placeholder={t("adminBooking.clientSearchPlaceholder")}
        />

        <label htmlFor="admin-booking-user" className={css.label}>
          {t("adminBooking.clientLabel")}
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="admin-booking-user"
            value={selectedUserId}
            onChange={setSelectedUserId}
            options={userOptions}
            placeholder={t("adminBooking.chooseClient")}
            emptyText={t("adminBooking.noClients")}
            disabled={isLoading}
          />
        </div>

        {selectedUser ? (
          <p className={css.hint}>
            {selectedUser.fullName} • @{selectedUser.userName || "-"} • {selectedUser.telegramUserId}
          </p>
        ) : null}

        <label htmlFor="admin-booking-date" className={css.label}>
          {t("adminBooking.dateLabel")}
        </label>
        <div className={css.dateRow}>
          <div className={css.selectField}>
            <CustomDatePicker
              id="admin-booking-date"
              value={pendingDate}
              onChange={setPendingDate}
              minDate="2024-01-01"
              label={t("adminBooking.dateLabel")}
            />
          </div>
          <button type="button" className={css.secondaryButton} onClick={handleAddDate}>
            {t("adminBooking.addDate")}
          </button>
        </div>

        {sortedSelectedDates.length > 0 ? (
          <div className={css.dateList}>
            {sortedSelectedDates.map((dateValue) => {
              const isConflict = conflictDates.includes(dateValue);

              return (
                <div
                  key={dateValue}
                  className={`${css.dateChip} ${isConflict ? css.dateChipConflict : ""}`}
                >
                  <span>{formatDateLabel(dateValue, locale)}</span>
                  <button
                    type="button"
                    className={css.removeDateButton}
                    onClick={() => handleRemoveDate(dateValue)}
                    aria-label={t("adminBooking.removeDate")}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={css.hint}>{t("adminBooking.noDates")}</p>
        )}

        <label htmlFor="admin-booking-time" className={css.label}>
          {t("booking.timeLabel")}
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="admin-booking-time"
            value={time}
            onChange={setTime}
            options={TIME_OPTIONS}
            placeholder={t("adminBooking.chooseTime")}
          />
        </div>

        <label htmlFor="admin-booking-location" className={css.label}>
          {t("booking.locationLabel")}
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="admin-booking-location"
            value={location}
            onChange={(value) => setLocation(value as LessonLocation)}
            options={locationOptions}
            placeholder={t("adminBooking.chooseLocation")}
          />
        </div>

        <label htmlFor="admin-booking-duration" className={css.label}>
          {t("booking.durationLabel")}
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="admin-booking-duration"
            value={duration}
            onChange={(value) => setDuration(value as LessonDuration)}
            options={durationOptions}
            placeholder={t("booking.chooseDuration")}
          />
        </div>

        <label htmlFor="admin-booking-type" className={css.label}>
          {t("booking.lessonTypeLabel")}
        </label>
        <div className={css.selectField}>
          <CustomDropdownSelect
            id="admin-booking-type"
            value={typeOfLesson}
            onChange={(value) => setTypeOfLesson(value as LessonType)}
            options={typeOptions}
            placeholder={t("booking.chooseLessonType")}
          />
        </div>

        <label htmlFor="admin-booking-comments" className={css.label}>
          {t("adminBooking.commentsLabel")}
        </label>
        <textarea
          id="admin-booking-comments"
          className={css.textarea}
          value={comments}
          onChange={(event) => setComments(event.target.value)}
          placeholder={t("adminBooking.commentsPlaceholder")}
          rows={4}
        />

        <div className={css.checkboxRow}>
          <label htmlFor="admin-booking-multisport">{t("booking.multisportLabel")}</label>
          <input
            type="checkbox"
            id="admin-booking-multisport"
            checked={multisport}
            onChange={(event) => setMultisport(event.target.checked)}
          />
        </div>

        {conflictDates.length > 0 ? (
          <p className={css.hintError}>
            {t("adminBooking.conflicts", {
              dates: conflictDates.map((dateValue) => formatDateLabel(dateValue, locale)).join(", "),
            })}
          </p>
        ) : null}
        {error ? <p className={css.hintError}>{error}</p> : null}
        {success ? <p className={css.success}>{success}</p> : null}

        <button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting ? t("common.saving") : t("adminBooking.submit")}
        </button>
      </form>
    </div>
  );
}
