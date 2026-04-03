import { useEffect, useMemo, useState } from "react";
import { updateLesson } from "../../../../api/lessonsapi";
import { getAllUsers } from "../../../../api/usersapi";
import { COURT_OPTIONS } from "../../../../constants/courts";
import { saveLessonCourt } from "../../../../helpers/lessonCourts";
import CustomDatePicker from "../../../shared/CustomDatePicker/CustomDatePicker";
import CustomDropdownSelect from "../../../shared/CustomDropdownSelect/CustomDropdownSelect";
import { useLanguage } from "../../../../hooks/useLanguage";
import { Lesson, LessonDuration, LessonLocation, LessonType } from "../../../../types/lesson";
import { User } from "../../../../types/user";
import { parseLessonStart } from "../../home/Schedule/lessonDate";
import css from "./EditLessonModal.module.css";

type Props = {
  lesson: Lesson;
  onClose: () => void;
  onSaved: (lesson: Lesson) => void;
};

type DraftLesson = {
  telegramUserId: string;
  date: string;
  time: string;
  location: LessonLocation;
  court: string;
  duration: LessonDuration;
  typeOfLesson: LessonType;
  multisport: boolean;
  comments: string;
};

const LOCATION_LABELS: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
};

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function createDraft(lesson: Lesson): DraftLesson {
  const lessonStart = parseLessonStart(lesson);

  return {
    telegramUserId: lesson.telegramUserId,
    date: lessonStart ? formatDateInputValue(lessonStart) : lesson.date.slice(0, 10),
    time: lesson.time,
    location: lesson.location,
    court: String(lesson.court ?? 1),
    duration: lesson.duration,
    typeOfLesson: lesson.typeOfLesson,
    multisport: lesson.multisport,
    comments: lesson.comments && lesson.comments !== "-" ? lesson.comments : "",
  };
}

function buildTimeOptions() {
  const options: { value: string; label: string }[] = [];

  for (let hour = 8; hour < 22; hour += 1) {
    for (let minutes = 0; minutes < 60; minutes += 30) {
      const value = `${pad2(hour)}:${pad2(minutes)}`;
      options.push({ value, label: value });
    }
  }

  return options;
}

const TIME_OPTIONS = buildTimeOptions();

export default function EditLessonModal({ lesson, onClose, onSaved }: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<DraftLesson>(() => createDraft(lesson));
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(createDraft(lesson));
    setError("");
  }, [lesson]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await getAllUsers({ perPage: 500 });
        setUsers(response.users);
      } catch (loadError) {
        console.error("Failed to load users for lesson edit:", loadError);
        setError(t("lessons.editLoadUsersError"));
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, [t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const userOptions = useMemo(() => {
    const baseOptions = users.map((user) => ({
      value: user.telegramUserId,
      label: `${user.fullName} • @${user.userName || "-"} • ${user.telegramUserId}`,
    }));

    if (baseOptions.some((option) => option.value === draft.telegramUserId)) {
      return baseOptions;
    }

    return [
      {
        value: draft.telegramUserId,
        label: draft.telegramUserId,
      },
      ...baseOptions,
    ];
  }, [draft.telegramUserId, users]);

  const durationOptions = useMemo(
    () => [
      { value: "m30", label: `30 ${t("common.minutesShort")}` },
      { value: "m60", label: `60 ${t("common.minutesShort")}` },
      { value: "m90", label: `90 ${t("common.minutesShort")}` },
      { value: "m120", label: `120 ${t("common.minutesShort")}` },
    ],
    [t]
  );

  const typeOptions = useMemo(
    () => [
      { value: "individual", label: t("booking.lessonTypes.individual") },
      { value: "split", label: t("booking.lessonTypes.split") },
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

  const handleDraftChange = <K extends keyof DraftLesson>(field: K, value: DraftLesson[K]) => {
    console.log(draft);
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!draft.telegramUserId || !draft.date || !draft.time) {
      setError(t("lessons.editValidation"));
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const trimmedComments = draft.comments.trim();
      saveLessonCourt({
        date: `${draft.date} ${draft.time}`,
        time: draft.time,
        location: draft.location,
        duration: draft.duration,
        telegramUserId: draft.telegramUserId,
        court: Number(draft.court),
      });

      const updatedLesson = await updateLesson(lesson._id, {
        telegramUserId: draft.telegramUserId,
        date: `${draft.date} ${draft.time}`,
        time: draft.time,
        location: draft.location,
        court: Number(draft.court),
        duration: draft.duration,
        typeOfLesson: draft.typeOfLesson,
        multisport: draft.multisport,
        comments: trimmedComments || "-",
      });

      onSaved({
        ...updatedLesson,
        court: updatedLesson.court ?? Number(draft.court),
      });
      onClose();
    } catch (saveError) {
      console.error("Failed to update lesson:", saveError);
      setError(t("lessons.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={css.backdrop} onClick={onClose}>
      <div
        className={css.modal}
        role="dialog"
        aria-modal="true"
        aria-label={t("lessons.editBooking")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={css.header}>
          <div>
            <h2 className={css.title}>{t("lessons.editBooking")}</h2>
            <p className={css.subtitle}>{t("lessons.editSubtitle")}</p>
          </div>
          <button type="button" className={css.closeButton} onClick={onClose}>
            x
          </button>
        </div>

        <div className={css.formGrid}>
          <label className={`${css.field} ${css.fieldFull}`}>
            <span className={css.label}>{t("adminBooking.clientLabel")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="edit-lesson-user"
                value={draft.telegramUserId}
                onChange={(value) => handleDraftChange("telegramUserId", value)}
                options={userOptions}
                placeholder={t("adminBooking.chooseClient")}
                emptyText={t("adminBooking.noClients")}
                disabled={isLoadingUsers}
              />
            </div>
          </label>

          <label className={css.field}>
            <span className={css.label}>{t("booking.dateLabel")}</span>
            <div className={css.control}>
              <CustomDatePicker
                id="edit-lesson-date"
                value={draft.date}
                onChange={(value) => handleDraftChange("date", value)}
                allowPastDates
                label={t("booking.dateLabel")}
              />
            </div>
          </label>

          <label className={css.field}>
            <span className={css.label}>{t("booking.timeLabel")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="edit-lesson-time"
                value={draft.time}
                onChange={(value) => handleDraftChange("time", value)}
                options={TIME_OPTIONS}
                placeholder={t("booking.chooseTime")}
              />
            </div>
          </label>

          <label className={css.field}>
            <span className={css.label}>{t("booking.locationLabel")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="edit-lesson-location"
                value={draft.location}
                onChange={(value) => handleDraftChange("location", value as LessonLocation)}
                options={locationOptions}
                placeholder={t("adminBooking.chooseLocation")}
              />
            </div>
          </label>

          <label className={css.field}>
            <span className={css.label}>Court</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="edit-lesson-court"
                value={draft.court}
                onChange={(value) => handleDraftChange("court", value)}
                options={COURT_OPTIONS}
                placeholder="Choose court"
                emptyText="No available courts"
              />
            </div>
          </label>

          <label className={css.field}>
            <span className={css.label}>{t("booking.durationLabel")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="edit-lesson-duration"
                value={draft.duration}
                onChange={(value) => handleDraftChange("duration", value as LessonDuration)}
                options={durationOptions}
                placeholder={t("booking.chooseDuration")}
              />
            </div>
          </label>

          <label className={css.field}>
            <span className={css.label}>{t("booking.lessonTypeLabel")}</span>
            <div className={css.control}>
              <CustomDropdownSelect
                id="edit-lesson-type"
                value={draft.typeOfLesson}
                onChange={(value) => handleDraftChange("typeOfLesson", value as LessonType)}
                options={typeOptions}
                placeholder={t("booking.chooseLessonType")}
              />
            </div>
          </label>

          <label className={`${css.field} ${css.checkboxField}`}>
            <span className={css.label}>{t("booking.multisportLabel")}</span>
            <input
              type="checkbox"
              checked={draft.multisport}
              onChange={(event) => handleDraftChange("multisport", event.target.checked)}
            />
          </label>

          <label className={`${css.field} ${css.fieldFull}`}>
            <span className={css.label}>{t("adminBooking.commentsLabel")}</span>
            <textarea
              className={css.textarea}
              rows={4}
              value={draft.comments}
              onChange={(event) => handleDraftChange("comments", event.target.value)}
              placeholder={t("adminBooking.commentsPlaceholder")}
            />
          </label>
        </div>

        {error ? <p className={css.error}>{error}</p> : null}

        <div className={css.actions}>
          <button type="button" className={css.secondaryButton} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className={css.primaryButton} onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("common.saving") : t("lessons.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
