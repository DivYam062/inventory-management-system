import { X } from "lucide-react";
import SearchBar from "../../../components/common/SearchBar";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";

const STOCK_STATUS_OPTIONS = [
  { value: "", label: "All Stock Status" },
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
];

const ProductFilters = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  stockStatus,
  onStockStatusChange,
  categories,
  onClear,
}) => {
  const hasActiveFilters = Boolean(search || category || stockStatus);

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="sm:w-72">
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder="Search by name or SKU..."
        />
      </div>

      <div className="sm:w-48">
        <Select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          options={categoryOptions}
        />
      </div>

      <div className="sm:w-48">
        <Select
          aria-label="Filter by stock status"
          value={stockStatus}
          onChange={(e) => onStockStatusChange(e.target.value)}
          options={STOCK_STATUS_OPTIONS}
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

export default ProductFilters;
