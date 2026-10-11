import { useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Toggle from "../../../components/ui/Toggle";

const MODULES = [
  {
    key: "purchaseOrder",
    name: "Purchase Orders",
    description: "Raise purchase orders to sellers and track what was ordered and received.",
  },
  {
    key: "gateEntry",
    name: "Gate Entry",
    description: "Record goods arriving at the gate, against a purchase order or a seller and supplier.",
  },
  {
    key: "grn",
    name: "GRN",
    description: "Receive goods and record the passed and failed quantities. Putaway follows GRN.",
  },
];

const Row = ({ children, isNested = false }) => (
  <div
    className={`flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3 ${
      isNested ? "ml-6 bg-gray-50" : ""
    }`}
  >
    {children}
  </div>
);

// On/off switches for the receiving-flow modules, and the settings that belong to a module (shown only
// while that module is on). A switched-off module disappears from the menu and its pages close.
//   modules: { purchaseOrder, gateEntry, grn }   purchaseOrder: { allowOverReceiving }
const ModulesCard = ({ modules, purchaseOrder, canEdit, saving, error, onSave }) => {
  const [moduleValues, setModuleValues] = useState(modules);
  const [allowOverReceiving, setAllowOverReceiving] = useState(purchaseOrder.allowOverReceiving);

  const isDirty =
    MODULES.some(({ key }) => moduleValues[key] !== modules[key]) ||
    allowOverReceiving !== purchaseOrder.allowOverReceiving;

  const reset = () => {
    setModuleValues(modules);
    setAllowOverReceiving(purchaseOrder.allowOverReceiving);
  };

  return (
    <Card
      title="Modules"
      description="Turn the receiving steps your organization uses on or off. Switched-off modules are hidden from the menu."
      actions={
        canEdit && (
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
                Reset
              </Button>
            )}
            <Button
              onClick={() => onSave({ modules: moduleValues, purchaseOrder: { allowOverReceiving } })}
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

      <div className="space-y-3">
        {MODULES.map((module) => (
          <div key={module.key} className="space-y-3">
            <Row>
              <div>
                <p className="text-sm font-medium text-gray-900">{module.name}</p>
                <p className="mt-0.5 text-sm text-gray-500">{module.description}</p>
              </div>
              <Toggle
                aria-label={`${moduleValues[module.key] ? "Disable" : "Enable"} ${module.name}`}
                isChecked={moduleValues[module.key]}
                isDisabled={!canEdit || saving}
                onChange={(event) => setModuleValues((previous) => ({ ...previous, [module.key]: event.target.checked }))}
                className="shrink-0"
              />
            </Row>

            {module.key === "purchaseOrder" && moduleValues.purchaseOrder && (
              <Row isNested>
                <div>
                  <p className="text-sm font-medium text-gray-900">Allow over-receiving</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {allowOverReceiving
                      ? "On - a GRN may receive more of an item than the purchase order asked for."
                      : "Off - a GRN cannot receive more of an item than the purchase order asked for."}
                  </p>
                </div>
                <Toggle
                  aria-label={`${allowOverReceiving ? "Disable" : "Enable"} over-receiving`}
                  isChecked={allowOverReceiving}
                  isDisabled={!canEdit || saving}
                  onChange={(event) => setAllowOverReceiving(event.target.checked)}
                  className="shrink-0"
                />
              </Row>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ModulesCard;
