import css from "./LocationsPage.module.css";
import LocationsList from "../../components/sections/locations/LocaitonsList/LocationsList";

const LocationsPage = () => {
  return (
    <div className={css["locationsPage"]}>
      <LocationsList />
    </div>
  );
};

export default LocationsPage;
