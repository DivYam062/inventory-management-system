const Role = require("../models/Role");
const { ROLE_TYPE_NAMES } = require("../config/constants");

// The system roles of every organization carry their name in the database (the Default Admin role was created
// as "Default Admin"; it is now called "Network Admin"). New organizations get the current names from
// ROLE_TYPE_NAMES; this renames the roles that already exist so the whole system shows the same name, in the
// header, the roles list and everywhere a user's role is shown.
//
// Runs at startup and is idempotent. If an organization already has a custom role with the new name the system
// role keeps its old name there (names are unique per organization) and a warning is logged. Returns how many
// roles were renamed.
const migrateRoleNames = async () => {
  let renamed = 0;

  for (const [type, name] of Object.entries(ROLE_TYPE_NAMES)) {
    const roles = await Role.find({ type, name: { $ne: name } }).select("_id organizationId name");

    for (const role of roles) {
      try {
        await Role.updateOne({ _id: role._id }, { $set: { name } });
        renamed += 1;
      } catch (error) {
        if (error.code !== 11000) throw error;
        console.warn(`Role "${role.name}" of organization ${role.organizationId} was not renamed to "${name}": that name is already taken there`);
      }
    }
  }

  if (renamed > 0) console.log(`Renamed ${renamed} system role(s) to their current names`);

  return renamed;
};

module.exports = migrateRoleNames;
