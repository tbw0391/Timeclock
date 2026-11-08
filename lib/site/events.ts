// Upcoming events on the website, kept in site_content 'events' and shown by
// the "events" section (the Upcoming Events page). The database's
// site_events() hands back only the ones still to come.

export type SiteEvent = { date: string; title: string; details?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Whatever came back from the database, as clean events, soonest first.
export function cleanEvents(raw: unknown): SiteEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is SiteEvent => !!e && typeof e.date === "string" && DATE.test(e.date) && typeof e.title === "string" && !!e.title.trim())
    .map((e) => ({ date: e.date, title: e.title.trim(), ...(typeof e.details === "string" && e.details.trim() ? { details: e.details.trim() } : {}) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

// "Saturday, November 14" in the reader's language, read as a calendar day
// (not shifted by time zone).
export function eventDate(date: string, intl: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(intl, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export const eventStrings = (events: SiteEvent[]) => events.flatMap((e) => (e.details ? [e.title, e.details] : [e.title]));
