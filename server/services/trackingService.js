// Tracking: where a delivery has got to in the flow  Purchase Order -> Gate Entry -> GRN -> Putaway,
// and what has to be done on it next. Pure functions: they take the documents that belong together (already
// loaded) and work out the stages, the required actions and the progress of every item - nothing here touches
// the database, so the rules live in one place and are easy to check.
//
// A "tracker" has a root, the document the flow is followed from:
//   purchase_order  a purchase order (its gate entries, GRNs and putaways hang off it)
//   gate_entry      a gate entry made WITHOUT a purchase order (its GRNs and putaways hang off it)
//   grn             a GRN made WITHOUT a gate entry or purchase order (its putaways hang off it)

const EPSILON = 1e-9;

const roundTo = (value, places = 3) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const TRACKER_TYPES = { PURCHASE_ORDER: "purchase_order", GATE_ENTRY: "gate_entry", GRN: "grn" };

// Where a tracker currently is. The order is the order of the flow.
const STAGES = {
  DRAFT: "draft", // the purchase order has not been issued
  AWAITING_DELIVERY: "awaiting_delivery", // issued, goods have not (all) arrived
  AT_GATE: "at_gate", // arrived at the gate, no GRN yet
  AWAITING_INSPECTION: "awaiting_inspection", // received, passed / failed not decided
  AWAITING_PUTAWAY: "awaiting_putaway", // inspected, passed goods not yet in inventory
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const STAGE_LABELS = {
  [STAGES.DRAFT]: "Draft",
  [STAGES.AWAITING_DELIVERY]: "Awaiting delivery",
  [STAGES.AT_GATE]: "At the gate",
  [STAGES.AWAITING_INSPECTION]: "Awaiting inspection",
  [STAGES.AWAITING_PUTAWAY]: "Awaiting putaway",
  [STAGES.COMPLETED]: "Completed",
  [STAGES.CANCELLED]: "Cancelled",
};

// What each step of the stepper is called.
const STEP_LABELS = { purchase_order: "Purchase Order", gate_entry: "Gate Entry", grn: "GRN", putaway: "Putaway" };

const REMAINING_STATUSES = ["inspected", "putaway_partial"];

// Passed goods of a GRN that are not yet in inventory.
const toPutawayOf = (grn) =>
  REMAINING_STATUSES.includes(grn.status)
    ? roundTo(grn.items.reduce((sum, item) => sum + Math.max(item.passedQty - item.putawayQty, 0), 0))
    : 0;

// Required actions. `permission` is what the user needs to do it; the client turns `target` into a page.
const action = (key, label, target, document, permission) => ({
  key,
  label,
  target,
  documentId: document._id,
  documentNumber: document.number,
  permission,
});

const info = (key, label) => ({ key, label, target: null, documentId: null, documentNumber: null, permission: null });

const stageDoc = (document, number, status, at) => ({ id: document._id, number, status, at });

// ---- items -----------------------------------------------------------------------------------------------

// Progress of every product: how much was ordered (purchase orders), is waiting for inspection, passed, failed,
// put away, and still has to arrive.
//   order: the purchase order (with items) or null;  grns: the (not cancelled) GRNs of the tracker
const buildItems = (order, grns) => {
  const byProduct = new Map();

  const entry = (productId, unit) => {
    const key = String(productId);
    if (!byProduct.has(key)) {
      byProduct.set(key, { productId, unit, orderedQty: null, receivedQty: 0, atInspectionQty: 0, passedQty: 0, failedQty: 0, putawayQty: 0, toPutawayQty: 0, pendingDeliveryQty: null });
    }
    return byProduct.get(key);
  };

  if (order) {
    order.items.forEach((item) => {
      const row = entry(item.productId, item.unit);
      row.orderedQty = item.quantity;
      row.pendingDeliveryQty = Math.max(roundTo(item.quantity - item.receivedQuantity), 0);
    });
  }

  grns.forEach((grn) => {
    grn.items.forEach((item) => {
      const row = entry(item.productId, item.unit);
      row.receivedQty += item.receivedQty;

      if (grn.status === "pending_inspection") {
        row.atInspectionQty += item.receivedQty;
      } else {
        row.passedQty += item.passedQty;
        row.failedQty += item.failedQty;
        row.putawayQty += item.putawayQty;
        if (REMAINING_STATUSES.includes(grn.status)) row.toPutawayQty += Math.max(item.passedQty - item.putawayQty, 0);
      }
    });
  });

  return [...byProduct.values()].map((row) => {
    const cleaned = {
      ...row,
      receivedQty: roundTo(row.receivedQty),
      atInspectionQty: roundTo(row.atInspectionQty),
      passedQty: roundTo(row.passedQty),
      failedQty: roundTo(row.failedQty),
      putawayQty: roundTo(row.putawayQty),
      toPutawayQty: roundTo(row.toPutawayQty),
    };

    let status;
    if (cleaned.atInspectionQty > EPSILON) status = "awaiting_inspection";
    else if (cleaned.toPutawayQty > EPSILON) status = "awaiting_putaway";
    else if (cleaned.orderedQty !== null && cleaned.putawayQty >= cleaned.orderedQty - EPSILON) status = "in_inventory";
    else if (cleaned.pendingDeliveryQty !== null && cleaned.pendingDeliveryQty > EPSILON) {
      status = cleaned.receivedQty > 0 ? "partially_arrived" : "not_arrived";
    } else if (cleaned.receivedQty > 0) status = "in_inventory";
    else status = "not_arrived";

    return { ...cleaned, status };
  });
};

// ---- the tracker -----------------------------------------------------------------------------------------

// type: one of TRACKER_TYPES;  root: the root document (lean);  gateEntries: the gate entries of the flow (for a
// gate_entry tracker that is the root itself);  grns: every GRN of the flow;  putaways: their putaways;
// modules: { purchaseOrder, gateEntry, grn } switches.
const buildTracker = ({ type, root, gateEntries = [], grns = [], putaways = [], modules }) => {
  const activeGrns = grns.filter((grn) => grn.status !== "cancelled");
  const isOrder = type === TRACKER_TYPES.PURCHASE_ORDER;
  const hasGateEntryStage = type !== TRACKER_TYPES.GRN;
  const actions = [];
  const stages = [];

  // --- Purchase order
  if (isOrder) {
    const state = root.status === "draft" ? "current" : root.status === "cancelled" ? "cancelled" : "done";
    if (root.status === "draft") actions.push(action("issue_purchase_order", `Issue purchase order ${root.poNumber}`, "purchase_order", { _id: root._id, number: root.poNumber }, ["purchase-order", "edit"]));

    stages.push({ key: "purchase_order", label: STEP_LABELS.purchase_order, state, documents: [stageDoc(root, root.poNumber, root.status, root.orderDate ?? root.createdAt)] });
  }

  // --- Gate entry
  if (hasGateEntryStage) {
    const entries = type === TRACKER_TYPES.GATE_ENTRY ? [root] : gateEntries;
    const pending = entries.filter((entry) => entry.status === "pending");

    let state;
    if (!modules.gateEntry) state = "skipped";
    else if (pending.length > 0) state = "current";
    else if (entries.some((entry) => entry.status === "completed")) state = "done";
    else if (entries.length > 0) state = "cancelled";
    else state = isOrder && root.status === "cancelled" ? "cancelled" : "pending";

    if (modules.gateEntry && modules.grn) {
      pending.forEach((entry) =>
        actions.push(action("create_grn", `Receive the goods of gate entry ${entry.gateEntryNumber} (create a GRN)`, "grn_create", { _id: entry._id, number: entry.gateEntryNumber }, ["grn", "create"]))
      );
    } else if (modules.gateEntry && pending.length > 0) {
      // Goods are at the gate but the GRN module is off, so nothing can be received yet.
      actions.push(info("grn_module_off", "Goods are waiting at the gate, but the GRN module is turned off"));
    }

    stages.push({
      key: "gate_entry",
      label: STEP_LABELS.gate_entry,
      state,
      documents: entries.map((entry) => stageDoc(entry, entry.gateEntryNumber, entry.status, entry.arrivalAt)),
    });
  }

  // --- GRN
  {
    const pendingInspection = activeGrns.filter((grn) => grn.status === "pending_inspection");

    let state;
    if (!modules.grn) state = "skipped";
    else if (pendingInspection.length > 0) state = "current";
    else if (activeGrns.length > 0) state = "done";
    else state = grns.length > 0 ? "cancelled" : "pending";

    if (modules.grn) {
      pendingInspection.forEach((grn) =>
        actions.push(action("inspect_grn", `Inspect ${grn.grnNumber} (record what passed and failed)`, "grn", { _id: grn._id, number: grn.grnNumber }, ["grn", "edit"]))
      );
    }

    stages.push({
      key: "grn",
      label: STEP_LABELS.grn,
      state,
      documents: grns.map((grn) => stageDoc(grn, grn.grnNumber, grn.status, grn.receivedAt)),
    });
  }

  // --- Putaway
  {
    const waiting = activeGrns.filter((grn) => toPutawayOf(grn) > EPSILON);
    const anyInspected = activeGrns.some((grn) => grn.status !== "pending_inspection");

    let state;
    if (!modules.grn) state = "skipped";
    else if (waiting.length > 0) state = "current";
    else if (anyInspected) state = "done";
    else state = "pending";

    if (modules.grn) {
      waiting.forEach((grn) =>
        actions.push(action("putaway", `Put away the passed goods of ${grn.grnNumber} (${toPutawayOf(grn)} left)`, "putaway", { _id: grn._id, number: grn.grnNumber }, ["putaway", "create"]))
      );
    }

    stages.push({
      key: "putaway",
      label: STEP_LABELS.putaway,
      state,
      documents: putaways.map((putaway) => stageDoc(putaway, putaway.putawayNumber, "done", putaway.putawayAt)),
    });
  }

  // --- where is it now?
  const rootCancelled =
    (isOrder && root.status === "cancelled") ||
    (type === TRACKER_TYPES.GATE_ENTRY && root.status === "cancelled" && grns.length === 0) ||
    (type === TRACKER_TYPES.GRN && root.status === "cancelled");

  let stage;
  if (rootCancelled) stage = STAGES.CANCELLED;
  else if (isOrder && root.status === "draft") stage = STAGES.DRAFT;
  else if (stages.find((s) => s.key === "gate_entry")?.state === "current") stage = STAGES.AT_GATE;
  else if (stages.find((s) => s.key === "grn")?.state === "current" && activeGrns.some((grn) => grn.status === "pending_inspection")) stage = STAGES.AWAITING_INSPECTION;
  else if (stages.find((s) => s.key === "putaway")?.state === "current") stage = STAGES.AWAITING_PUTAWAY;
  else if (isOrder && root.status !== "received") {
    stage = STAGES.AWAITING_DELIVERY;
    const how = modules.gateEntry ? "record a gate entry" : modules.grn ? "create a GRN" : "";
    actions.push(info("await_delivery", how ? `Waiting for the goods: ${how} when they arrive` : "Waiting for the goods to arrive"));
  } else if (type === TRACKER_TYPES.GATE_ENTRY && grns.length === 0) {
    stage = STAGES.AT_GATE; // a gate entry is never completed without a GRN
  } else {
    stage = STAGES.COMPLETED;
  }

  const items = buildItems(isOrder ? root : null, activeGrns);

  const times = [root, ...gateEntries, ...grns, ...putaways].map((document) => new Date(document.updatedAt ?? document.createdAt).getTime());

  return {
    stage,
    stageLabel: STAGE_LABELS[stage],
    isComplete: stage === STAGES.COMPLETED || stage === STAGES.CANCELLED,
    needsAction: actions.some((entry) => entry.target !== null),
    actions,
    stages,
    items,
    lastActivityAt: new Date(Math.max(...times)),
  };
};

module.exports = { buildTracker, TRACKER_TYPES, STAGES, STAGE_LABELS };
