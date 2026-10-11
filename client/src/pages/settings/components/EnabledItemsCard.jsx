import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Toggle from "../../../components/ui/Toggle";
import SearchBar from "../../../components/common/SearchBar";

// A card listing every item of a system list (currencies, units) with an on/off switch each. The
// organization picks which ones it uses; Save sends the full list of enabled codes.
//   items: [{ code, name, detail?, isCustom? }]   enabledCodes: the codes saved today   onSave(codes)
//   onAdd: opens the add form (custom entries)   onDeleteItem(item): delete a custom entry
const EnabledItemsCard = ({
  title,
  description,
  items,
  enabledCodes,
  canEdit,
  onSave,
  onAdd,
  addLabel,
  onDeleteItem,
  saving,
  error,
  itemNoun,
}) => {
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
            <Button variant="outline" icon={Plus} onClick={onAdd} disabled={saving}>
              {addLabel}
            </Button>
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
                <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <span className="truncate">{item.name}</span>
                  {item.isCustom && <Badge variant="blue">Custom</Badge>}
                </p>
                <p className="truncate text-xs text-gray-500">{item.detail ? `${item.code} · ${item.detail}` : item.code}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
              {item.isCustom && canEdit && (
                <button
                  type="button"
                  onClick={() => onDeleteItem(item)}
                  title={`Delete ${item.name}`}
                  aria-label={`Delete ${item.name}`}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <Toggle
                size="sm"
                aria-label={`${selected.has(item.code) ? "Disable" : "Enable"} ${item.name}`}
                isChecked={selected.has(item.code)}
                isDisabled={!canEdit || saving}
                onChange={() => toggle(item.code)}
              />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default EnabledItemsCard;
