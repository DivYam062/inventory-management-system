// Single source of truth for the permission model: Feature (resource) + Action.
// Roles store grants against these keys; middleware and the client `can()` check them.

const ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  EDIT: "edit",
  DELETE: "delete",
};

const { VIEW, CREATE, EDIT, DELETE } = ACTIONS;

// group/label are display metadata for the (Phase 4) role editor.
const PERMISSION_REGISTRY = [
  { resource: "category", label: "Category", group: "Catalog", actions: [VIEW, CREATE, EDIT, DELETE] },
  { resource: "product", label: "Product", group: "Catalog", actions: [VIEW, CREATE, EDIT, DELETE] },
  { resource: "seller", label: "Seller", group: "Seller", actions: [VIEW, CREATE, EDIT, DELETE] },
  { resource: "supplier", label: "Supplier", group: "Seller", actions: [VIEW, CREATE, EDIT, DELETE] },
  { resource: "purchase-order", label: "Purchase Order", group: "Procurement", actions: [VIEW, CREATE, EDIT, DELETE] },
  { resource: "gate-entry", label: "Gate Entry", group: "Receiving", actions: [VIEW, CREATE, EDIT] },
  { resource: "grn", label: "GRN", group: "Receiving", actions: [VIEW, CREATE, EDIT] },
  { resource: "putaway", label: "Putaway", group: "Inventory", actions: [VIEW, CREATE] },
  { resource: "inventory", label: "Inventory", group: "Inventory", actions: [VIEW, CREATE, EDIT] },
  { resource: "audit-log", label: "Audit Log", group: "Logs", actions: [VIEW] },
  { resource: "configuration", label: "Configuration", group: "Settings", actions: [VIEW, EDIT] },
  { resource: "role", label: "Role", group: "Settings", actions: [VIEW, CREATE, EDIT, DELETE] },
  { resource: "user", label: "User", group: "Settings", actions: [VIEW, CREATE, EDIT, DELETE] },
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
  RESOURCES,
  isValidPermission,
  getAllPermissions,
};
