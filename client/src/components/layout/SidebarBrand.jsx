import { useState } from "react";
import { APP_NAME } from "../../config/app";
import { buildImageUrl } from "../../utils/buildImageUrl";

// Top of the sidebar. An organization with a logo shows the whole logo (never cropped); otherwise,
// and for the Super Admin, the product name. A logo that fails to load falls back to the name.
const SidebarBrand = ({ organization, isSuperAdmin }) => {
  const logoUrl = !isSuperAdmin && organization?.logo ? buildImageUrl(organization.logo) : null;

  const [failedUrl, setFailedUrl] = useState(null);
  const showLogo = Boolean(logoUrl) && failedUrl !== logoUrl;

  return (
    <div className="flex min-h-21 items-center border-b px-6 py-4">
      {showLogo ? (
        <img
          src={logoUrl}
          alt={organization.name}
          onError={() => setFailedUrl(logoUrl)}
          className="max-h-14 max-w-full object-contain"
        />
      ) : (
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight text-gray-900">{APP_NAME}</h1>
          <p className="mt-1 truncate text-xs text-gray-500">
            {isSuperAdmin ? "System Administration" : organization?.name}
          </p>
        </div>
      )}
    </div>
  );
};

export default SidebarBrand;
