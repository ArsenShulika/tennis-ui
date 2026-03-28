import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../../hooks/useLanguage";
import css from "./CustomDatePicker.module.css";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  label: string;
  placeholder?: string;
};

function parseDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string, locale: string) {
  const date = parseDateValue(value);
  if (!date) return value;

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isBeforeDay(left: Date, right: Date) {
  const leftValue = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime();
  const rightValue = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime();
  return leftValue < rightValue;
}

function buildCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
}

export default function CustomDatePicker({
  id,
  value,
  onChange,
  minDate,
  label,
  placeholder,
}: Props) {
  const { locale, language, t } = useLanguage();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const minDateObject = useMemo(() => parseDateValue(minDate ?? "") ?? today, [minDate, today]);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    startOfMonth(selectedDate ?? minDateObject)
  );

  useEffect(() => {
    setVisibleMonth(startOfMonth(selectedDate ?? minDateObject));
  }, [selectedDate, minDateObject]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const weekdayLabels = useMemo(
    () =>
      language === "uk"
        ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    [language]
  );
  const monthLabels = useMemo(
    () =>
      language === "uk"
        ? [
            "січень",
            "лютий",
            "березень",
            "квітень",
            "травень",
            "червень",
            "липень",
            "серпень",
            "вересень",
            "жовтень",
            "листопад",
            "грудень",
          ]
        : [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ],
    [language]
  );
  const resolvedPlaceholder = placeholder ?? t("datePicker.placeholder");
  const monthLabel = `${monthLabels[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}${
    language === "uk" ? ` ${t("datePicker.yearShort")}` : ""
  }`;
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const canGoToPreviousMonth =
    startOfMonth(visibleMonth).getTime() > startOfMonth(minDateObject).getTime();

  return (
    <div className={css.root} ref={rootRef}>
      <button
        id={id}
        type="button"
        className={`${css.trigger} ${isOpen ? css.triggerOpen : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={css.triggerLabel}>
          {value ? formatDisplayDate(value, locale) : resolvedPlaceholder}
        </span>
      </button>

      {isOpen ? (
        <div className={css.popover} role="dialog" aria-label={label}>
          <div className={css.header}>
            <button
              type="button"
              className={css.navButton}
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
              disabled={!canGoToPreviousMonth}
              aria-label={t("datePicker.previousMonth")}
            >
              ←
            </button>
            <div className={css.monthLabel}>{monthLabel}</div>
            <button
              type="button"
              className={css.navButton}
              onClick={() =>
                setVisibleMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                )
              }
              aria-label={t("datePicker.nextMonth")}
            >
              →
            </button>
          </div>

          <div className={css.weekdays}>
            {weekdayLabels.map((weekday) => (
              <span key={weekday} className={css.weekday}>
                {weekday}
              </span>
            ))}
          </div>

          <div className={css.grid}>
            {calendarDays.map((day) => {
              const dateValue = formatDateValue(day);
              const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();
              const isDisabled = isBeforeDay(day, minDateObject);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isToday = isSameDay(day, today);

              return (
                <button
                  key={dateValue}
                  type="button"
                  className={`${css.dayButton} ${isOutsideMonth ? css.dayOutside : ""} ${
                    isSelected ? css.daySelected : ""
                  } ${isToday ? css.dayToday : ""}`}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(dateValue);
                    setIsOpen(false);
                  }}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
