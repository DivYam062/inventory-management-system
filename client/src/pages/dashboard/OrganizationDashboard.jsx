import { useSelector } from "react-redux";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";

// Landing page for organization users. Business metrics arrive with the modules they measure
// (see NEW_SYSTEM_FLOW.md); until then this only shows the session context.
const OrganizationDashboard = () => {
  const { user, organization } = useSelector((state) => state.auth);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome, ${user?.name}.`}
      />

      <Card title={organization?.name} description="Your session">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Company route</dt>
            <dd className="mt-0.5 font-medium text-gray-900">/{organization?.companyRoute}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Role</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{user?.role?.name}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
};

export default OrganizationDashboard;
