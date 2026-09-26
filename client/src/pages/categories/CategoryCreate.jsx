import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import CategoryForm from "./components/CategoryForm";
import { createCategory } from "../../services/categoryService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const CategoryCreate = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setApiError("");

      await createCategory(values);
      navigate("/categories");
    } catch (err) {
      setApiError(getErrorMessage(err, "Failed to create category."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Add Category" description="Create a new product category." />

      <Card>
        <CategoryForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/categories")}
          submitting={submitting}
          apiError={apiError}
          submitLabel="Create Category"
        />
      </Card>
    </div>
  );
};

export default CategoryCreate;
