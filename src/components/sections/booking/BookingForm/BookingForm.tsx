import { useEffect, useMemo, useRef, useState } from "react";
import NiceSelect from "../../../shared/NiceSelect/NiceSelect";
import css from "./BookingForm.module.css";
import { Lesson, NewLesson } from "../../../../types/lesson";
import { getBookingTimeOptions } from "../../../../helpers/lessonsConverter";
import { createLesson, GetLessonsByDay } from "../../../../api/lessonsapi";

const BookingForm = () => {
  const [lessonInfo, setLessonInfo] = useState<NewLesson>({});
  // const [timeOptions, setTimeOptions] = useState([]);
  // const [durationOptions, setDurationOptions] = useState([]);
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
  const dateRef = useRef<HTMLInputElement | null>(null);
  const formElem = useRef<HTMLFormElement | null>(null);

  const handleSubmit = (formData: FormData) => {
    const data = Object.fromEntries(formData.entries()) as NewLesson;
    data.multisport = Boolean(data.multisport);
    data.date = `${data.date} ${data.time}`;
    createLesson(data);
  };

  const openDatePicker = () => {
    const el = dateRef.current as unknown as { showPicker?: () => void } | null;
    el?.showPicker?.();
  };

  const locationOptions = [
    { value: "awf", label: "Hala tenisowa AWF" },
    { value: "gem", label: "Hala wielofunkcyjna GEM" },
    { value: "oko", label: "Korty morskie oko" },
  ];

  const timeOptions = useMemo(() => {
    if (!lessonInfo.location) return [];
    return getBookingTimeOptions(todayLessons, lessonInfo.location);
  }, [todayLessons, lessonInfo.location]);

  const durationOptions = [
    { value: "m60", label: "60хв" },
    { value: "m90", label: "90хв" },
    { value: "m120", label: "120хв" },
  ];

  const lessonTypeOptions = [
    { value: "individual", label: "Індивідуальне заняття" },
    { value: "split", label: "Спліт заняття (для двох)" },
  ];

  const handleFormChange = (e: React.FormEvent<HTMLFormElement>) => {
    if (!formElem.current) return;
    e.preventDefault();
    const formData = new FormData(formElem.current);
    const data = Object.fromEntries(formData.entries()) as NewLesson;
    setLessonInfo(data);
    console.log(data);
  };

  useEffect(() => {
    if (!lessonInfo.date) return;

    const loadLessons = async () => {
      try {
        const data = await GetLessonsByDay(lessonInfo.date as string);
        setTodayLessons(data.lessons);
      } catch (error) {
        console.error("Error loading lessons:", error);
      }
    };

    loadLessons();
  }, [lessonInfo.date]);

  return (
    <form
      className={css["bookingForm"]}
      action={handleSubmit}
      ref={formElem}
      onChange={handleFormChange}
    >
      <label htmlFor="date">Дата:</label>
      <input
        type="date"
        name="date"
        id="date"
        ref={dateRef}
        onFocus={openDatePicker}
        onClick={openDatePicker}
      />

      <label htmlFor="location">Локація:</label>
      <div className={css["selectField"]}>
        <NiceSelect
          id="location"
          name="location"
          placeholder="Оберіть локацію"
          options={locationOptions}
          defaultValue="awf"
          required
        />
      </div>

      <label htmlFor="time">Час:</label>
      <div className={css["selectField"]}>
        <NiceSelect
          id="time"
          name="time"
          placeholder="Оберіть час"
          options={timeOptions}
          required
        />
      </div>

      <label htmlFor="duration">Тривалість:</label>
      <div className={css["selectField"]}>
        <NiceSelect
          id="duration"
          name="duration"
          placeholder="Оберіть тривалість"
          options={durationOptions}
          defaultValue="m60"
          required
        />
      </div>

      <label htmlFor="typeOfLesson">Тип заняття:</label>
      <div className={css["selectField"]}>
        <NiceSelect
          id="typeOfLesson"
          name="typeOfLesson"
          placeholder="Оберіть тип"
          options={lessonTypeOptions}
          defaultValue="individual"
        />
      </div>

      <div className={css["checkboxRow"]}>
        <label htmlFor="multisport">Картка MultiSport</label>
        <input
          type="checkbox"
          name="multisport"
          id="multisport"
          value="multisport"
        />
      </div>

      <button type="submit">Підтвердити бронювання</button>
    </form>
  );
};

export default BookingForm;
