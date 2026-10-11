const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");

const EPSILON = 1e-9;

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

// The only code that changes a product's stock. Every change moves the quantity in ONE atomic update (kept at
// 3 decimals, never below zero) and writes an InventoryTransaction saying what it was before and after.
//
//   change: { organizationId, productId, quantity (> 0), source, reason?, refType?, refId?, refNumber?, performedBy? }

// Adds stock; the product's inventory row is created by the first increase.
const increaseStock = async ({ organizationId, productId, quantity, ...details }) => {
  const inventory = await Inventory.findOneAndUpdate(
    { organizationId, productId },
    [
      {
        $set: {
          quantity: { $round: [{ $add: [{ $ifNull: ["$quantity", 0] }, quantity] }, 3] },
          createdAt: { $ifNull: ["$createdAt", "$$NOW"] },
          updatedAt: "$$NOW",
        },
      },
    ],
    { upsert: true, returnDocument: "after", updatePipeline: true }
  );

  const newQty = roundTo(inventory.quantity, 3);

  return InventoryTransaction.create({
    organizationId,
    productId,
    previousQty: roundTo(newQty - quantity, 3),
    changedQty: quantity,
    newQty,
    ...details,
  });
};

// Takes stock away. Refused (returns null) when there is not enough: the check and the update are one atomic
// step, so stock can never go below zero even with two decreases at the same time.
const decreaseStock = async ({ organizationId, productId, quantity, ...details }) => {
  const inventory = await Inventory.findOneAndUpdate(
    { organizationId, productId, quantity: { $gte: roundTo(quantity - EPSILON, 9) } },
    [
      {
        $set: {
          quantity: { $max: [0, { $round: [{ $subtract: ["$quantity", quantity] }, 3] }] },
          updatedAt: "$$NOW",
        },
      },
    ],
    { returnDocument: "after", updatePipeline: true }
  );

  if (!inventory) return null;

  const newQty = roundTo(inventory.quantity, 3);

  return InventoryTransaction.create({
    organizationId,
    productId,
    previousQty: roundTo(newQty + quantity, 3),
    changedQty: -quantity,
    newQty,
    ...details,
  });
};

// Takes back an increase made by increaseStock (used only to undo a step when a later one fails): the quantity
// goes back down and the history row is removed.
const undoIncrease = async (transaction) => {
  await Inventory.updateOne(
    { organizationId: transaction.organizationId, productId: transaction.productId },
    [{ $set: { quantity: { $max: [0, { $round: [{ $subtract: ["$quantity", transaction.changedQty] }, 3] }] } } }],
    { updatePipeline: true }
  );
  await InventoryTransaction.deleteOne({ _id: transaction._id });
};

module.exports = { increaseStock, decreaseStock, undoIncrease };
