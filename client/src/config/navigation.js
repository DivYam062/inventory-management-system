import { LayoutDashboard } from "lucide-react";

// Sidebar structure. `permission: [resource, action]` hides an item from users who lack it.
// Items are added here as each module ships; only working pages are listed.

export const SYSTEM_NAVIGATION = [
  { name: "Dashboard", path: "/super-admin/dashboard", icon: LayoutDashboard },
];

// Organization paths are relative to /{companyRoute} (the sidebar prefixes them).
export const ORGANIZATION_NAVIGATION = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
];
