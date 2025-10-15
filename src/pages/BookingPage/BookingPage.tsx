import BookingForm from "../../components/sections/booking/BookingForm/BookingForm";
import css from "./BookingPage.module.css";

const BookingPage = () => {
  return (
    <div className={css["bookingPage"]}>
      <BookingForm />
    </div>
  );
};

export default BookingPage;
