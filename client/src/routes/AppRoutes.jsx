import { Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import Unauthorized from "../pages/errors/Unauthorized";
import SuperAdminDashboard from "../pages/super-admin/Dashboard";
import Organizations from "../pages/super-admin/Organizations";
import OrganizationDashboard from "../pages/dashboard/OrganizationDashboard";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import HomeRedirect from "./HomeRedirect";
import CompanyRoute from "./CompanyRoute";
import MainLayout from "../components/layout/MainLayout";

// Two separate areas: the system (Super Admin) and the organization (permission-based).
// Organization feature routes are added per phase, each wrapped with
// <ProtectedRoute scope="organization" permission={[resource, action]} />.
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
        </Route>
      </Route>

      <Route element={<ProtectedRoute scope="organization" />}>
        <Route path="/:companyRoute" element={<CompanyRoute />}>
          <Route element={<MainLayout />}>
            <Route path="dashboard" element={<OrganizationDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
};

export default AppRoutes;
