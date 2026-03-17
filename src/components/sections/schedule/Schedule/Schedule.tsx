import css from "./Schedule.module.css";

type Availability = Record<string, string[]>; // yyyy-mm-dd -> ["08:00", "09:00", ...]

const HOURS_START = 8;
const HOURS_END = 22; // exclusive label end for last cell

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getCurrentWeek(): Date[] {
  const now = new Date();
  const day = now.getDay(); // 0 Sun - 6 Sat
  const mondayOffset = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function hoursRange() {
  const arr: string[] = [];
  for (let h = HOURS_START; h < HOURS_END; h++) {
    for (let m = 0; m < 60; m += 30) {
      arr.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return arr;
}

function isToday(d: Date) {
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

const dayFmt = new Intl.DateTimeFormat("uk-UA", { weekday: "short" });

// Demo availability for the week (replace with real data later)
const demoAvailability: Availability = (() => {
  const week = getCurrentWeek();
  const avail: Availability = {};
  week.forEach((d, idx) => {
    const key = formatDate(d);
    // Make some pattern: Mon/Wed/Fri afternoons, Tue/Thu mornings
    const times: string[] = [];
    if (idx % 2 === 0) {
      for (let h = 16; h < 21; h++) times.push(`${pad2(h)}:00`);
    } else {
      for (let h = 9; h < 12; h++) times.push(`${pad2(h)}:00`);
    }
    avail[key] = times;
  });
  return avail;
})();

export default function Schedule({ availability = demoAvailability }: { availability?: Availability }) {
  const week = getCurrentWeek();
  const times = hoursRange();

  return (
    <section className={css.schedule}>
      <div className={css.scrollArea}>
        <div className={css.headerRow}>
          <div className={css.timeHead}>Час</div>
          {week.map((d) => (
            <div key={formatDate(d)} className={`${css.dayHead} ${isToday(d) ? css.today : ""}`}>
              <div className={css.dayName}>{dayFmt.format(d)}</div>
              <div className={css.dayDate}>{d.getDate()}</div>
            </div>
          ))}
        </div>

        <div className={css.grid}>
          <div className={css.gridInner}>
            {/* Time column */}
            <div className={css.timeCol}>
              {times.map((t) => (
                <div key={t} className={css.timeCell} aria-hidden>
                  {t}
                </div>
              ))}
            </div>

            {/* 7 day columns */}
            {week.map((d) => {
              const key = formatDate(d);
              const dayAvail = new Set((availability[key] ?? []).map((t) => t));
              const colClass = `${css.dayCol} ${isToday(d) ? css.today : ""}`;
              return (
                <div key={key} className={colClass}>
                  {times.map((t) => {
                    const isAvail = dayAvail.has(t);
                    const cls = `${css.slot} ${isAvail ? css.available : css.busy}`;
                    return (
                      <div key={`${key}-${t}`} className={cls} title={`${key} ${t}`}>
                        {isAvail ? "Вільно" : "—"}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={css.legend}>
        <span className={css.legendItem}><span className={`${css.legendSwatch} ${css.legendAvail}`} /> Вільно</span>
        <span className={css.legendItem}><span className={`${css.legendSwatch} ${css.legendBusy}`} /> Недоступно</span>
      </div>
    </section>
  );
}
