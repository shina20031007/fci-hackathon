export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-CA", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Toronto",
      }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))
    : "Not verified";
}
export function formatTime(value: string | null, timeZone: string) {
  return value
    ? new Intl.DateTimeFormat("en-CA", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
      }).format(new Date(value))
    : "Not verified";
}
