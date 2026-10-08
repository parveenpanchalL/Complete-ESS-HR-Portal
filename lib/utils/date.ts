const tz = () => process.env.APP_TIMEZONE || "Asia/Kolkata";

/** Today's date (YYYY-MM-DD) in the company timezone. */
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
}
export function currentMonth(): string {
  return todayStr().slice(0, 7);
}
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
export function hoursBetween(inT?: string | null, outT?: string | null): number | null {
  if (!inT || !outT) return null;
  const [ih, im] = inT.split(":").map(Number);
  const [oh, om] = outT.split(":").map(Number);
  if ([ih, im, oh, om].some((n) => Number.isNaN(n))) return null;
  const mins = oh * 60 + om - (ih * 60 + im);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : null;
}

export function currentTimeStr(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
