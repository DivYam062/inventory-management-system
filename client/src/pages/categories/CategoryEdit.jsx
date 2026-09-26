import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Card from "../../components/ui/Card";
import CategoryForm from "./components/CategoryForm";
import { getCategoryById, updateCategory } from "../../services/categoryService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const CategoryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const loadCategory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getCategoryById(id);
      setCategory(data.category);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load category."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    loadCategory();
  }, [loadCategory]);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setApiError("");

      await updateCategory(id, values);
      navigate("/categories");
    } catch (err) {
      setApiError(getErrorMessage(err, "Failed to update category."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState fullHeight message="Loading category..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadCategory} />;
  }

  if (!category) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Edit Category" description={`Update details for ${category.name}`} />

      <Card>
        <CategoryForm
          initialValues={category}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/categories")}
          submitting={submitting}
          apiError={apiError}
          submitLabel="Save Changes"
        />
      </Card>
    </div>
  );
};

export default CategoryEdit;
