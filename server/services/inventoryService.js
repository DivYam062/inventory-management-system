const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

// Adds stock for a product and records the change. The quantity moves in one atomic update and the history row
// says what it was before and after. Returns the transaction.
//   change: { organizationId, productId, quantity (> 0), source, reason?, refType?, refId?, refNumber?, performedBy? }
const increaseStock = async ({ organizationId, productId, quantity, ...details }) => {
  const inventory = await Inventory.findOneAndUpdate(
    { organizationId, productId },
    { $inc: { quantity } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
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

// Takes back an increase made by increaseStock (used only to undo a step when a later one fails): the quantity
// goes back down and the history row is removed.
const undoIncrease = async (transaction) => {
  await Inventory.updateOne({ organizationId: transaction.organizationId, productId: transaction.productId }, { $inc: { quantity: -transaction.changedQty } });
  await InventoryTransaction.deleteOne({ _id: transaction._id });
};

module.exports = { increaseStock, undoIncrease };
