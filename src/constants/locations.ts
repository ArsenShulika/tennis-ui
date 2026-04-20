import { LessonLocation } from "../types/lesson";

export const LOCATION_LABELS: Record<LessonLocation, string> = {
  awf: "Hala tenisowa AWF",
  gem: "Hala wielofunkcyjna GEM",
  oko: "Korty Morskie Oko",
  olimpijski: "Korty Olimpijski",
};

export const LOCATION_OPTIONS: Array<{ value: LessonLocation; label: string }> = [
  { value: "awf", label: LOCATION_LABELS.awf },
  { value: "gem", label: LOCATION_LABELS.gem },
  { value: "oko", label: LOCATION_LABELS.oko },
  { value: "olimpijski", label: LOCATION_LABELS.olimpijski },
];

export function isLessonLocation(value: string | null): value is LessonLocation {
  return value === "awf" || value === "gem" || value === "oko" || value === "olimpijski";
}
