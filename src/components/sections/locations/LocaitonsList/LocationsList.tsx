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
  pricingTitle?: string;
  pricing?: Array<{
    days: string;
    time: string;
    price: string;
  }>;
  pricingNote?: string;
};

const data: Location[] = [
  {
    id: "awf",
    name: "Hala tenisowa AWF Wrocław",
    address: "al. Ignacego Jana Paderewskiego 41, 51-612 Wrocław",
    mapQuery: "al. Ignacego Jana Paderewskiego 41, 51-612 Wrocław",
    image: awfImage,
    pricingTitle: "Winter Season Court Rental Prices",
    pricing: [
      {
        days: "Monday - Friday",
        time: "07:00 - 15:00",
        price: "110.00 PLN",
      },
      {
        days: "Monday - Friday",
        time: "15:00 - 21:00",
        price: "155.00 PLN",
      },
      {
        days: "Monday - Friday",
        time: "21:00 - 23:00",
        price: "130.00 PLN",
      },
      {
        days: "Saturday - Sunday",
        time: "07:00 - 21:00",
        price: "120.00 PLN",
      },
    ],
  },
  {
    id: "gem",
    name: 'Hala Tenisowa i Wielofunkcyjna Hotel GEM (Klub Sportowy "AZS" Wrocław)',
    address: "Józefa Mianowskiego 2B, 51-605 Wrocław",
    mapQuery: "Józefa Mianowskiego 2B, 51-605 Wrocław",
    image: gemImage,
    pricingTitle: "Winter Season Court Rental Prices",
    pricing: [
      {
        days: "Monday - Friday",
        time: "07:00 - 16:00",
        price: "110.00 PLN",
      },
      {
        days: "Monday - Friday",
        time: "16:00 - 22:00",
        price: "155.00 PLN",
      },
      {
        days: "Saturday - Sunday",
        time: "07:00 - 20:00",
        price: "120.00 PLN",
      },
    ],
  },
  {
    id: "morskie-oko",
    name: "Korty Morskie Oko",
    address: "Fryderyka Chopina 27, 51-609 Wrocław",
    mapQuery: "Fryderyka Chopina 27, 51-609 Wrocław",
    pricingTitle: "Winter Season Court Rental Prices",
    pricing: [
      {
        days: "Weekdays",
        time: "06:00 - 15:00",
        price: "135.00 PLN",
      },
      {
        days: "Weekdays",
        time: "15:00 - 23:59",
        price: "165.00 PLN",
      },
      {
        days: "Weekend",
        time: "06:00 - 23:59",
        price: "135.00 PLN",
      },
    ],
    pricingNote:
      "* Weekend court bookings for 2 hours are available at 85 PLN per hour.",
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
                <div className={css.summary}>
                  <h3 className={css.title}>{loc.name}</h3>
                  <p className={css.address}>{loc.address}</p>
                </div>
                {loc.pricing ? (
                  <section className={css.pricingSection} aria-label={loc.pricingTitle}>
                    <p className={css.pricingTitle}>{loc.pricingTitle}</p>
                    <ul className={css.pricingList}>
                      {loc.pricing.map((item) => (
                        <li
                          key={`${item.days}-${item.time}-${item.price}`}
                          className={css.pricingItem}
                        >
                          <div className={css.pricingMeta}>
                            <span className={css.pricingDays}>{item.days}</span>
                            <span className={css.pricingTime}>{item.time}</span>
                          </div>
                          <span className={css.pricingValue}>{item.price}</span>
                        </li>
                      ))}
                    </ul>
                    {loc.pricingNote ? (
                      <p className={css.pricingNote}>{loc.pricingNote}</p>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
};

export default LocationsList;
