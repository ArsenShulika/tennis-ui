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
    image:
      "https://lh3.googleusercontent.com/gps-cs-s/AHVAweoci4YQZoMS-QVh3ljIb0fuGuombh2p2Ov90yxl1lJdUenV83h-bTrgjK2F004nJWuCaSJ_bLGdviHSy8A4YUBZj3s67xweR0Te2JkEj_7AE1A05MDq3D3enfdrHvzfSV0gVMk=w408-h306-k-no",
  },
  {
    id: "gem",
    name: 'Hala Tenisowa i Wielofunkcyjna Hotel GEM (Klub Sportowy "AZS" Wrocław)',
    address: "Józefa Mianowskiego 2B, 51-605 Wrocław",
    mapQuery: "Józefa Mianowskiego 2B, 51-605 Wrocław",
    image:
      "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepjGOqXOhESziqba8IonijZ-iDshM8ZMrOTfB25eVOFgQHXHUfwn07VPPcDYoYT_hGn-ixalpGBdTSh8Tvy0u9j2-jHQdtwlaP9RzJvPP9w5Zx6T_CKZcGv-cAmg_6aalNwgMzr=w408-h272-k-no",
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

const LocationsList = () => {
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
              aria-label={`Відкрити в Google Maps: ${loc.name}`}
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
