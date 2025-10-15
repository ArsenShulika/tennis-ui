import { lazy } from "react";
import BookingPage from "./BookingPage/BookingPage";

export default {
  Home: lazy(() => import("./HomePage/HomePage")),
  Admin: lazy(() => import("./AdminPage/AdminPage")),
  Booking: BookingPage,
  Lessons: lazy(() => import("./LessonsPage/LessonsPage")),
  Locations: lazy(() => import("./LocationsPage/LocationsPage")),
  Settings: lazy(() => import("./SettingsPage/SettingsPage")),
  Payments: lazy(() => import("./PaymentsPage/PaymentsPage")),
};
