import css from "./LocationsList.module.css";

type Location = {
  id: string;
  name: string;
  address: string;
  image: string;
};

const data: Location[] = [
  {
    id: "awf",
    name: "Hala tenisowa AWF Wrocław",
    address: "al Ignacego Jana Paderewskiego 41, 51-612 Wrocław",
    image:
      "https://lh3.googleusercontent.com/p/AF1QipNKvkXbX4II8tqfZtJ5H8MBjPOcTjc6dUbe2riU=s1360-w1360-h1020-rw",
  },
  {
    id: "gem",
    name: 'Hala Tenisowa i Wielofunkcyjna Hotel GEM (Klub Sportowy "AZS" Wrocław)',
    address: "Józefa Mianowskiego 2B, 51-605 Wrocław",
    image:
      "https://lh3.googleusercontent.com/p/AF1QipNk1hYElvLYguKFtqrn_qmEA-UC2zC66AQBU65s=s1360-w1360-h1020-rw",
  },
  {
    id: "morskie-oko",
    name: "Korty Morskie Oko",
    address: "Fryderyka Chopina 27, 51-609 Wrocław",
    image:
      "https://lh3.googleusercontent.com/gps-cs-s/AC9h4npyPElsYRch_KYvRpcg1JOelzKcfazfwEVWuHWaHfIDDkB_OaZChJNzcUijsFs6OVGwclEatFepB7ksHU5eLf1_sdMe3200ce8y9zjTc8YzjOLhvGTPURWqjiAoyXgocKU_hdytcg=s1360-w1360-h1020-rw",
  },
];

const LocationsList = () => {
  return (
    <ul className={css["locationList"]}>
      {data.map((loc) => {
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          loc.address
        )}`;
        return (
          <li key={loc.id}>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={css["card"]}
              aria-label={`Відкрити в Google Maps: ${loc.name}`}
            >
              <div className={css["image"]}>
                <img src={loc.image} alt={loc.name} loading="lazy" />
              </div>
              <div className={css["body"]}>
                <h3 className={css["title"]}>{loc.name}</h3>
                <p className={css["address"]}>{loc.address}</p>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
};

export default LocationsList;
