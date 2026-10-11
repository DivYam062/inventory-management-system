const mongoose = require("mongoose");

const User = require("../models/User");
const Role = require("../models/Role");
const { ROLE_TYPES, ENTITY_STATUS } = require("../config/constants");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");
const { logAudit, diffFields, describeChanges, AUDIT_ENTITY_TYPES, AUDIT_ACTIONS } = require("../services/auditService");
const { resolvePermissions, isSubsetOf } = require("../services/permissionService");

// Organization user management. Every query is scoped to the caller's organization
// (req.organizationId); the organization is never read from the request body.
//
// Rules enforced here (the UI only mirrors them):
//   - Network Admin and Support users (isProtected) cannot be edited, deactivated or deleted.
//   - Only CUSTOM roles can be assigned (the Network Admin / Support roles belong to the system users).
//   - Nobody can assign a role, or manage a user whose role, has more permissions than their own.
//   - You cannot change your own role or status, or delete yourself.
//   - Email is globally unique and can never be changed after the user is created.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores anything beyond 72 bytes

const isValidPassword = (password) =>
  typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const sameId = (a, b) => String(a) === String(b);

// `role` is the populated Role document (or null when it no longer exists).
const serializeUser = (user, role, req) => {
  const isSelf = sameId(user._id, req.user._id);

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    isProtected: user.isProtected,
    role: role ? { id: role._id, name: role.name, type: role.type } : null,
    isSelf,
    // Hierarchy check: not protected, and the caller holds every permission of this user's role. The UI
    // combines it with the caller's own user:edit permission to show or hide the actions.
    canManage: !user.isProtected && isSubsetOf(resolvePermissions(role), req.permissions),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const loadOrganizationRole = (req, roleId) => {
  if (!mongoose.isValidObjectId(roleId)) return null;
  return Role.findOne(orgFilter(req, { _id: roleId }));
};

const roleAssignmentError = (req, role) => {
  if (!role) return "Role not found";

  if (role.type !== ROLE_TYPES.CUSTOM) {
    return "The Network Admin and Support roles cannot be assigned to users";
  }

  if (!isSubsetOf(resolvePermissions(role), req.permissions)) {
    return "You cannot assign a role with more permissions than your own";
  }

  return null;
};

// Loads the user a request targets (inside the organization) together with their role, and checks that
// the caller may modify them. Returns { user, role } or sends the error response and returns null.
// How a user is named in the audit log.
const userLabel = (user) => `${user.name} (${user.email})`;

const loadManageableUser = async (req, res) => {
  const user = await findByIdInOrg(User, req, req.params.id);

  if (!user) {
    fail(res, 404, "User not found");
    return null;
  }

  if (user.isProtected) {
    fail(res, 403, "The Network Admin and Support users cannot be modified");
    return null;
  }

  const role = await Role.findOne(orgFilter(req, { _id: user.roleId }));

  if (!isSubsetOf(resolvePermissions(role), req.permissions)) {
    fail(res, 403, "You cannot manage a user who has more permissions than you");
    return null;
  }

  return { user, role };
};

// Roles the caller may give to a user. Feeds role dropdowns, so it is searchable and paginated
// (default 40 per page): the dropdown loads the next page as the list is scrolled.
const DROPDOWN_PAGE_SIZE = 40;

const getAssignableRoles = async (req, res) => {
  const { search, page, limit } = req.query;

  const query = orgFilter(req, { type: ROLE_TYPES.CUSTOM });

  if (typeof search === "string" && search.trim()) {
    query.name = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || DROPDOWN_PAGE_SIZE, 1), 100);

  // An organization has few roles, and "assignable" depends on the caller's permissions, so it is
  // filtered here before paginating.
  const roles = await Role.find(query).collation({ locale: "en", strength: 2 }).sort({ name: 1 });
  const assignable = roles.filter((role) => isSubsetOf(resolvePermissions(role), req.permissions));

  return sendSuccess(
    res,
    assignable
      .slice((pageNum - 1) * limitNum, pageNum * limitNum)
      .map((role) => ({ id: role._id, name: role.name, type: role.type })),
    { meta: buildMeta({ page: pageNum, limit: limitNum, total: assignable.length }) }
  );
};

const getUsers = async (req, res) => {
  const { search, status, roleId, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  if (Object.values(ENTITY_STATUS).includes(status)) {
    query.status = status;
  }

  if (typeof roleId === "string" && mongoose.isValidObjectId(roleId)) {
    query.roleId = roleId;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [users, total] = await Promise.all([
    User.find(query)
      .populate("roleId")
      .sort({ isProtected: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(query),
  ]);

  return sendSuccess(
    res,
    users.map((user) => serializeUser(user, user.roleId, req)),
    { meta: buildMeta({ page: pageNum, limit: limitNum, total }) }
  );
};

const getUserById = async (req, res) => {
  const user = await findByIdInOrg(User, req, req.params.id).populate("roleId");

  if (!user) return fail(res, 404, "User not found");

  return sendSuccess(res, serializeUser(user, user.roleId, req));
};

const createUser = async (req, res) => {
  const { name, email, phone, password, roleId, status } = req.body;

  if (!isValidPassword(password)) {
    return fail(res, 400, `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`);
  }

  if (status !== undefined && !Object.values(ENTITY_STATUS).includes(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  const role = await loadOrganizationRole(req, roleId);
  const roleError = roleAssignmentError(req, role);
  if (roleError) return fail(res, 400, roleError);

  // organizationId always comes from the caller, isProtected is never client-controlled.
  const user = await User.create({
    name,
    email,
    phone: phone || undefined,
    password,
    roleId: role._id,
    organizationId: req.organizationId,
    status,
  });

  await logAudit(req, {
    entityType: AUDIT_ENTITY_TYPES.USER,
    entity: { id: user._id, number: userLabel(user) },
    action: AUDIT_ACTIONS.CREATED,
    newStatus: user.status,
    summary: `Created user "${user.name}" (${user.email}) with the role "${role.name}"`,
    meta: { role: role.name },
  });

  return sendSuccess(res, serializeUser(user, role, req), { status: 201 });
};

const updateUser = async (req, res) => {
  const { name, email, phone, roleId, status, password } = req.body;

  const loaded = await loadManageableUser(req, res);
  if (!loaded) return;

  const { user } = loaded;

  // Email is the login and can never be changed (sending the current one back is fine).
  if (email !== undefined && String(email).trim().toLowerCase() !== user.email) {
    return fail(res, 400, "Email cannot be changed");
  }
  let { role } = loaded;
  const isSelf = sameId(user._id, req.user._id);

  if (status !== undefined && !Object.values(ENTITY_STATUS).includes(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  if (password !== undefined && !isValidPassword(password)) {
    return fail(res, 400, `Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`);
  }

  const changesRole = roleId !== undefined && !sameId(roleId, user.roleId);
  const changesStatus = status !== undefined && status !== user.status;

  if (isSelf && (changesRole || changesStatus)) {
    return fail(res, 403, "You cannot change your own role or status");
  }

  if (changesRole) {
    const newRole = await loadOrganizationRole(req, roleId);
    const roleError = roleAssignmentError(req, newRole);
    if (roleError) return fail(res, 400, roleError);

    user.roleId = newRole._id;
    role = newRole;
  }

  const before = { name: user.name, phone: user.phone, role: loaded.role?.name, status: user.status };

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone || undefined;
  if (changesStatus) user.status = status;
  if (password !== undefined) user.password = password;

  await user.save();

  const changes = diffFields(before, { name: user.name, phone: user.phone, role: role?.name, status: user.status }, {
    name: "Name",
    phone: "Phone",
    role: "Role",
    status: "Status",
  });
  if (changes.length > 0) {
    await logAudit(req, {
      entityType: AUDIT_ENTITY_TYPES.USER,
      entity: { id: user._id, number: userLabel(user) },
      action: AUDIT_ACTIONS.UPDATED,
      previousStatus: before.status,
      newStatus: user.status,
      summary: `Edited user "${user.name}" (${describeChanges(changes)})`,
      meta: { changes },
    });
  }

  // The password itself is never recorded - only that it was set.
  if (password !== undefined) {
    await logAudit(req, {
      entityType: AUDIT_ENTITY_TYPES.USER,
      entity: { id: user._id, number: userLabel(user) },
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      summary: `Set a new password for "${user.name}"`,
    });
  }

  return sendSuccess(res, serializeUser(user, role, req));
};

const deleteUser = async (req, res) => {
  const loaded = await loadManageableUser(req, res);
  if (!loaded) return;

  const { user } = loaded;

  if (sameId(user._id, req.user._id)) {
    return fail(res, 403, "You cannot delete your own account");
  }

  await User.deleteOne({ _id: user._id });

  await logAudit(req, {
    entityType: AUDIT_ENTITY_TYPES.USER,
    entity: { id: user._id, number: userLabel(user) },
    action: AUDIT_ACTIONS.DELETED,
    previousStatus: user.status,
    summary: `Deleted user "${user.name}" (${user.email})`,
  });

  return sendSuccess(res, { id: user._id });
};

module.exports = {
  getAssignableRoles,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
