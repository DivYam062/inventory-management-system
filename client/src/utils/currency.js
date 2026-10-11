// Keep in sync with server/models/Settings.js SUPPORTED_CURRENCIES.
export const CURRENCY_OPTIONS = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
];

export const formatCurrency = (amount, currencyCode = "INR") => {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    // Not an ISO currency (an organization can define its own, e.g. reward points): show the code.
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currencyCode}`;
  }
};
