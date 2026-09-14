import Spinner from "./Spinner";

const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found",
  keyField = "id",
  onRowClick,
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                  column.className || ""
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center">
                  <Spinner size="md" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition ${
                  onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 text-gray-700 ${
                      column.className || ""
                    }`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
