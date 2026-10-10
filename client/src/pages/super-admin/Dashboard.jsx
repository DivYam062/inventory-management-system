import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, XCircle, Users, TrendingUp } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import OrganizationAvatar from "../../components/common/OrganizationAvatar";
import Card from "../../components/ui/Card";
import ColumnChart from "../../components/charts/ColumnChart";
import BarList from "../../components/charts/BarList";
import SegmentedBar from "../../components/charts/SegmentedBar";
import { CHART_COLORS } from "../../components/charts/chartUtils";
import { getSystemOverview } from "../../services/systemService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const formatMonth = (month, options) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleString("en", { ...options, timeZone: "UTC" });

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

const SuperAdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await getSystemOverview();
      setOverview(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    loadOverview();
  }, [loadOverview]);

  const monthlyData = useMemo(
    () =>
      (overview?.organizationsByMonth ?? []).map((entry) => ({
        key: entry.month,
        label: formatMonth(entry.month, { month: "short" }),
        tooltipTitle: formatMonth(entry.month, { month: "long", year: "numeric" }),
        value: entry.count,
      })),
    [overview]
  );

  if (loading) {
    return <LoadingState fullHeight message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadOverview} />;
  }

  const cards = [
    { label: "Total Organizations", value: overview.totalOrganizations, icon: Building2, accent: "blue" },
    { label: "Active Organizations", value: overview.activeOrganizations, icon: CheckCircle2, accent: "green" },
    { label: "Inactive Organizations", value: overview.inactiveOrganizations, icon: XCircle, accent: "gray" },
    { label: "Organization Users", value: overview.totalOrganizationUsers, icon: Users, accent: "purple" },
  ];

  const statusSegments = [
    { key: "active", label: "Active", value: overview.activeOrganizations, color: CHART_COLORS.good, icon: CheckCircle2 },
    { key: "inactive", label: "Inactive", value: overview.inactiveOrganizations, color: CHART_COLORS.neutral, icon: XCircle },
  ];

  const hasRecentGrowth = monthlyData.some((entry) => entry.value > 0);
  const createdInWindow = monthlyData.reduce((sum, entry) => sum + entry.value, 0);

  const topOrganizations = overview.topOrganizationsByUsers.map((organization) => ({
    key: organization.id,
    label: organization.name,
    value: organization.userCount,
    leading: <OrganizationAvatar organization={organization} size="sm" />,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="System-wide overview of all organizations."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="New organizations"
          description={`Created per month, last ${monthlyData.length} months`}
          className="lg:col-span-2"
        >
          {hasRecentGrowth ? (
            <ColumnChart data={monthlyData} unit="organization" ariaLabel="Organizations created per month" />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No new organizations"
              description={`None were created in the last ${monthlyData.length} months.`}
            />
          )}
          {hasRecentGrowth && (
            <p className="mt-4 text-xs text-gray-500">
              {createdInWindow} organization{createdInWindow === 1 ? "" : "s"} created in this period.
            </p>
          )}
        </Card>

        <Card title="Organization status" description="Active and inactive organizations">
          {overview.totalOrganizations === 0 ? (
            <EmptyState icon={Building2} title="No organizations yet" description="Status appears once one is created." />
          ) : (
            <SegmentedBar segments={statusSegments} unit="organization" ariaLabel="Organizations by status" />
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Users by organization" description="Organizations with the most users">
          {topOrganizations.length === 0 ? (
            <EmptyState icon={Users} title="No users yet" description="Users appear once organizations are created." />
          ) : (
            <BarList items={topOrganizations} unit="user" ariaLabel="Users per organization" />
          )}
        </Card>

        <Card
          title="Recent organizations"
          description="Latest additions"
          actions={
            <Link
              to="/super-admin/organizations"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          }
        >
          {overview.recentOrganizations.length === 0 ? (
            <EmptyState icon={Building2} title="No organizations yet" description="Created organizations show up here." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {overview.recentOrganizations.map((organization) => (
                <li
                  key={organization.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <OrganizationAvatar organization={organization} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{organization.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        <span className="font-mono">/{organization.companyRoute}</span> · {formatDate(organization.createdAt)}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={organization.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
