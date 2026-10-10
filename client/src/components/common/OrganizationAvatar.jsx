import { DEFAULT_BRANDING } from "../../utils/branding";
import { buildImageUrl } from "../../utils/buildImageUrl";

// The organization's logo, or an initial tile in its own primary color (the system default blue
// when it has no custom colors, or when `branding` is not available).
const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
};

const OrganizationAvatar = ({ organization, size = "md" }) => {
  const sizeClasses = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  if (organization.logo) {
    return (
      <img
        src={buildImageUrl(organization.logo)}
        alt=""
        className={`${sizeClasses} shrink-0 rounded-lg border border-gray-200 object-cover`}
      />
    );
  }

  const color = organization.branding?.useCustomColors
    ? organization.branding.primary
    : DEFAULT_BRANDING.primary;

  return (
    <span
      aria-hidden="true"
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-lg font-semibold text-white`}
      style={{ backgroundColor: color }}
    >
      {organization.name?.charAt(0).toUpperCase()}
    </span>
  );
};

export default OrganizationAvatar;
