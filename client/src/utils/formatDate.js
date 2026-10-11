// Dates arrive as ISO strings. Date-only values (order date, expected date) are stored at UTC midnight, so
// they are shown in UTC to never slip a day.
export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

// Today as YYYY-MM-DD in the user's own calendar (for a date input's default).
export const todayInputValue = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// An ISO date -> YYYY-MM-DD for a date input.
export const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

// A moment in time (e.g. when goods arrived), shown in the user's own time zone.
export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

const pad = (n) => String(n).padStart(2, "0");

// A Date -> YYYY-MM-DDTHH:mm in the user's own time zone (what a datetime-local input expects).
const toLocalInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const nowInputDateTime = () => toLocalInput(new Date());

export const toInputDateTime = (value) => (value ? toLocalInput(new Date(value)) : "");
