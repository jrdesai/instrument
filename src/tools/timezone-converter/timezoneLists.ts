/** Common timezones shown at top of dropdown (order preserved). */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
] as const;

/** Format timezone label for dropdown: "America/New_York (UTC-5)". */
export function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    const offset = offsetPart?.value ?? "";
    if (offset) return `${tz} (${offset})`;
  } catch {
    // invalid zone
  }
  return tz;
}

/** All IANA timezone names (from Intl when available), sorted, with common first. */
export function getTimezoneList(): string[] {
  let all: string[] = [];
  try {
    const supportedValuesOf =
      typeof Intl !== "undefined" && "supportedValuesOf" in Intl
        ? (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf
        : undefined;
    if (supportedValuesOf) {
      all = supportedValuesOf.call(Intl, "timeZone") ?? [];
    }
  } catch {
    // fallback to common + a minimal list
  }
  if (all.length === 0) {
    all = [...COMMON_TIMEZONES];
  } else {
    all = all.slice().sort();
  }
  const commonSet = new Set<string>(COMMON_TIMEZONES);
  const rest = all.filter((tz) => !commonSet.has(tz));
  return [...COMMON_TIMEZONES, ...rest];
}
