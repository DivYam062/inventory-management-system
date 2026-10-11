const Organization = require("../models/Organization");
const User = require("../models/User");
const Role = require("../models/Role");
const Category = require("../models/Category");
const Seller = require("../models/Seller");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const Configuration = require("../models/Configuration");
const PurchaseOrder = require("../models/PurchaseOrder");
const GateEntry = require("../models/GateEntry");
const Grn = require("../models/Grn");
const Putaway = require("../models/Putaway");
const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");
const AuditLog = require("../models/AuditLog");
const Counter = require("../models/Counter");
const { ENTITY_STATUS, ROLE_TYPES } = require("../config/constants");
const { sendSuccess, buildMeta } = require("../utils/response");
const { ensureDefaultRoles } = require("../services/roleService");
const { deleteUploadedFile } = require("../middleware/uploadMiddleware");
const {
  SUPPORT_NOT_CONFIGURED_MESSAGE,
  getSupportCredentials,
  createSupportUser,
} = require("../services/supportUserService");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeOrganization = (organization, userCount) => ({
  id: organization._id,
  name: organization.name,
  companyRoute: organization.companyRoute,
  email: organization.email,
  phone: organization.phone,
  address: organization.address,
  logo: organization.logo,
  status: organization.status,
  branding: {
    useCustomColors: organization.branding.useCustomColors,
    primary: organization.branding.primary,
    primaryLight: organization.branding.primaryLight,
    primaryLighter: organization.branding.primaryLighter,
    primaryDark: organization.branding.primaryDark,
  },
  ...(userCount !== undefined && { userCount }),
  createdAt: organization.createdAt,
  updatedAt: organization.updatedAt,
});

const BRANDING_FIELDS = ["useCustomColors", "primary", "primaryLight", "primaryLighter", "primaryDark"];

// Branding arrives as an object (JSON body) or as a JSON string (multipart form with a logo).
// Returns undefined when absent and null when it is present but not valid JSON.
const pickBranding = (input) => {
  let value = input;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") return undefined;
  return Object.fromEntries(BRANDING_FIELDS.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));
};

const LOGO_PUBLIC_PATH = "/uploads/logos/";

const uploadedLogoPath = (req) => (req.file ? `${LOGO_PUBLIC_PATH}${req.file.filename}` : undefined);

const invalidBranding = (res) => res.status(400).json({ success: false, message: "Invalid branding data" });

const notFound = (res) => res.status(404).json({ success: false, message: "Organization not found" });

// The organization email becomes the Network Admin's login email, and user emails are globally
// unique, so it cannot already belong to any user (including the System Admin).
const emailTakenByUser = async (email) => {
  if (!email) return false;
  return Boolean(await User.exists({ email: String(email).trim().toLowerCase() }));
};

const MIN_ADMIN_PASSWORD_LENGTH = 8;
const MAX_ADMIN_PASSWORD_LENGTH = 72; // bcrypt ignores anything beyond 72 bytes

// Creates the organization with its two protected users:
//   - the Network Admin: login = the organization email, initial password = the one the System Admin
//     enters here (the Network Admin changes it themselves later);
//   - the Support user: name/password from .env, email derived per organization (see supportUserService).
const createOrganization = async (req, res) => {
  const { name, companyRoute, email, phone, address, branding, password } = req.body;
  const logo = uploadedLogoPath(req);

  // The logo is stored by multer before this runs, so every failure path must remove it again.
  const reject = (status, message) => {
    deleteUploadedFile(logo);
    return res.status(status).json({ success: false, message });
  };

  if (
    typeof password !== "string" ||
    password.length < MIN_ADMIN_PASSWORD_LENGTH ||
    password.length > MAX_ADMIN_PASSWORD_LENGTH
  ) {
    return reject(400, `Password must be ${MIN_ADMIN_PASSWORD_LENGTH}-${MAX_ADMIN_PASSWORD_LENGTH} characters`);
  }

  const brandingData = pickBranding(branding);
  if (brandingData === null) return reject(400, "Invalid branding data");

  if (await emailTakenByUser(email)) {
    return reject(400, "A user with this email already exists");
  }

  // The Support user's address depends on the company route, so check it before creating anything.
  const supportCredentials = getSupportCredentials(String(companyRoute ?? "").trim().toLowerCase());
  if (!supportCredentials) return reject(500, SUPPORT_NOT_CONFIGURED_MESSAGE);

  if (
    supportCredentials.email === String(email ?? "").trim().toLowerCase() ||
    (await emailTakenByUser(supportCredentials.email))
  ) {
    return reject(400, `A user with the Support email (${supportCredentials.email}) already exists`);
  }

  let organization;
  try {
    organization = await Organization.create({
      name,
      companyRoute,
      email,
      phone,
      address,
      logo: logo ?? null,
      branding: brandingData,
    });
  } catch (error) {
    deleteUploadedFile(logo);
    throw error;
  }

  try {
    const roles = await ensureDefaultRoles(organization._id);

    await User.create({
      name: `${organization.name} Admin`,
      email: organization.email,
      password,
      phone: organization.phone || undefined,
      organizationId: organization._id,
      roleId: roles[ROLE_TYPES.DEFAULT_ADMIN]._id,
      isProtected: true,
    });

    await createSupportUser(organization, roles, supportCredentials);
  } catch (error) {
    // No partial organizations: undo everything created so far (including the logo file).
    await deleteOrganizationData(organization);
    throw error;
  }

  return sendSuccess(res, serializeOrganization(organization, 2), { status: 201 });
};

const getOrganizations = async (req, res) => {
  const { search, status, page, limit } = req.query;

  const query = {};

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    query.$or = [{ name: pattern }, { companyRoute: pattern }, { email: pattern }];
  }

  if (Object.values(ENTITY_STATUS).includes(status)) {
    query.status = status;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [organizations, total] = await Promise.all([
    Organization.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Organization.countDocuments(query),
  ]);

  // One query for all user counts on this page.
  const counts = await User.aggregate([
    { $match: { organizationId: { $in: organizations.map((o) => o._id) } } },
    { $group: { _id: "$organizationId", count: { $sum: 1 } } },
  ]);
  const countByOrganization = new Map(counts.map((c) => [String(c._id), c.count]));

  return sendSuccess(
    res,
    organizations.map((o) => serializeOrganization(o, countByOrganization.get(String(o._id)) || 0)),
    { meta: buildMeta({ page: pageNum, limit: limitNum, total }) }
  );
};

const getOrganizationById = async (req, res) => {
  const organization = await Organization.findById(req.params.id);
  if (!organization) return notFound(res);

  const userCount = await User.countDocuments({ organizationId: organization._id });
  return sendSuccess(res, serializeOrganization(organization, userCount));
};

// The company route is the organization's URL and is not changed after creation, so existing
// links and bookmarks keep working.
const updateOrganization = async (req, res) => {
  const { name, email, phone, address, status, branding, removeLogo } = req.body;
  const newLogo = uploadedLogoPath(req);

  const reject = (statusCode, message) => {
    deleteUploadedFile(newLogo);
    return res.status(statusCode).json({ success: false, message });
  };

  const organization = await Organization.findById(req.params.id);
  if (!organization) {
    deleteUploadedFile(newLogo);
    return notFound(res);
  }

  if (email !== undefined && String(email).trim().toLowerCase() !== organization.email) {
    // The organization's Network Admin user (created with the organization) keeps the email in sync.
    return reject(400, "The organization email is the Network Admin login and cannot be changed here");
  }

  if (status !== undefined && !Object.values(ENTITY_STATUS).includes(status)) {
    return reject(400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  const brandingChanges = pickBranding(branding);
  if (brandingChanges === null) return reject(400, "Invalid branding data");

  if (name !== undefined) organization.name = name;
  if (phone !== undefined) organization.phone = phone;
  if (address !== undefined) organization.address = address;
  if (status !== undefined) organization.status = status;

  if (brandingChanges) {
    Object.entries(brandingChanges).forEach(([key, value]) => {
      organization.branding[key] = value;
    });
  }

  // A new upload replaces the logo; removeLogo clears it. The old file is deleted after the save.
  const previousLogo = organization.logo;
  let logoChanged = false;

  if (newLogo) {
    organization.logo = newLogo;
    logoChanged = true;
  } else if (String(removeLogo) === "true" && previousLogo) {
    organization.logo = null;
    logoChanged = true;
  }

  try {
    await organization.save();
  } catch (error) {
    deleteUploadedFile(newLogo);
    throw error;
  }

  if (logoChanged) deleteUploadedFile(previousLogo);

  const userCount = await User.countDocuments({ organizationId: organization._id });
  return sendSuccess(res, serializeOrganization(organization, userCount));
};

// Deleting an organization deletes everything it owns. Later modules (catalog, purchase orders,
// inventory, ...) must add their cleanup to `deleteOrganizationData`.
const deleteOrganizationData = async (organization) => {
  await User.deleteMany({ organizationId: organization._id });
  await Role.deleteMany({ organizationId: organization._id });
  await Category.deleteMany({ organizationId: organization._id });
  await Seller.deleteMany({ organizationId: organization._id });
  await Supplier.deleteMany({ organizationId: organization._id });
  await Configuration.deleteMany({ organizationId: organization._id });
  await AuditLog.deleteMany({ organizationId: organization._id });
  await InventoryTransaction.deleteMany({ organizationId: organization._id });
  await Inventory.deleteMany({ organizationId: organization._id });
  await Putaway.deleteMany({ organizationId: organization._id });
  await Grn.deleteMany({ organizationId: organization._id });
  await GateEntry.deleteMany({ organizationId: organization._id });
  await PurchaseOrder.deleteMany({ organizationId: organization._id });
  await Counter.deleteMany({ organizationId: organization._id });

  const products = await Product.find({ organizationId: organization._id }).select("image");
  await Product.deleteMany({ organizationId: organization._id });
  products.forEach((product) => deleteUploadedFile(product.image));

  await Organization.deleteOne({ _id: organization._id });
  deleteUploadedFile(organization.logo);
};

const deleteOrganization = async (req, res) => {
  const organization = await Organization.findById(req.params.id);
  if (!organization) return notFound(res);

  await deleteOrganizationData(organization);

  return sendSuccess(res, { id: organization._id });
};

module.exports = {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
};
