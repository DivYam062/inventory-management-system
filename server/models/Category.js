const mongoose = require("mongoose");
const { ENTITY_STATUS } = require("../config/constants");

const categorySchema = new mongoose.Schema(
  {
    // Every category belongs to exactly one organization and is invisible to all others.
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name must be at most 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

// Names are unique per organization, ignoring case ("Dairy" and "dairy" are the same category).
categorySchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
