import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AdminDashboard from "../pages/admin/Dashboard";
import Products from "../pages/products/Products";
import ProductView from "../pages/products/ProductView";
import ProductCreate from "../pages/products/ProductCreate";
import ProductEdit from "../pages/products/ProductEdit";
import Settings from "../pages/settings/Settings";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../components/layout/MainLayout";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute allowedRoles={["admin", "employee"]} />}>
        <Route element={<MainLayout />}>
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
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
            element={<Products />}
          />

          <Route
            path="/products/:id"
            element={<ProductView />}
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

          <Route
            path="/products/create"
            element={<ProductCreate />}
          />

          <Route
            path="/products/:id/edit"
            element={<ProductEdit />}
          />

          <Route
            path="/settings"
            element={<Settings />}
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