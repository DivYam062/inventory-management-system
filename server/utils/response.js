// Standard success response for every API: { data, meta }
//   data  everything the endpoint returns (an object, an array, or null)
//   meta  pagination for list endpoints, otherwise null. Exactly these four keys:
//         { total_page, page, per_page, current_page }
// Errors keep their own shape ({ success: false, message }) and are produced by errorMiddleware.

const buildMeta = ({ page, limit, total }) => ({
  total_page: Math.max(Math.ceil(total / limit), 1),
  page,
  per_page: limit,
  current_page: page,
});

const sendSuccess = (res, data, { status = 200, meta = null } = {}) =>
  res.status(status).json({ data, meta });

module.exports = { sendSuccess, buildMeta };
