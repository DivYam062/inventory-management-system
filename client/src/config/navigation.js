import {
  LayoutDashboard,
  Building2,
  Tags,
  Boxes,
  Store,
  Settings,
} from "lucide-react";

// Sidebar structure AND the organization route table (AppRoutes builds its routes from this list,
// so a page can never be reachable without a menu entry or a permission, or the other way round).
//
// Item shape:
//   { name, path, icon?, permission?: [resource, action], description?, children? }
//   - a leaf has a path (and usually a permission); `description` is shown on the placeholder page
//     until the module is built
//   - a group has `children`; its own path is a base that redirects to its first child
// Organization paths are relative to /{companyRoute} (the sidebar and redirects prefix them).

export const SYSTEM_NAVIGATION = [
  { name: "Dashboard", path: "/super-admin/dashboard", icon: LayoutDashboard },
  { name: "Organizations", path: "/super-admin/organizations", icon: Building2 },
];

export const ORGANIZATION_NAVIGATION = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },

  {
    name: "Catalog",
    path: "/catalog",
    icon: Tags,
    children: [
      {
        name: "Categories",
        path: "/catalog/categories",
        permission: ["category", "view"],
        description: "Group your products into categories.",
      },
      {
        name: "Products",
        path: "/catalog/products",
        permission: ["product", "view"],
        description: "Manage the products you stock, each linked to a category and a seller.",
      },
    ],
  },

  {
    name: "Inventory",
    path: "/inventory",
    icon: Boxes,
    children: [
      {
        name: "Total Inventory",
        path: "/inventory/total-inventory",
        permission: ["inventory", "view"],
        description: "Current stock for every product, with manual increase and decrease adjustments.",
      },
      {
        name: "Operations",
        path: "/inventory/operations",
        children: [
          {
            name: "Purchase Orders",
            path: "/inventory/operations/purchase-orders",
            permission: ["purchase-order", "view"],
            description: "Create and track purchase orders raised to sellers.",
          },
          {
            name: "Gate Entry",
            path: "/inventory/operations/gate-entries",
            permission: ["gate-entry", "view"],
            description: "Record goods arriving at the gate, against a purchase order or a seller and supplier.",
          },
          {
            name: "GRN",
            path: "/inventory/operations/grns",
            permission: ["grn", "view"],
            description: "Receive goods and record the passed and failed quantities.",
          },
          {
            name: "Putaway",
            path: "/inventory/operations/putaway",
            permission: ["putaway", "view"],
            description: "Move the passed items of a GRN into inventory.",
          },
        ],
      },
    ],
  },

  {
    name: "Seller",
    path: "/seller",
    icon: Store,
    children: [
      {
        name: "Sellers",
        path: "/seller/sellers",
        permission: ["seller", "view"],
        description: "The external seller organizations you buy from.",
      },
      {
        name: "Suppliers",
        path: "/seller/suppliers",
        permission: ["supplier", "view"],
        description: "The supplier users who belong to each seller.",
      },
    ],
  },

  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
    children: [
      {
        name: "Configuration",
        path: "/settings/configuration",
        permission: ["configuration", "view"],
        description: "Turn modules such as Purchase Order and Gate Entry on or off.",
      },
      {
        name: "Roles",
        path: "/settings/roles",
        permission: ["role", "view"],
        description: "Create roles and choose what each one can view, create and edit.",
      },
      {
        name: "Users",
        path: "/settings/users",
        permission: ["user", "view"],
        description: "Add users to your organization and assign them roles.",
      },
    ],
  },
];

// All pages (leaves), in menu order.
export const flattenNavigation = (items) =>
  items.flatMap((item) => (item.children ? flattenNavigation(item.children) : [item]));

// All groups at any depth, in menu order.
export const collectNavigationGroups = (items) =>
  items.flatMap((item) => (item.children ? [item, ...collectNavigationGroups(item.children)] : []));

// Drops what the user may not view; groups left with no visible children disappear too.
export const filterNavigation = (items, can) =>
  items
    .map((item) => (item.children ? { ...item, children: filterNavigation(item.children, can) } : item))
    .filter((item) =>
      item.children ? item.children.length > 0 : !item.permission || can(...item.permission)
    );
