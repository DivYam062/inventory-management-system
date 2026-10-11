import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  PackageCheck,
  PackageX,
  Package,
  Store,
  Tags,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/ui/Button";
import {
  ActivityPanel,
  FlowPanel,
  GateEntriesPanel,
  GrnsPanel,
  InventoryPanel,
  NeedsActionPanel,
  PurchaseOrdersPanel,
  PutawaysPanel,
} from "./components/DashboardPanels";
import { getDashboard } from "../../services/dashboardService";
import { getErrorMessage } from "../../utils/getErrorMessage";

// Where each figure leads (inside the organization's own address).
const PAGES = {
  products: "/catalog/products",
  categories: "/catalog/categories",
  sellers: "/seller/sellers",
  suppliers: "/seller/suppliers",
  purchaseOrders: "/inventory/operations/purchase-orders",
  gateEntries: "/inventory/operations/gate-entries",
  grns: "/inventory/operations/grns",
  putaway: "/inventory/operations/putaway",
  stock: "/inventory/stock-overview",
  tracking: "/inventory/stock-tracking",
  audit: "/inventory/audit-log",
  users: "/settings/users",
};

// The dashboard of an organization user. It shows only the sections the server sent - which are only the ones the
// user's role may view and whose modules are on - so a Network Admin sees everything and a custom role sees just
// its own part. Nothing here checks permissions itself.
const OrganizationDashboard = () => {
  const { user, organization } = useSelector((state) => state.auth);
  const companyRoute = organization?.companyRoute;

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    load();
  }, [load]);

  const paths = Object.fromEntries(Object.entries(PAGES).map(([key, path]) => [key, `/${companyRoute}${path}`]));

  const header = (
    <PageHeader
      title="Dashboard"
      description={`Welcome back, ${user?.name}`}
      actions={
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      }
    />
  );

  if (loading && !dashboard) {
    return (
      <div>
        {header}
        <LoadingState message="Loading your dashboard..." />
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div>
        {header}
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  const d = dashboard;
  const has = (key) => d.sections.includes(key);

  // The headline figures, one per available section, each a link to its page.
  const cards = [
    has("tracking") && { label: "Needs action", value: d.tracking.needsAction, icon: CircleAlert, accent: "red", to: paths.tracking },
    has("purchaseOrders") && { label: "Open purchase orders", value: d.purchaseOrders.open, icon: ClipboardList, accent: "blue", to: paths.purchaseOrders },
    has("gateEntries") && { label: "Waiting at the gate", value: d.gateEntries.pending, icon: DoorOpen, accent: "yellow", to: paths.gateEntries },
    has("grns") && { label: "Awaiting inspection", value: d.grns.pendingInspection, icon: ClipboardCheck, accent: "yellow", to: paths.grns },
    has("putaways") && { label: "Put away (7 days)", value: d.putaways.lastDays, icon: Warehouse, accent: "green", to: paths.putaway },
    has("inventory") && { label: "Products in stock", value: d.inventory.inStock, icon: PackageCheck, accent: "green", to: paths.stock },
    has("inventory") && { label: "Out of stock", value: d.inventory.outOfStock, icon: PackageX, accent: "red", to: paths.stock },
    has("products") && { label: "Products", value: d.products.total, icon: Package, accent: "blue", to: paths.products },
    has("categories") && { label: "Categories", value: d.categories.total, icon: Tags, accent: "purple", to: paths.categories },
    has("sellers") && { label: "Sellers", value: d.sellers.total, icon: Store, accent: "blue", to: paths.sellers },
    has("suppliers") && { label: "Suppliers", value: d.suppliers.total, icon: Truck, accent: "purple", to: paths.suppliers },
    has("users") && { label: "Active users", value: d.users.active, icon: Users, accent: "gray", to: paths.users },
  ].filter(Boolean);

  if (d.sections.length === 0) {
    return (
      <div>
        {header}
        <EmptyState
          icon={LayoutDashboard}
          title="Nothing to show on your dashboard"
          description="Your role does not include any dashboard information yet. A Network Admin can add permissions to your role."
        />
      </div>
    );
  }

  return (
    <div>
      {header}

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.to}
              className="block rounded-xl transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <StatCard icon={card.icon} label={card.label} value={card.value} accent={card.accent} />
            </Link>
          ))}
        </div>
      )}

      {has("tracking") && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NeedsActionPanel tracking={d.tracking} paths={paths} />
          <FlowPanel tracking={d.tracking} paths={paths} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {has("purchaseOrders") && <PurchaseOrdersPanel data={d.purchaseOrders} paths={paths} />}
        {has("gateEntries") && <GateEntriesPanel data={d.gateEntries} paths={paths} />}
        {has("grns") && <GrnsPanel data={d.grns} paths={paths} />}
        {has("putaways") && <PutawaysPanel data={d.putaways} paths={paths} />}
        {has("inventory") && <InventoryPanel data={d.inventory} paths={paths} />}
        {has("activity") && <ActivityPanel data={d.activity} paths={paths} />}
      </div>
    </div>
  );
};

export default OrganizationDashboard;
