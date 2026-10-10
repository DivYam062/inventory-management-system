import { Hammer } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";

// Shown for an organization page whose module is not built yet. It states that plainly instead of
// faking data; the real page replaces it (see ORGANIZATION_PAGES in routes/AppRoutes.jsx).
const ModulePlaceholder = ({ title, description }) => {
  return (
    <div>
      <PageHeader title={title} description={description} />

      <EmptyState
        icon={Hammer}
        title="Not available yet"
        description={`${title} is part of the upcoming release and will be enabled here.`}
      />
    </div>
  );
};

export default ModulePlaceholder;
