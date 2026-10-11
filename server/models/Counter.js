const mongoose = require("mongoose");

// Per-organization running numbers for documents (purchase orders, gate entries, GRNs, ...).
// One row per organization and key; `seq` is the last number handed out.
const counterSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.index({ organizationId: 1, key: 1 }, { unique: true });

const Counter = mongoose.model("Counter", counterSchema);

Counter.nextSequence = async (organizationId, key) => {
  const counter = await Counter.findOneAndUpdate(
    { organizationId, key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return counter.seq;
};

module.exports = Counter;
