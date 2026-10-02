export type DayStatus = "" | "K" | "U" | "F" | "UF";

export const dayStatusOptions = [
  { value: "", label: "Keine Auswahl" },
  { value: "K", label: "K (Krank)" },
  { value: "U", label: "U (Urlaub)" },
  { value: "F", label: "F (Feiertag)" },
  { value: "UF", label: "UF (unbezahlt frei)" }
] as const;

export function getDayStatusText(value: DayStatus): string {
  switch (value) {
    case "K": return "Krank";
    case "U": return "Urlaub";
    case "F": return "Feiertag";
    case "UF": return "unbezahlt frei";
    default: return "";
  }
}

export function isDayStatusSelected(value: DayStatus): boolean {
  return value !== "";
}
