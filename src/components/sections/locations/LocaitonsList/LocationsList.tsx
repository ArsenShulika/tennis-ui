import type { MouseEvent } from "react";
import { useLanguage } from "../../../../hooks/useLanguage";
import awfImage from "../../../../images/AWF.webp";
import gemImage from "../../../../images/GEM.jpeg";
import css from "./LocationsList.module.css";

type Location = {
  id: string;
  name: string;
  address: string;
  mapQuery: string;
  image: string;
};

const data: Location[] = [
  {
    id: "awf",
    name: "Hala tenisowa AWF Wrocław",
    address: "al. Ignacego Jana Paderewskiego 41, 51-612 Wrocław",
    mapQuery: "al. Ignacego Jana Paderewskiego 41, 51-612 Wrocław",
    image: awfImage,
  },
  {
    id: "gem",
    name: 'Hala Tenisowa i Wielofunkcyjna Hotel GEM (Klub Sportowy "AZS" Wrocław)',
    address: "Józefa Mianowskiego 2B, 51-605 Wrocław",
    mapQuery: "Józefa Mianowskiego 2B, 51-605 Wrocław",
    image: gemImage,
  },
  {
    id: "morskie-oko",
    name: "Korty Morskie Oko",
    address: "Fryderyka Chopina 27, 51-609 Wrocław",
    mapQuery: "Fryderyka Chopina 27, 51-609 Wrocław",
    image:
      "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=NwtEjN2sT0Xnbq8Ptptddw&cb_client=search.gws-prod.gps&w=408&h=240&yaw=205.94199&pitch=0&thumbfov=100",
  },
];

const isPlainLeftClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

const LocationsList = () => {
  const { t } = useLanguage();

  const handleCardClick = (event: MouseEvent<HTMLAnchorElement>, mapUrl: string) => {
    const telegramWebApp = window.Telegram?.WebApp;

    if (!telegramWebApp?.openLink || !isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();
    telegramWebApp.openLink(mapUrl);
  };

  return (
    <ul className={css.locationList}>
      {data.map((loc) => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          loc.mapQuery
        )}`;

        return (
          <li key={loc.id}>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={css.card}
              onClick={(event) => handleCardClick(event, mapUrl)}
              aria-label={t("locations.openInMaps", { name: loc.name })}
            >
              <div className={css.image}>
                <img src={loc.image} alt={loc.name} loading="lazy" />
              </div>
              <div className={css.body}>
                <h3 className={css.title}>{loc.name}</h3>
                <p className={css.address}>{loc.address}</p>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
};

export default LocationsList;
