const User = require("../models/User");
const Role = require("../models/Role");
const { ROLE_TYPES, FULL_ACCESS_ROLE_TYPES, ROLE_TYPE_NAMES } = require("../config/constants");
const { PERMISSION_REGISTRY, ACTIONS, isValidPermission } = require("../config/permissions");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");
const { resolvePermissions, isSubsetOf } = require("../services/permissionService");

// Organization role management. Every query is scoped to the caller's organization.
//
// Rules enforced here (the UI only mirrors them):
//   - Network Admin and Support are protected: always every permission, never edited or deleted.
//   - Custom roles can only be given permissions the caller holds themselves, and can only be managed
//     by someone who holds all of the role's permissions (no privilege escalation).
//   - Any permission implies "view" for its feature (you cannot create what you cannot see).
//   - A role that still has users cannot be deleted.
//   - Names are unique per organization (case-insensitive) and cannot imitate the protected roles.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MAX_NAME_LENGTH = 50;
const RESERVED_NAMES = Object.values(ROLE_TYPE_NAMES).map((name) => name.toLowerCase());

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// { resource: [actions] } -> [{ resource, actions }] in registry order.
const permissionsToArray = (permissions) =>
  PERMISSION_REGISTRY.filter((entry) => permissions[entry.resource]?.length).map((entry) => ({
    resource: entry.resource,
    actions: entry.actions.filter((action) => permissions[entry.resource].includes(action)),
  }));

const serializeRole = (role, userCount, req) => {
  const resolved = resolvePermissions(role);
  const isProtected = FULL_ACCESS_ROLE_TYPES.includes(role.type);

  return {
    id: role._id,
    name: role.name,
    type: role.type,
    isProtected,
    permissions: permissionsToArray(resolved),
    userCount,
    // Hierarchy check: not protected, and the caller holds every permission of this role. The UI combines it
    // with the caller's own role:edit permission (which also covers deleting) to show or hide the actions.
    canManage: !isProtected && isSubsetOf(resolved, req.permissions),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
};

// Validates the request's permission list. Returns { permissions: { resource: [actions] } } or { error }.
const parsePermissions = (input) => {
  if (!Array.isArray(input)) return { error: "Permissions must be a list" };

  const byResource = {};

  for (const entry of input) {
    if (!entry || typeof entry.resource !== "string" || !Array.isArray(entry.actions)) {
      return { error: "Each permission needs a resource and a list of actions" };
    }

    for (const action of entry.actions) {
      if (!isValidPermission(entry.resource, action)) {
        return { error: `Invalid permission: ${entry.resource}:${String(action)}` };
      }
      (byResource[entry.resource] ??= new Set()).add(action);
    }
  }

  const permissions = {};
  for (const [resource, actions] of Object.entries(byResource)) {
    if (actions.size === 0) continue;
    actions.add(ACTIONS.VIEW); // any permission implies view
    permissions[resource] = [...actions];
  }

  return { permissions };
};

// Returns an error message for a bad role name, otherwise null.
const nameError = async (req, name, exceptId) => {
  if (typeof name !== "string" || !name.trim()) return "Role name is required";
  if (name.trim().length > MAX_NAME_LENGTH) return `Role name must be at most ${MAX_NAME_LENGTH} characters`;
  if (RESERVED_NAMES.includes(name.trim().toLowerCase())) return "This role name is reserved";

  const duplicate = await Role.exists(
    orgFilter(req, {
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      ...(exceptId && { _id: { $ne: exceptId } }),
    })
  );

  return duplicate ? "A role with this name already exists" : null;
};

const countUsersByRole = async (roleIds) => {
  const counts = await User.aggregate([
    { $match: { roleId: { $in: roleIds } } },
    { $group: { _id: "$roleId", count: { $sum: 1 } } },
  ]);
  return new Map(counts.map((c) => [String(c._id), c.count]));
};

// Loads the role a request targets (inside the organization) and checks the caller may modify it.
// Returns the role, or sends the error response and returns null.
const loadManageableRole = async (req, res) => {
  const role = await findByIdInOrg(Role, req, req.params.id);

  if (!role) {
    fail(res, 404, "Role not found");
    return null;
  }

  if (FULL_ACCESS_ROLE_TYPES.includes(role.type)) {
    fail(res, 403, "The Network Admin and Support roles cannot be modified");
    return null;
  }

  if (!isSubsetOf(resolvePermissions(role), req.permissions)) {
    fail(res, 403, "You cannot manage a role that has more permissions than you");
    return null;
  }

  return role;
};

// Every feature and its actions, for building the permission picker.
const getPermissionCatalog = (req, res) =>
  sendSuccess(
    res,
    PERMISSION_REGISTRY.map(({ resource, label, group, actions }) => ({ resource, label, group, actions }))
  );

const getRoles = async (req, res) => {
  const { search, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    query.name = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  // An organization has few roles: Network Admin, then Support, then custom roles by name.
  const order = { [ROLE_TYPES.DEFAULT_ADMIN]: 0, [ROLE_TYPES.SUPPORT]: 1, [ROLE_TYPES.CUSTOM]: 2 };
  const all = (await Role.find(query)).sort(
    (a, b) => order[a.type] - order[b.type] || a.name.localeCompare(b.name)
  );

  const pageRoles = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  const userCounts = await countUsersByRole(pageRoles.map((role) => role._id));

  return sendSuccess(
    res,
    pageRoles.map((role) => serializeRole(role, userCounts.get(String(role._id)) || 0, req)),
    { meta: buildMeta({ page: pageNum, limit: limitNum, total: all.length }) }
  );
};

const getRoleById = async (req, res) => {
  const role = await findByIdInOrg(Role, req, req.params.id);
  if (!role) return fail(res, 404, "Role not found");

  const userCounts = await countUsersByRole([role._id]);

  return sendSuccess(res, serializeRole(role, userCounts.get(String(role._id)) || 0, req));
};

const createRole = async (req, res) => {
  const { name, permissions } = req.body;

  const nameProblem = await nameError(req, name);
  if (nameProblem) return fail(res, 400, nameProblem);

  const parsed = parsePermissions(permissions ?? []);
  if (parsed.error) return fail(res, 400, parsed.error);

  if (!isSubsetOf(parsed.permissions, req.permissions)) {
    return fail(res, 403, "You cannot grant permissions that you do not have");
  }

  let role;
  try {
    // organizationId always comes from the caller, type is always CUSTOM.
    role = await Role.create({
      organizationId: req.organizationId,
      name: name.trim(),
      type: ROLE_TYPES.CUSTOM,
      permissions: permissionsToArray(parsed.permissions),
    });
  } catch (error) {
    if (error.code === 11000) return fail(res, 400, "A role with this name already exists");
    throw error;
  }

  return sendSuccess(res, serializeRole(role, 0, req), { status: 201 });
};

const updateRole = async (req, res) => {
  const { name, permissions } = req.body;

  const role = await loadManageableRole(req, res);
  if (!role) return;

  if (name !== undefined) {
    const nameProblem = await nameError(req, name, role._id);
    if (nameProblem) return fail(res, 400, nameProblem);
  }

  let parsed;
  if (permissions !== undefined) {
    parsed = parsePermissions(permissions);
    if (parsed.error) return fail(res, 400, parsed.error);

    if (!isSubsetOf(parsed.permissions, req.permissions)) {
      return fail(res, 403, "You cannot grant permissions that you do not have");
    }
  }

  if (name !== undefined) role.name = name.trim();
  if (parsed) role.permissions = permissionsToArray(parsed.permissions);

  try {
    await role.save();
  } catch (error) {
    if (error.code === 11000) return fail(res, 400, "A role with this name already exists");
    throw error;
  }

  const userCounts = await countUsersByRole([role._id]);

  return sendSuccess(res, serializeRole(role, userCounts.get(String(role._id)) || 0, req));
};

const deleteRole = async (req, res) => {
  const role = await loadManageableRole(req, res);
  if (!role) return;

  const assigned = await User.countDocuments({ roleId: role._id, organizationId: req.organizationId });

  if (assigned > 0) {
    return fail(
      res,
      400,
      `This role is assigned to ${assigned} user${assigned === 1 ? "" : "s"}. Reassign them before deleting it.`
    );
  }

  await Role.deleteOne({ _id: role._id });

  return sendSuccess(res, { id: role._id });
};

module.exports = {
  getPermissionCatalog,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
