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
