import css from "./BookingForm.module.css";

const BookingForm = () => {
  const handleSubmit = (formData: FormData) => {
    const data = Object.fromEntries(formData.entries());
    console.log(data);
  };

  return (
    <form className={css["bookingForm"]} action={handleSubmit}>
      <label htmlFor="">Дата:</label>
      <input type="date" name="date" />
      <label htmlFor="">Локация:</label>
      <select name="location">
        <option value="" disabled>
          выберите локацию
        </option>
        <option value="awf">Hala tenisowa AWF</option>
        <option value="gem">Hala wielofunkcyjna GEM</option>
        <option value="oko">Korty morskie oko</option>
      </select>
      <label htmlFor="">Время:</label>
      <select name="time">
        <option value="" disabled>
          выберите время
        </option>
        <option value=""></option>
        <option value=""></option>
        <option value=""></option>
      </select>
      <label htmlFor="">Длительность:</label>
      <select name="duration">
        <option value="" disabled>
          выберите длительность
        </option>
        <option value="m60">1 час</option>
        <option value="m90">1.5 часа</option>
        <option value="m120">2 часа</option>
      </select>
      <label htmlFor="">Тип занятия:</label>
      <select name="typeOfLesson">
        <option value="individual" defaultChecked>
          Индивидуальное занятие
        </option>
        <option value="split">Сплит занятие(парное)</option>
      </select>
      <label htmlFor="">Карта MultiSport:</label>
      <input type="checkbox" name="multisport" value="multisport" />
      <button type="submit">Зарезервировать занятие</button>
    </form>
  );
};

export default BookingForm;
