// Fixed reference lists served by the API (GET /api/currencies, GET /api/units) and validated against
// wherever a record stores a currency or a unit of measurement. Codes are stored; names are for display.

const CURRENCIES = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AED", name: "UAE Dirham", symbol: "AED" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
];

const UNITS = [
  { code: "PCS", name: "Piece", group: "Count" },
  { code: "PAIR", name: "Pair", group: "Count" },
  { code: "DOZEN", name: "Dozen", group: "Count" },
  { code: "SET", name: "Set", group: "Count" },
  { code: "BOX", name: "Box", group: "Packaging" },
  { code: "CARTON", name: "Carton", group: "Packaging" },
  { code: "PACK", name: "Pack", group: "Packaging" },
  { code: "BAG", name: "Bag", group: "Packaging" },
  { code: "BOTTLE", name: "Bottle", group: "Packaging" },
  { code: "CAN", name: "Can", group: "Packaging" },
  { code: "JAR", name: "Jar", group: "Packaging" },
  { code: "TUBE", name: "Tube", group: "Packaging" },
  { code: "ROLL", name: "Roll", group: "Packaging" },
  { code: "DRUM", name: "Drum", group: "Packaging" },
  { code: "PALLET", name: "Pallet", group: "Packaging" },
  { code: "L", name: "Litre", group: "Volume" },
  { code: "ML", name: "Millilitre", group: "Volume" },
  { code: "KG", name: "Kilogram", group: "Weight" },
  { code: "G", name: "Gram", group: "Weight" },
  { code: "MG", name: "Milligram", group: "Weight" },
  { code: "T", name: "Tonne", group: "Weight" },
  { code: "LB", name: "Pound", group: "Weight" },
  { code: "M", name: "Metre", group: "Length" },
  { code: "CM", name: "Centimetre", group: "Length" },
  { code: "MM", name: "Millimetre", group: "Length" },
  { code: "FT", name: "Foot", group: "Length" },
  { code: "IN", name: "Inch", group: "Length" },
  { code: "SQM", name: "Square Metre", group: "Area" },
  { code: "SQFT", name: "Square Foot", group: "Area" },
];

const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
const UNIT_CODES = UNITS.map((u) => u.code);

module.exports = { CURRENCIES, UNITS, CURRENCY_CODES, UNIT_CODES };
