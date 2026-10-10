import { Navigate, useParams } from "react-router-dom";

// Redirect to an organization path ("/catalog/categories") under the current /{companyRoute}.
const CompanyRedirect = ({ to }) => {
  const { companyRoute } = useParams();

  return <Navigate to={`/${companyRoute}${to}`} replace />;
};

export default CompanyRedirect;
