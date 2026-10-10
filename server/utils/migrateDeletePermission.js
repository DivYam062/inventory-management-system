const Role = require("../models/Role");
const { RESOURCE_ACTIONS } = require("../config/permissions");

const ORDER = ["view", "create", "edit"];

// "Delete" used to be a separate permission. It is now part of Edit (whoever may edit a feature may also
// delete its records), so stored roles are converted once: a role that had delete on a feature keeps that
// ability through edit (and view, which every permission implies), and the delete entry is dropped.
//
// Runs at startup and is idempotent. It writes through the raw collection because the old value is no
// longer valid for the Role schema. Returns how many roles were converted.
const migrateDeletePermission = async () => {
  const legacyRoles = await Role.collection.find({ "permissions.actions": "delete" }).toArray();

  for (const role of legacyRoles) {
    const permissions = role.permissions
      .map((entry) => {
        const had = new Set(entry.actions);
        const hadDelete = had.has("delete");
        had.delete("delete");

        if (hadDelete && RESOURCE_ACTIONS[entry.resource]?.includes("edit")) had.add("edit");
        if (had.size > 0) had.add("view");

        return { resource: entry.resource, actions: ORDER.filter((action) => had.has(action)) };
      })
      .filter((entry) => entry.actions.length > 0);

    await Role.collection.updateOne({ _id: role._id }, { $set: { permissions } });
  }

  if (legacyRoles.length > 0) {
    console.log(`Converted the old Delete permission to Edit in ${legacyRoles.length} role(s)`);
  }

  return legacyRoles.length;
};

module.exports = migrateDeletePermission;
