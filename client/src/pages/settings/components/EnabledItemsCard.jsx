import { useMemo, useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Toggle from "../../../components/ui/Toggle";
import SearchBar from "../../../components/common/SearchBar";

// A card listing every item of a system list (currencies, units) with an on/off switch each. The
// organization picks which ones it uses; Save sends the full list of enabled codes.
//   items: [{ code, name, detail? }]   enabledCodes: the codes saved today   onSave(codes)
const EnabledItemsCard = ({ title, description, items, enabledCodes, canEdit, onSave, saving, error, itemNoun }) => {
  const [selected, setSelected] = useState(() => new Set(enabledCodes));
  const [search, setSearch] = useState("");

  const isDirty = useMemo(
    () => selected.size !== enabledCodes.length || enabledCodes.some((code) => !selected.has(code)),
    [selected, enabledCodes]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(term));
  }, [items, search]);

  const toggle = (code) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <Card
      title={title}
      description={description}
      actions={
        canEdit && (
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(enabledCodes))} disabled={saving}>
                Reset
              </Button>
            )}
            <Button
              onClick={() => onSave(items.map((item) => item.code).filter((code) => selected.has(code)))}
              loading={saving}
              disabled={!isDirty}
            >
              Save Changes
            </Button>
          </div>
        )
      }
    >
      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:w-72">
          <SearchBar value={search} onChange={setSearch} placeholder={`Search ${itemNoun}...`} />
        </div>
        <p className="text-sm text-gray-500">
          {selected.size} of {items.length} enabled
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No {itemNoun} match your search.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <li key={item.code} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                <p className="truncate text-xs text-gray-500">{item.detail ? `${item.code} · ${item.detail}` : item.code}</p>
              </div>
              <Toggle
                size="sm"
                aria-label={`${selected.has(item.code) ? "Disable" : "Enable"} ${item.name}`}
                isChecked={selected.has(item.code)}
                isDisabled={!canEdit || saving}
                onChange={() => toggle(item.code)}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default EnabledItemsCard;
