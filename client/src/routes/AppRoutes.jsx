import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../components/layout/MainLayout";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={["admin", "employee"]} />}>
        <Route element={<MainLayout />}>
          <Route
            path="/admin/dashboard"
            element={<h1>Admin Dashboard</h1>}
          />

          <Route
            path="/employee/dashboard"
            element={<h1>Employee Dashboard</h1>}
          />

          <Route
            path="/categories"
            element={<h1>Categories</h1>}
          />

          <Route
            path="/suppliers"
            element={<h1>Suppliers</h1>}
          />

          <Route
            path="/products"
            element={<h1>Products</h1>}
          />

          <Route
            path="/inventory"
            element={<h1>Inventory</h1>}
          />

          <Route
            path="/profile"
            element={<h1>Profile</h1>}
          />
        </Route>
      </Route>

      <Route
        element={<ProtectedRoute allowedRoles={["admin"]} />}
      >
        <Route
          element={<MainLayout />}
        >
          <Route
            path="/admin/users"
            element={<h1>Users</h1>}
          />
        </Route>
      </Route>

      <Route
        path="/unauthorized"
        element={<h1>Unauthorized</h1>}
      />

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
};

export default AppRoutes;