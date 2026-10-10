import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

// Guards /:companyRoute/* so a user can only open their own organization's URLs.
// Another company's route (typed or bookmarked) is redirected to the user's own route,
// keeping the rest of the path. The backend independently scopes all data by organization.
const CompanyRoute = () => {
  const { companyRoute } = useParams();
  const { pathname, search } = useLocation();
  const ownRoute = useSelector((state) => state.auth.organization?.companyRoute);

  if (ownRoute && companyRoute !== ownRoute) {
    const rest = pathname.slice(`/${companyRoute}`.length);
    return <Navigate to={`/${ownRoute}${rest}${search}`} replace />;
  }

  return <Outlet />;
};

export default CompanyRoute;
