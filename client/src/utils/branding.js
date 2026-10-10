// System default brand colors, used when an organization has "Use Custom Colors" off.
// Keep in sync with DEFAULT_BRANDING in server/config/constants.js.
export const DEFAULT_BRANDING = {
  primary: "#2563eb",
  primaryLight: "#60a5fa",
  primaryLighter: "#dbeafe",
  primaryDark: "#1d4ed8",
};

export const BRANDING_COLOR_FIELDS = [
  { key: "primary", label: "Primary" },
  { key: "primaryLight", label: "Primary Light" },
  { key: "primaryLighter", label: "Primary Lighter" },
  { key: "primaryDark", label: "Primary Dark" },
];

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
