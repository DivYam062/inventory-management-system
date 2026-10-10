// Loaders for dropdowns whose options come from the API (see components/ui/Select.jsx, `isAsync`).
//
// The dropdown calls the loader only when it is opened, then again for the next page as the list is
// scrolled near the bottom. Each request asks for DROPDOWN_PAGE_SIZE (40) options; a following page is
// requested only if the API says there is more (meta.current_page < meta.total_page).
//
//   const loadRoles = createOptionsLoader(getAssignableRoles, (role) => ({ value: role.id, label: role.name }));
//   <Select isAsync loadOptions={loadRoles} ... />
//
// `fetchPage` is a service function that returns { data, meta } and takes { search, page, limit, ...extra };
// the dropdown's `loadParams` are passed through as the extra params (e.g. { categoryId }).
export const DROPDOWN_PAGE_SIZE = 40;

export const createOptionsLoader =
  (fetchPage, toOption) =>
  async ({ search, page, params }) => {
    // The dropdown counts pages from 0, the API from 1.
    const { data, meta } = await fetchPage({
      ...params,
      search: search || undefined,
      page: page + 1,
      limit: DROPDOWN_PAGE_SIZE,
    });

    return {
      options: data.map(toOption),
      hasMore: Boolean(meta) && meta.current_page < meta.total_page,
    };
  };
