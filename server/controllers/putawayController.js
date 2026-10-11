const mongoose = require("mongoose");

const Putaway = require("../models/Putaway");
const Grn = require("../models/Grn");
const Counter = require("../models/Counter");
const { GRN_STATUS } = Grn;
const { INVENTORY_SOURCE } = require("../models/InventoryTransaction");
const { increaseStock, undoIncrease } = require("../services/inventoryService");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");

// Putaways of the caller's organization. Every query is scoped by req.organizationId (taken from the token,
// never from the request). Permissions: putaway:view to read, putaway:create to put goods away. There is no
// edit or delete: a putaway is a permanent record of stock that entered inventory (a wrong quantity is
// corrected with a manual adjustment on the Inventory page). The API is closed while the GRN module is off,
// because putaway works on GRNs.
//
// A putaway takes the PASSED quantity of an inspected GRN and adds it to inventory:
//   - the GRN's putaway quantity per item goes up (at most the passed quantity, claimed atomically so two
//     people cannot put away the same goods twice);
//   - the product's stock goes up, with an InventoryTransaction (source: putaway) recording before / after;
//   - the GRN becomes putaway partial, or putaway complete once all passed goods are away.
// Failed goods never enter inventory.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const MAX_ITEMS = 100;
const MAX_QUANTITY = 1_000_000_000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const EPSILON = 1e-9;
const PUTAWAY_STATUSES = [GRN_STATUS.INSPECTED, GRN_STATUS.PUTAWAY_PARTIAL];

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const remainingOf = (item) => Math.max(roundTo(item.passedQty - item.putawayQty, 3), 0);

const summarize = (ref) => (ref && ref._id ? { id: ref._id, name: ref.name, status: ref.status } : null);

const serializePutaway = (putaway, { detailed = false } = {}) => {
  const grn = putaway.grnId && putaway.grnId._id ? putaway.grnId : null;
  const user = putaway.performedBy && putaway.performedBy._id ? putaway.performedBy : null;

  const base = {
    id: putaway._id,
    putawayNumber: putaway.putawayNumber,
    grn: grn ? { id: grn._id, grnNumber: grn.grnNumber, status: grn.status } : null,
    seller: summarize(putaway.sellerId),
    supplier: summarize(putaway.supplierId),
    putawayAt: putaway.putawayAt,
    itemCount: putaway.items.length,
    totalQty: roundTo(putaway.items.reduce((sum, item) => sum + item.quantity, 0), 3),
    performedBy: user ? { id: user._id, name: user.name } : null,
    createdAt: putaway.createdAt,
  };

  if (!detailed) return base;

  return {
    ...base,
    notes: putaway.notes,
    items: putaway.items.map((item) => {
      const product = item.productId && item.productId._id ? item.productId : null;
      return {
        id: item._id,
        product: product ? { id: product._id, name: product.name, sku: product.sku, barcode: product.barcode, image: product.image } : null,
        unit: item.unit,
        quantity: item.quantity,
      };
    }),
  };
};

const populatePutaway = (query, { detailed = false } = {}) => {
  query
    .populate("grnId", "grnNumber status")
    .populate("sellerId", "name status")
    .populate("supplierId", "name status")
    .populate("performedBy", "name");
  if (detailed) query.populate("items.productId", "name sku barcode image");
  return query;
};

const loadPutaway = (req, id, options) => populatePutaway(findByIdInOrg(Putaway, req, id), options);

// ---- GRNs waiting for putaway (for the form) ------------------------------------------------------------

// An inspected GRN with passed goods not yet put away.
const eligibleGrnFilter = (req) =>
  orgFilter(req, {
    status: { $in: PUTAWAY_STATUSES },
    $expr: {
      $gt: [
        { $sum: { $map: { input: "$items", as: "line", in: { $subtract: ["$$line.passedQty", "$$line.putawayQty"] } } } },
        0.0005,
      ],
    },
  });

const getPendingGrns = async (req, res) => {
  const { search, page, limit } = req.query;

  const query = eligibleGrnFilter(req);
  if (typeof search === "string" && search.trim()) {
    query.grnNumber = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [grns, total] = await Promise.all([
    Grn.find(query)
      .populate("sellerId", "name status")
      .populate("supplierId", "name status")
      .sort({ receivedAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Grn.countDocuments(query),
  ]);

  return sendSuccess(
    res,
    grns.map((grn) => ({
      id: grn._id,
      grnNumber: grn.grnNumber,
      seller: summarize(grn.sellerId),
      supplier: summarize(grn.supplierId),
      receivedAt: grn.receivedAt,
      status: grn.status,
      remainingQty: roundTo(grn.items.reduce((sum, item) => sum + remainingOf(item), 0), 3),
    })),
    { meta: buildMeta({ page: pageNum, limit: limitNum, total }) }
  );
};

// One GRN's items with how much of each passed quantity is still to be put away.
const getPendingGrnItems = async (req, res) => {
  const grn = await populateGrnItems(findByIdInOrg(Grn, req, req.params.grnId));
  if (!grn) return fail(res, 404, "GRN not found");

  const problem = notReady(grn);
  if (problem) return fail(res, 400, problem);

  return sendSuccess(res, {
    id: grn._id,
    grnNumber: grn.grnNumber,
    seller: summarize(grn.sellerId),
    supplier: summarize(grn.supplierId),
    status: grn.status,
    items: grn.items.map((item) => ({
      productId: item.productId._id,
      product: { id: item.productId._id, name: item.productId.name, sku: item.productId.sku, barcode: item.productId.barcode },
      unit: item.unit,
      passedQty: item.passedQty,
      putawayQty: item.putawayQty,
      remainingQty: remainingOf(item),
    })),
  });
};

const populateGrnItems = (query) =>
  query.populate("sellerId", "name status").populate("supplierId", "name status").populate("items.productId", "name sku barcode");

// Why a GRN cannot be put away yet, or null.
const notReady = (grn) => {
  if (grn.status === GRN_STATUS.PENDING_INSPECTION) return `${grn.grnNumber} has not been inspected yet`;
  if (grn.status === GRN_STATUS.CANCELLED) return `${grn.grnNumber} was cancelled`;
  if (grn.status === GRN_STATUS.PUTAWAY_COMPLETE) return `${grn.grnNumber} has already been put away completely`;
  if (!PUTAWAY_STATUSES.includes(grn.status)) return `${grn.grnNumber} cannot be put away`;
  if (grn.items.every((item) => remainingOf(item) <= EPSILON)) return `${grn.grnNumber} has no passed goods left to put away`;
  return null;
};

// ---- create ----------------------------------------------------------------------------------------------

// Claims `quantity` of an item's passed goods on the GRN. Only succeeds while the item's putaway quantity stays
// within what passed - one atomic update, so concurrent putaways cannot both take the same goods.
const claimPutaway = async (grnId, productId, quantity, passedQty) => {
  const result = await Grn.updateOne(
    {
      _id: grnId,
      items: { $elemMatch: { productId, putawayQty: { $lte: roundTo(passedQty - quantity, 3) + EPSILON } } },
    },
    { $inc: { "items.$[line].putawayQty": quantity } },
    { arrayFilters: [{ "line.productId": productId }] }
  );
  return result.modifiedCount === 1;
};

const releasePutaway = (grnId, productId, quantity) =>
  Grn.updateOne({ _id: grnId }, { $inc: { "items.$[line].putawayQty": -quantity } }, { arrayFilters: [{ "line.productId": productId }] });

const createPutaway = async (req, res) => {
  const { grnId, putawayAt, notes } = req.body;

  if (!mongoose.isValidObjectId(grnId)) return fail(res, 400, "Select a GRN");

  const grn = await findByIdInOrg(Grn, req, grnId);
  if (!grn) return fail(res, 400, "GRN not found");

  const problem = notReady(grn);
  if (problem) return fail(res, 400, problem);

  let putawayDate = new Date();
  if (putawayAt !== undefined && putawayAt !== null && putawayAt !== "") {
    putawayDate = new Date(putawayAt);
    if (Number.isNaN(putawayDate.getTime())) return fail(res, 400, "Put away time must be a valid date and time");
    if (putawayDate.getTime() > Date.now() + CLOCK_SKEW_MS) return fail(res, 400, "Put away time cannot be in the future");
  }

  if (notes !== undefined && notes !== null && (typeof notes !== "string" || notes.trim().length > 500)) {
    return fail(res, 400, "Notes must be at most 500 characters");
  }

  const rawItems = req.body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) return fail(res, 400, "Enter the quantity to put away for at least one item");
  if (rawItems.length > MAX_ITEMS) return fail(res, 400, `A putaway can have at most ${MAX_ITEMS} items`);

  const items = [];
  const seen = new Set();

  for (const [index, raw] of rawItems.entries()) {
    const row = `Item ${index + 1}`;
    if (!raw || !mongoose.isValidObjectId(raw.productId)) return fail(res, 400, `${row}: select a product`);

    const productId = String(raw.productId);
    if (seen.has(productId)) return fail(res, 400, `${row}: this product is already on the putaway`);
    seen.add(productId);

    const line = grn.items.find((candidate) => String(candidate.productId) === productId);
    if (!line) return fail(res, 400, `${row}: this product is not on ${grn.grnNumber}`);

    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
      return fail(res, 400, `${row}: quantity must be greater than 0`);
    }

    const rounded = roundTo(quantity, 3);
    const remaining = remainingOf(line);
    if (rounded > remaining + EPSILON) {
      return fail(
        res,
        400,
        `${row}: only ${remaining} ${line.unit} of the passed goods is left to put away (passed ${line.passedQty}, already put away ${line.putawayQty})`
      );
    }

    items.push({ productId: line.productId, unit: line.unit, quantity: rounded, passedQty: line.passedQty });
  }

  // Everything is checked. Claim the goods on the GRN, then add the stock; if a step fails, what was done so far
  // is undone (no multi-document transaction is available on every deployment).
  const undo = [];
  const rollback = async () => {
    for (const step of undo.reverse()) await step();
  };

  try {
    for (const item of items) {
      const claimed = await claimPutaway(grn._id, item.productId, item.quantity, item.passedQty);
      if (!claimed) {
        await rollback();
        return fail(res, 400, "This GRN was just updated by someone else. Reload it and try again");
      }
      undo.push(() => releasePutaway(grn._id, item.productId, item.quantity));
    }

    const putawayId = new mongoose.Types.ObjectId();
    const sequence = await Counter.nextSequence(req.organizationId, "putaway");
    const putawayNumber = `PUT-${String(sequence).padStart(5, "0")}`;

    for (const item of items) {
      const transaction = await increaseStock({
        organizationId: req.organizationId,
        productId: item.productId,
        quantity: item.quantity,
        source: INVENTORY_SOURCE.PUTAWAY,
        refType: "putaway",
        refId: putawayId,
        refNumber: putawayNumber,
        performedBy: req.user._id,
      });
      undo.push(() => undoIncrease(transaction));
    }

    await Putaway.create({
      _id: putawayId,
      organizationId: req.organizationId, // always from the caller
      putawayNumber,
      grnId: grn._id,
      sellerId: grn.sellerId,
      supplierId: grn.supplierId,
      putawayAt: putawayDate,
      items: items.map(({ productId, unit, quantity }) => ({ productId, unit, quantity })),
      notes: notes ? notes.trim() : undefined,
      performedBy: req.user._id,
    });

    // The GRN is complete once all passed goods are away, otherwise partial.
    const fresh = await Grn.findById(grn._id);
    fresh.status = fresh.items.every((item) => remainingOf(item) <= EPSILON) ? GRN_STATUS.PUTAWAY_COMPLETE : GRN_STATUS.PUTAWAY_PARTIAL;
    await fresh.save();

    const saved = await loadPutaway(req, putawayId, { detailed: true });
    return sendSuccess(res, serializePutaway(saved, { detailed: true }), { status: 201 });
  } catch (error) {
    await rollback();
    throw error;
  }
};

// ---- read ------------------------------------------------------------------------------------------------

const getPutaways = async (req, res) => {
  const { search, grnId, sellerId, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    query.putawayNumber = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  if (typeof grnId === "string" && mongoose.isValidObjectId(grnId)) query.grnId = grnId;
  if (typeof sellerId === "string" && mongoose.isValidObjectId(sellerId)) query.sellerId = sellerId;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [putaways, total] = await Promise.all([
    populatePutaway(Putaway.find(query))
      .sort({ putawayAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Putaway.countDocuments(query),
  ]);

  return sendSuccess(res, putaways.map((putaway) => serializePutaway(putaway)), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getPutawayById = async (req, res) => {
  const putaway = await loadPutaway(req, req.params.id, { detailed: true });
  if (!putaway) return fail(res, 404, "Putaway not found");

  return sendSuccess(res, serializePutaway(putaway, { detailed: true }));
};

module.exports = { getPendingGrns, getPendingGrnItems, createPutaway, getPutaways, getPutawayById };
