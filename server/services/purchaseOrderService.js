const PurchaseOrder = require("../models/PurchaseOrder");
const { PURCHASE_ORDER_STATUS } = PurchaseOrder;

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

// Derives an order's status from what has been received: issued -> partially received -> received.
// Only orders that are open for receiving change; a draft or cancelled order is left alone. Does not save.
const recalculateStatus = (order) => {
  const receiving = [PURCHASE_ORDER_STATUS.ISSUED, PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED, PURCHASE_ORDER_STATUS.RECEIVED];
  if (!receiving.includes(order.status)) return order.status;

  const anyReceived = order.items.some((item) => item.receivedQuantity > 0);
  const allReceived = order.items.every((item) => roundTo(item.receivedQuantity, 3) >= roundTo(item.quantity, 3));

  order.status = allReceived
    ? PURCHASE_ORDER_STATUS.RECEIVED
    : anyReceived
      ? PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED
      : PURCHASE_ORDER_STATUS.ISSUED;

  return order.status;
};

// Adds `quantity` to the received quantity of one product on the order (negative to take it back).
// With `maxTotal` set (the ordered quantity) the add only happens while the result stays within it - done in
// one atomic update, so two GRNs at the same time cannot both over-receive. Returns true when it was applied.
const addReceived = async (orderId, productId, quantity, { maxTotal } = {}) => {
  const filter = { _id: orderId };

  if (maxTotal !== undefined) {
    // The order item must have room: received <= maxTotal - quantity (a hair of tolerance for rounding).
    filter.items = {
      $elemMatch: { productId, receivedQuantity: { $lte: roundTo(maxTotal - quantity, 3) + 1e-9 } },
    };
  }

  const result = await PurchaseOrder.updateOne(
    filter,
    { $inc: { "items.$[line].receivedQuantity": quantity } },
    { arrayFilters: [{ "line.productId": productId }] }
  );

  return result.modifiedCount === 1;
};

module.exports = { recalculateStatus, addReceived };
