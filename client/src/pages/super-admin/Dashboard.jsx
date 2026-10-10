import { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle2, XCircle, Users } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { getSystemOverview } from "../../services/systemService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const SuperAdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getSystemOverview();
      setOverview(data.overview);
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
    </div>
  );
};

export default SuperAdminDashboard;
