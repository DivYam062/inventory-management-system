import { Search, X } from "lucide-react";

const SearchBar = ({ value, onChange, placeholder = "Search...", className = "" }) => {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange?.("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
