import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Tags,
  Truck,
  Users,
  Boxes,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import { getDashboardStats } from "../../services/dashboardService";
import { getProducts } from "../../services/productService";
import { getTransactions } from "../../services/inventoryService";

const STOCK_STATUS_CONFIG = [
  {
    key: "inStock",
    label: "In Stock",
    icon: CheckCircle2,
    barClass: "bg-green-500",
    textClass: "text-green-600",
  },
  {
    key: "lowStock",
    label: "Low Stock",
    icon: AlertTriangle,
    barClass: "bg-yellow-400",
    textClass: "text-yellow-600",
  },
  {
    key: "outOfStock",
    label: "Out of Stock",
    icon: PackageX,
    barClass: "bg-red-500",
    textClass: "text-red-600",
  },
];

const StockStatusBreakdown = ({ breakdown }) => {
  const { total } = breakdown;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {STOCK_STATUS_CONFIG.map((item, index) => {
          const count = breakdown[item.key];
          if (count === 0) return null;
          const width = (count / total) * 100;

          return (
            <div
              key={item.key}
              className={`h-full ${item.barClass} ${index > 0 ? "ml-0.5" : ""}`}
              style={{ width: `${width}%` }}
            />
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STOCK_STATUS_CONFIG.map((item) => {
          const Icon = item.icon;
          const count = breakdown[item.key];

          return (
            <div key={item.key} className="flex items-center gap-2">
              <Icon size={16} className={item.textClass} />
              <div>
                <p className="text-sm font-semibold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CategoryBreakdown = ({ categories }) => {
  const maxQuantity = categories[0]?.quantity || 1;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const width = Math.max((category.quantity / maxQuantity) * 100, 4);

        return (
          <div key={category.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{category.name}</span>
              <span className="text-gray-500">{category.quantity} units</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [statsRes, productsRes, transactionsRes] = await Promise.all([
        getDashboardStats(),
        getProducts(),
        getTransactions(),
      ]);

      setStats(statsRes.stats);
      setProducts(productsRes.products);
      setTransactions(transactionsRes.transactions);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    loadDashboard();
  }, [loadDashboard]);

  const derived = useMemo(() => {
    if (!products) return null;

    const totalInventoryQuantity = products.reduce(
      (sum, product) => sum + product.quantity,
      0
    );

    const categoryMap = new Map();
    products.forEach((product) => {
      const key = product.category?.name || "Uncategorized";
      categoryMap.set(key, (categoryMap.get(key) || 0) + product.quantity);
    });
    const categoryBreakdown = Array.from(
      categoryMap,
      ([name, quantity]) => ({ name, quantity })
    )
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    const inStock = products.filter(
      (product) => product.quantity > product.minimumStock
    ).length;
    const lowStock = products.filter(
      (product) => product.quantity > 0 && product.quantity <= product.minimumStock
    ).length;
    const outOfStock = products.filter(
      (product) => product.quantity === 0
    ).length;

    const attentionProducts = products
      .filter((product) => product.quantity <= product.minimumStock)
      .sort((a, b) => a.quantity - b.quantity);

    return {
      totalInventoryQuantity,
      categoryBreakdown,
      stockBreakdown: { inStock, lowStock, outOfStock, total: products.length },
      attentionProducts,
    };
  }, [products]);

  if (loading) {
    return <LoadingState fullHeight message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDashboard} />;
  }

  const cards = [
    { label: "Total Products", value: stats.totalProducts, icon: Package, accent: "blue" },
    { label: "Total Categories", value: stats.totalCategories, icon: Tags, accent: "purple" },
    { label: "Total Suppliers", value: stats.totalSuppliers, icon: Truck, accent: "blue" },
    { label: "Total Employees", value: stats.totalEmployees, icon: Users, accent: "gray" },
    { label: "Total Inventory Quantity", value: derived.totalInventoryQuantity, icon: Boxes, accent: "green" },
    { label: "Low Stock Products", value: stats.lowStockProducts, icon: AlertTriangle, accent: "yellow" },
    { label: "Out of Stock Products", value: stats.outOfStockProducts, icon: PackageX, accent: "red" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your inventory and business at a glance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Inventory by Category"
          description="Stock quantity distribution across categories"
        >
          {derived.categoryBreakdown.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No category data"
              description="Add products to see this breakdown."
            />
          ) : (
            <CategoryBreakdown categories={derived.categoryBreakdown} />
          )}
        </Card>

        <Card
          title="Stock Status"
          description="How your current inventory is distributed"
        >
          {derived.stockBreakdown.total === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No products yet"
              description="Stock status will appear once products are added."
            />
          ) : (
            <StockStatusBreakdown breakdown={derived.stockBreakdown} />
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title="Recent Activity"
          description="Latest inventory transactions"
          actions={
            <Link
              to="/inventory"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          }
        >
          {!transactions || transactions.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No recent activity"
              description="Stock-in and stock-out transactions will show up here."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.slice(0, 5).map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        transaction.type === "stock-in"
                          ? "bg-green-50 text-green-600"
                          : "bg-orange-50 text-orange-600"
                      }`}
                    >
                      {transaction.type === "stock-in" ? (
                        <ArrowDownCircle size={18} />
                      ) : (
                        <ArrowUpCircle size={18} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {transaction.product?.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        by {transaction.performedBy?.name} ·{" "}
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={transaction.type} />
                    <span className="text-sm font-medium text-gray-700">
                      {transaction.quantity}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Low Stock Products"
          description="Products that need restocking"
          actions={
            <Link
              to="/products"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          }
        >
          {derived.attentionProducts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All stocked up"
              description="No products are currently low or out of stock."
            />
          ) : (
            <Table
              columns={[
                {
                  key: "name",
                  header: "Product",
                  render: (product) => (
                    <div>
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.category?.name}
                      </p>
                    </div>
                  ),
                },
                { key: "sku", header: "SKU" },
                { key: "quantity", header: "Current Stock" },
                { key: "minimumStock", header: "Minimum Stock" },
                {
                  key: "status",
                  header: "Status",
                  render: (product) => (
                    <StatusBadge
                      status={product.quantity === 0 ? "out-of-stock" : "low-stock"}
                    />
                  ),
                },
              ]}
              data={derived.attentionProducts.slice(0, 6)}
              emptyMessage="No low stock products"
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
