// Where a signed-in user lands: the system dashboard for Super Admin, otherwise their
// organization's dashboard at /{companyRoute}/dashboard. `auth` is the auth slice state or a
// login response.
export const getHomePath = (auth) =>
  auth?.isSuperAdmin
    ? "/super-admin/dashboard"
    : `/${auth?.organization?.companyRoute}/dashboard`;
