export const COURT_OPTIONS = Array.from({ length: 13 }, (_, index) => {
  const court = String(index + 1);
  return {
    value: court,
    label: `Court ${court}`,
  };
});
