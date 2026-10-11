// Single source of truth for the permission model: Feature (resource) + Action.
// Roles store grants against these keys; middleware and the client `can()` check them.

const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
};

const { VIEW, CREATE, EDIT } = ACTIONS;

// There is no separate Delete permission: whoever may EDIT a feature may also delete its records and
// switch them active/inactive. group/label are display metadata for the (Phase 4) role editor.
const PERMISSION_REGISTRY = [
  { resource: "category", label: "Category", group: "Catalog", actions: [VIEW, CREATE, EDIT] },
  { resource: "product", label: "Product", group: "Catalog", actions: [VIEW, CREATE, EDIT] },
  { resource: "seller", label: "Seller", group: "Seller", actions: [VIEW, CREATE, EDIT] },
  { resource: "supplier", label: "Supplier", group: "Seller", actions: [VIEW, CREATE, EDIT] },
  { resource: "purchase-order", label: "Purchase Order", group: "Procurement", actions: [VIEW, CREATE, EDIT] },
  { resource: "gate-entry", label: "Gate Entry", group: "Receiving", actions: [VIEW, CREATE, EDIT] },
  { resource: "grn", label: "GRN", group: "Receiving", actions: [VIEW, CREATE, EDIT] },
  { resource: "putaway", label: "Putaway", group: "Inventory", actions: [VIEW, CREATE] },
  // Edit increases or decreases stock by hand. Stock rows themselves are created by Putaway.
  { resource: "inventory", label: "Inventory", group: "Inventory", actions: [VIEW, EDIT] },
  { resource: "audit-log", label: "Audit Log", group: "Logs", actions: [VIEW] },
  { resource: "configuration", label: "Configuration", group: "Settings", actions: [VIEW, EDIT] },
  { resource: "role", label: "Role", group: "Settings", actions: [VIEW, CREATE, EDIT] },
  // Edit also covers deleting a user and switching them active/inactive.
  { resource: "user", label: "User", group: "Settings", actions: [VIEW, CREATE, EDIT] },
];

const RESOURCE_ACTIONS = Object.fromEntries(
  PERMISSION_REGISTRY.map((entry) => [entry.resource, entry.actions])
);

const RESOURCES = PERMISSION_REGISTRY.map((entry) => entry.resource);

const isValidPermission = (resource, action) =>
  Boolean(RESOURCE_ACTIONS[resource]?.includes(action));

// Every permission in the system, as { resource: [actions] }. Used for protected full-access roles.
const getAllPermissions = () =>
  Object.fromEntries(
    Object.entries(RESOURCE_ACTIONS).map(([resource, actions]) => [resource, [...actions]])
  );

module.exports = {
  ACTIONS,
  PERMISSION_REGISTRY,
  RESOURCE_ACTIONS,
  RESOURCES,
  isValidPermission,
  getAllPermissions,
};
