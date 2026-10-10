const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Builds a multer instance that stores images under uploads/<folder>.
//   createImageUpload("logos", { maxSizeMB: 2 }).single("logo")
// SVG is deliberately not allowed: it can carry scripts and these files are served from the API origin.
const createImageUpload = (folder, { maxSizeMB = 5 } = {}) => {
  const uploadDir = path.join(__dirname, "..", "uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error("Only JPEG, PNG, WEBP or GIF images are allowed");
      error.statusCode = 400;
      cb(error);
    }
  };

  return multer({ storage, fileFilter, limits: { fileSize: maxSizeMB * 1024 * 1024 } });
};

// Best-effort removal of a stored upload by its public path (e.g. "/uploads/logos/123.png").
// Never throws and never blocks the response.
const deleteUploadedFile = (publicPath) => {
  if (!publicPath) return;

  const absolutePath = path.join(__dirname, "..", publicPath.replace(/^\//, ""));
  const uploadsRoot = path.join(__dirname, "..", "uploads");

  // Only ever delete inside uploads/.
  if (!absolutePath.startsWith(uploadsRoot + path.sep)) return;

  fs.unlink(absolutePath, () => {});
};

// Product images (existing behavior, used when product routes are rebuilt).
const upload = createImageUpload("products");

module.exports = upload;
module.exports.createImageUpload = createImageUpload;
module.exports.deleteUploadedFile = deleteUploadedFile;
