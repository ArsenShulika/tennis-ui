import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../../../hooks/useLanguage";
import css from "./CustomDatePicker.module.css";

type BaseProps = {
  id: string;
  minDate?: string;
  allowPastDates?: boolean;
  label: string;
  placeholder?: string;
};

type SingleProps = BaseProps & {
  selectionMode?: "single";
  value: string;
  onChange: (value: string) => void;
};

type MultipleProps = BaseProps & {
  selectionMode: "multiple";
  selectedDates: string[];
  onSelectedDatesChange: (values: string[]) => void;
};

type Props = SingleProps | MultipleProps;

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

function formatTriggerValue(values: string[], locale: string) {
  if (values.length === 0) return "";

  const sortedValues = [...values].sort((left, right) => left.localeCompare(right));
  const visibleLabels = sortedValues
    .slice(0, 2)
    .map((dateValue) => formatDisplayDate(dateValue, locale));

  if (sortedValues.length <= 2) {
    return visibleLabels.join(", ");
  }

  return `${visibleLabels.join(", ")} +${sortedValues.length - 2}`;
}

export default function CustomDatePicker({
  id,
  minDate,
  allowPastDates = false,
  label,
  placeholder,
  ...selectionProps
}: Props) {
  const { locale, language, t } = useLanguage();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isMultiple = selectionProps.selectionMode === "multiple";
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const minDateObject = useMemo(() => {
    if (allowPastDates) return null;
    return parseDateValue(minDate ?? "") ?? today;
  }, [allowPastDates, minDate, today]);
  const singleValue = isMultiple ? "" : selectionProps.value;
  const selectedDates = isMultiple ? selectionProps.selectedDates : [];
  const selectedDateValues = isMultiple ? selectedDates : singleValue ? [singleValue] : [];
  const selectedDate = useMemo(
    () => (singleValue ? parseDateValue(singleValue) : null),
    [singleValue]
  );
  const firstSelectedDate = useMemo(
    () =>
      parseDateValue(
        [...selectedDateValues].sort((left, right) => left.localeCompare(right))[0] ?? ""
      ),
    [selectedDateValues]
  );
  const [visibleMonth, setVisibleMonth] = useState<Date>(() =>
    startOfMonth(selectedDate ?? firstSelectedDate ?? today)
  );

  useEffect(() => {
    if (isMultiple) {
      if (selectedDateValues.length === 0) {
        setVisibleMonth(startOfMonth(minDateObject ?? today));
      }
      return;
    }

    setVisibleMonth(startOfMonth(selectedDate ?? minDateObject ?? today));
  }, [isMultiple, minDateObject, selectedDate, selectedDateValues.length, today]);

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
  const triggerValue = isMultiple
    ? formatTriggerValue(selectedDateValues, locale)
    : singleValue
      ? formatDisplayDate(singleValue, locale)
      : "";
  const monthLabel = `${monthLabels[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}${
    language === "uk" ? ` ${t("datePicker.yearShort")}` : ""
  }`;
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const canGoToPreviousMonth = minDateObject
    ? startOfMonth(visibleMonth).getTime() > startOfMonth(minDateObject).getTime()
    : true;

  const handleDaySelect = (dateValue: string) => {
    if (isMultiple) {
      const nextValues = selectedDateValues.includes(dateValue)
        ? selectedDateValues.filter((item) => item !== dateValue)
        : [...selectedDateValues, dateValue];

      selectionProps.onSelectedDatesChange(nextValues);
      return;
    }

    selectionProps.onChange(dateValue);
    setIsOpen(false);
  };

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
          {triggerValue || resolvedPlaceholder}
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
              const isDisabled = minDateObject ? isBeforeDay(day, minDateObject) : false;
              const isSelected = selectedDateValues.includes(dateValue);
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
                    handleDaySelect(dateValue);
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
