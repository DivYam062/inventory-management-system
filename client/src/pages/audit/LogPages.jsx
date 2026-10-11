import AuditLogPage from "./AuditLogPage";

// The four pages under Logs. Each is the same page showing one group of records (the group decides what the API
// returns; the record types and actions only shape the filters).

export const InventoryLogs = () => (
  <AuditLogPage
    group="inventory"
    title="Inventory Logs"
    description="Who did what to purchase orders, gate entries, GRNs, putaways and stock, and when. The log cannot be edited or deleted."
    entityTypes={["purchase_order", "gate_entry", "grn", "putaway", "inventory"]}
    actionKeys={["created", "updated", "issued", "inspected", "cancelled", "deleted", "status_changed", "stock_increased", "stock_decreased"]}
    emptyText="Entries appear here as purchase orders, gate entries, GRNs, putaways and stock changes are made."
  />
);

export const ConfigurationLogs = () => (
  <AuditLogPage
    group="configuration"
    title="Configuration Logs"
    description="Changes to the organization's settings - modules, currencies and units of measurement - and who made them."
    entityTypes={["configuration"]}
    actionKeys={["created", "updated", "deleted"]}
    emptyText="Entries appear here when a module is switched on or off or a currency or unit is added, enabled or removed."
  />
);

export const CatalogLogs = () => (
  <AuditLogPage
    group="catalog"
    title="Catalog Logs"
    description="Changes to categories, products, sellers and suppliers - what changed, from what to what, and who did it."
    entityTypes={["category", "product", "seller", "supplier"]}
    actionKeys={["created", "updated", "deleted", "assigned", "unassigned"]}
    emptyText="Entries appear here as categories, products, sellers and suppliers are added, edited or removed."
  />
);

export const UserRoleLogs = () => (
  <AuditLogPage
    group="user_role"
    title="User & Role Logs"
    description="Changes to users and roles: who was added, what a role may do, password resets and profile edits. Passwords are never recorded."
    entityTypes={["user", "role"]}
    actionKeys={["created", "updated", "deleted", "password_changed", "password_reset"]}
    emptyText="Entries appear here as users and roles are created, edited or removed."
  />
);
