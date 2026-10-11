// Where each kind of required action is done. `target` comes from the tracking API.
//   purchase_order  issue the purchase order        -> Purchase Orders page
//   grn_create      receive goods of a gate entry   -> GRN page (Create GRN)
//   grn             inspect a GRN                   -> GRN page
//   putaway         put passed goods away           -> Putaway page
const PAGE_PATHS = {
  purchase_order: "/inventory/operations/purchase-orders",
  grn_create: "/inventory/operations/grns",
  grn: "/inventory/operations/grns",
  putaway: "/inventory/operations/putaway",
};

const PAGE_NAMES = {
  purchase_order: "Purchase Orders",
  grn_create: "GRN",
  grn: "GRN",
  putaway: "Putaway",
};

// The in-app path of the page for an action, inside the organization's own address (/{companyRoute}/...).
export const actionPath = (action, companyRoute) => (action.target && PAGE_PATHS[action.target] ? `/${companyRoute}${PAGE_PATHS[action.target]}` : null);

export const actionPageName = (action) => PAGE_NAMES[action.target] ?? "";
