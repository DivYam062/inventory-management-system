// Organization isolation helpers. Every query for an organization-owned model must go
// through these so the organization always comes from the authenticated user (req.organizationId),
// never from the request body, query string or URL.

const orgFilter = (req, filter = {}) => ({ ...filter, organizationId: req.organizationId });

// Looks up one document by id inside the caller's organization. A document that belongs to
// another organization is indistinguishable from a missing one (returns null -> 404).
const findByIdInOrg = (Model, req, id) => Model.findOne(orgFilter(req, { _id: id }));

module.exports = { orgFilter, findByIdInOrg };
