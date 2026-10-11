import { Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import Unauthorized from "../pages/errors/Unauthorized";
import SuperAdminDashboard from "../pages/super-admin/Dashboard";
import Organizations from "../pages/super-admin/Organizations";
import OrganizationDashboard from "../pages/dashboard/OrganizationDashboard";
import Roles from "../pages/settings/Roles";
import Users from "../pages/settings/Users";
import Profile from "../pages/profile/Profile";
import Categories from "../pages/categories/Categories";
import Products from "../pages/products/Products";
import Configuration from "../pages/settings/Configuration";
import PurchaseOrders from "../pages/purchase-orders/PurchaseOrders";
import GateEntries from "../pages/gate-entries/GateEntries";
import Grns from "../pages/grns/Grns";
import Putaway from "../pages/putaway/Putaway";
import Sellers from "../pages/sellers/Sellers";
import Suppliers from "../pages/suppliers/Suppliers";
import ModulePlaceholder from "../pages/shared/ModulePlaceholder";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import HomeRedirect from "./HomeRedirect";
import CompanyRoute from "./CompanyRoute";
import CompanyRedirect from "./CompanyRedirect";
import MainLayout from "../components/layout/MainLayout";
import {
  ORGANIZATION_NAVIGATION,
  collectNavigationGroups,
  flattenNavigation,
} from "../config/navigation";

// Pages that exist. Every other organization page in the navigation gets a "not available yet"
// placeholder until its module is built: register the real component here (keyed by its path).
const ORGANIZATION_PAGES = {
  "/dashboard": OrganizationDashboard,
  "/catalog/categories": Categories,
  "/catalog/products": Products,
  "/inventory/operations/purchase-orders": PurchaseOrders,
  "/inventory/operations/gate-entries": GateEntries,
  "/inventory/operations/grns": Grns,
  "/inventory/operations/putaway": Putaway,
  "/seller/sellers": Sellers,
  "/seller/suppliers": Suppliers,
  "/settings/configuration": Configuration,
  "/settings/roles": Roles,
  "/settings/users": Users,
};

const organizationPages = flattenNavigation(ORGANIZATION_NAVIGATION);
const organizationGroups = collectNavigationGroups(ORGANIZATION_NAVIGATION);

// Two separate areas: the system (Super Admin) and the organization (permission-based).
// Organization routes live under /{companyRoute}/... and are generated from config/navigation.js,
// each guarded by its permission, so the menu, the routes and the permissions cannot drift apart.
const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute scope="system" />}>
        <Route element={<MainLayout />}>
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/organizations" element={<Organizations />} />
          <Route path="/super-admin/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute scope="organization" />}>
        <Route path="/:companyRoute" element={<CompanyRoute />}>
          <Route index element={<CompanyRedirect to="/dashboard" />} />

          <Route element={<MainLayout />}>
            {/* Every signed-in organization user can manage their own account. */}
            <Route path="profile" element={<Profile />} />

            {organizationPages.map((page) => {
              const Page = ORGANIZATION_PAGES[page.path];
              const element = Page ? (
                <Page />
              ) : (
                <ModulePlaceholder title={page.name} description={page.description} />
              );

              return (
                <Route
                  key={page.path}
                  element={
                    page.permission ? (
                      <ProtectedRoute scope="organization" permission={page.permission} module={page.module} />
                    ) : undefined
                  }
                >
                  <Route path={page.path.slice(1)} element={element} />
                </Route>
              );
            })}

            {/* A group's own address (e.g. /catalog) opens its first page. */}
            {organizationGroups.map((group) => (
              <Route
                key={group.path}
                path={group.path.slice(1)}
                element={<CompanyRedirect to={flattenNavigation(group.children)[0].path} />}
              />
            ))}
          </Route>
        </Route>
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

export default AppRoutes;
