import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

// Renders a navigation tree (see config/navigation.js): links, and collapsible groups to any depth.
// `basePath` is prefixed to every item path ("" for the system menu, "/{companyRoute}" for an organization).
const isInside = (pathname, fullPath) => pathname === fullPath || pathname.startsWith(`${fullPath}/`);

// Top-level items are roomy; nested items are tighter so deep menus still fit the sidebar without their
// labels wrapping.
const itemClasses = (isActive, depth) =>
  `flex items-center gap-3 rounded-lg text-sm font-medium transition ${
    depth === 0 ? "px-4 py-2.5" : "px-3 py-2"
  } ${isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;

const NavGroup = ({ item, basePath, depth }) => {
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
        className={`${itemClasses(false, depth)} w-full ${containsCurrentPage ? "text-blue-600" : ""}`}
      >
        {Icon && <Icon size={19} className="shrink-0" />}
        <span className="flex-1 whitespace-nowrap text-left">{item.name}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className={`mt-1 space-y-0.5 border-l border-gray-200 ${depth === 0 ? "ml-5 pl-2" : "ml-3 pl-2"}`}>
          {item.children.map((child) => (
            <NavNode key={child.path} item={child} basePath={basePath} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const NavNode = ({ item, basePath, depth = 0 }) => {
  if (item.children) return <NavGroup item={item} basePath={basePath} depth={depth} />;

  const Icon = item.icon;

  return (
    <NavLink to={`${basePath}${item.path}`} className={({ isActive }) => itemClasses(isActive, depth)}>
      {Icon && <Icon size={19} className="shrink-0" />}
      <span className="whitespace-nowrap">{item.name}</span>
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
