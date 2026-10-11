import { Navigate, useParams } from "react-router-dom";

const CompanyRedirect = ({ to }) => {
  const { companyRoute } = useParams();

  return <Navigate to={`/${companyRoute}${to}`} replace />;
};

export default CompanyRedirect;
