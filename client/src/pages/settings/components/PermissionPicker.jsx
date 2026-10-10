import Checkbox from "../../../components/ui/Checkbox";

// Permission checklist for a role: one row per feature, grouped by area, with fixed View / Create /
// Edit columns so every action lines up from row to row (a feature without an action leaves that cell
// empty). There is no separate Delete: Edit also allows deleting.
//
//   catalog   [{ resource, label, group, actions }]   from GET /api/roles/permissions
//   value     { resource: [actions] }                  the role's current permissions
//   onChange  (nextValue) => void
//   canGrant  (resource, action) => boolean            permissions the user may not hand out are disabled
//   isReadOnly  everything disabled (viewing a protected role)
//
// Behavior:
//   - the feature checkbox selects all of its permissions (or clears them when all are selected)
//   - ticking Create / Edit also ticks View (you cannot create what you cannot see)
//   - clearing View clears the feature's other permissions
const ACTION_ORDER = ["view", "create", "edit"];
const ACTION_LABELS = { view: "View", create: "Create", edit: "Edit" };
const ACTION_HINTS = { edit: "Edit also allows deleting" };

// Feature name column + one fixed column per action.
const GRID = "grid grid-cols-[minmax(7.5rem,1fr)_repeat(3,4.5rem)] items-center";

const PermissionPicker = ({ catalog, value, onChange, canGrant: canGrantAction = () => true, isReadOnly = false }) => {
  // In read-only mode the checklist reflects the role as it is, not what the viewer could grant.
  const canGrant = (resource, action) => isReadOnly || canGrantAction(resource, action);

  const groups = [];
  catalog.forEach((feature) => {
    let group = groups.find((g) => g.name === feature.group);
    if (!group) {
      group = { name: feature.group, features: [] };
      groups.push(group);
    }
    group.features.push(feature);
  });

  const setFeature = (resource, actions) => {
    const next = { ...value };
    if (actions.length === 0) delete next[resource];
    else next[resource] = actions;
    onChange(next);
  };

  const toggleFeature = (feature) => {
    const grantable = feature.actions.filter((action) => canGrant(feature.resource, action));
    const selected = value[feature.resource] ?? [];
    const allSelected = grantable.length > 0 && grantable.every((action) => selected.includes(action));

    // Keep anything already selected that the user cannot change; select or clear the rest.
    const locked = selected.filter((action) => !grantable.includes(action));
    setFeature(feature.resource, allSelected ? locked : [...locked, ...grantable]);
  };

  const toggleAction = (feature, action, checked) => {
    const selected = new Set(value[feature.resource] ?? []);

    if (checked) {
      selected.add(action);
      selected.add("view");
    } else if (action === "view") {
      selected.clear();
    } else {
      selected.delete(action);
    }

    setFeature(
      feature.resource,
      ACTION_ORDER.filter((a) => selected.has(a))
    );
  };

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const selectedInGroup = group.features.reduce((sum, feature) => sum + (value[feature.resource]?.length ?? 0), 0);
        const totalInGroup = group.features.reduce((sum, feature) => sum + feature.actions.length, 0);

        return (
          <section key={group.name} className="overflow-x-auto rounded-xl border border-gray-200">
            <div className="min-w-88">
              <div className={`${GRID} gap-x-1 border-b border-gray-200 bg-gray-50 px-4 py-2.5`}>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">{group.name}</h4>
                  <span className="text-xs tabular-nums text-gray-400">
                    {selectedInGroup}/{totalInGroup}
                  </span>
                </div>

                {ACTION_ORDER.map((action) => (
                  <span key={action} title={ACTION_HINTS[action]} className="text-center text-xs font-medium text-gray-500">
                    {ACTION_LABELS[action]}
                  </span>
                ))}
              </div>

              <ul className="divide-y divide-gray-100">
                {group.features.map((feature) => {
                  const selected = value[feature.resource] ?? [];
                  const grantable = feature.actions.filter((action) => canGrant(feature.resource, action));
                  const allSelected = grantable.length > 0 && grantable.every((action) => selected.includes(action));
                  const someSelected = selected.length > 0;

                  return (
                    <li
                      key={feature.resource}
                      className={`${GRID} gap-x-1 px-4 py-2.5 transition-colors ${someSelected ? "bg-blue-50/50" : ""}`}
                    >
                      <Checkbox
                        label={feature.label}
                        name={feature.resource}
                        isChecked={allSelected}
                        isIndeterminate={someSelected && !allSelected}
                        isDisabled={isReadOnly || grantable.length === 0}
                        onChange={() => toggleFeature(feature)}
                        title={grantable.length === 0 ? "You do not have these permissions" : `Select all ${feature.label} permissions`}
                        className="font-medium"
                      />

                      {ACTION_ORDER.map((action) => {
                        if (!feature.actions.includes(action)) return <span key={action} aria-hidden="true" />;

                        const allowed = canGrant(feature.resource, action);

                        return (
                          <div key={action} className="flex justify-center">
                            <Checkbox
                              aria-label={ACTION_LABELS[action]}
                              name={`${feature.resource}:${action}`}
                              isChecked={selected.includes(action)}
                              isDisabled={isReadOnly || !allowed}
                              onChange={(e) => toggleAction(feature, action, e.target.checked)}
                              title={allowed ? ACTION_HINTS[action] ?? `${ACTION_LABELS[action]} ${feature.label}` : "You cannot grant a permission you do not have"}
                            />
                          </div>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default PermissionPicker;
