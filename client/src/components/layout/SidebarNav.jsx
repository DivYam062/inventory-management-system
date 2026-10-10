import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

// Renders a navigation tree (see config/navigation.js): links, and collapsible groups to any depth.
// `basePath` is prefixed to every item path ("" for the system menu, "/{companyRoute}" for an organization).
const isInside = (pathname, fullPath) => pathname === fullPath || pathname.startsWith(`${fullPath}/`);

const itemClasses = (isActive) =>
  `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
    isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
  }`;

const NavGroup = ({ item, basePath }) => {
  const { pathname } = useLocation();
  const Icon = item.icon;

  const containsCurrentPage = isInside(pathname, basePath + item.path);

  // Follows the current page until the user opens or closes it themselves.
  const [manualOpen, setManualOpen] = useState(null);
  const isOpen = manualOpen ?? containsCurrentPage;

  return (
    <div>
      <button
        type="button"
        onClick={() => setManualOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`${itemClasses(false)} w-full ${containsCurrentPage ? "text-blue-600" : ""}`}
      >
        {Icon && <Icon size={19} />}
        <span className="flex-1 text-left">{item.name}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="ml-6 mt-1 space-y-1 border-l border-gray-100 pl-3">
          {item.children.map((child) => (
            <NavNode key={child.path} item={child} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
};

const NavNode = ({ item, basePath }) => {
  if (item.children) return <NavGroup item={item} basePath={basePath} />;

  const Icon = item.icon;

  return (
    <NavLink to={`${basePath}${item.path}`} className={({ isActive }) => itemClasses(isActive)}>
      {Icon && <Icon size={19} />}
      {item.name}
    </NavLink>
  );
};

const SidebarNav = ({ items, basePath = "" }) => (
  <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Main">
    {items.map((item) => (
      <NavNode key={item.path} item={item} basePath={basePath} />
    ))}
  </nav>
);

export default SidebarNav;
