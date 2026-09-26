import { X } from "lucide-react";
import SearchBar from "../../../components/common/SearchBar";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const CategoryFilters = ({ search, onSearchChange, status, onStatusChange, onClear }) => {
  const hasActiveFilters = Boolean(search || status);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="sm:w-72">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Search by name..." />
      </div>

      <div className="sm:w-48">
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          options={STATUS_OPTIONS}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" icon={X} onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  );
};

export default CategoryFilters;
