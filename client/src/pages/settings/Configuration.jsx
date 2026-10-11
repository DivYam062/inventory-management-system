import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Coins, Ruler } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import ModulesCard from "./components/ModulesCard";
import EnabledItemsCard from "./components/EnabledItemsCard";
import AddEntryForm, { ADD_ENTRY_FORM_ID } from "./components/AddEntryForm";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getConfiguration,
  updateConfiguration,
  addCurrency,
  deleteCurrency,
  addUnit,
  deleteUnit,
} from "../../services/configurationService";
import { getCurrencies, getUnits } from "../../services/referenceService";
import { setModules } from "../../store/slices/authSlice";
import { getErrorMessage } from "../../utils/getErrorMessage";

// The whole list is small, so it is fetched in one request (the API cap is 100).
const ALL = { scope: "all", limit: 100 };

// Everything that differs between the two cards.
const KINDS = {
  currencies: {
    singular: "currency",
    Icon: Coins,
    add: addCurrency,
    remove: deleteCurrency,
    inUseHint: "A currency that products still use cannot be removed or deleted. At least one must stay enabled.",
  },
  units: {
    singular: "unit",
    Icon: Ruler,
    add: addUnit,
    remove: deleteUnit,
    inUseHint: "A unit that products still use cannot be removed or deleted. At least one must stay enabled.",
  },
};

const Configuration = () => {
  const dispatch = useDispatch();
  const { can } = usePermissions();
  const canEdit = can("configuration", "edit"); // also covers adding and deleting custom entries

  const [state, setState] = useState(null); // { config, currencies: [...], units: [...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(null); // "modules" | "currencies" | "units" | null
  const [saveErrors, setSaveErrors] = useState({});
  // Bumped after a save / add / delete so the card re-reads the saved list.
  const [version, setVersion] = useState({ modules: 0, currencies: 0, units: 0 });

  const [addKind, setAddKind] = useState(null); // "currencies" | "units" | null
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, item }
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [config, currencies, units] = await Promise.all([getConfiguration(), getCurrencies(ALL), getUnits(ALL)]);

      setState({ config: config.data, currencies: currencies.data, units: units.data });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load configuration."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // After adding / deleting a custom entry the lists change, so both are read again.
  const applyChange = async (kind, config) => {
    const [currencies, units] = await Promise.all([getCurrencies(ALL), getUnits(ALL)]);
    setState({ config, currencies: currencies.data, units: units.data });
    setVersion((previous) => ({ ...previous, [kind]: previous[kind] + 1 }));
  };

  // payload: what to send, e.g. { currencies: [...] } or { modules, purchaseOrder }.
  const save = async (key, payload) => {
    try {
      setSaving(key);
      setSaveErrors((previous) => ({ ...previous, [key]: "" }));

      const { data } = await updateConfiguration(payload);

      setState((previous) => ({ ...previous, config: data }));
      // The menu and routes follow the module switches straight away.
      if (key === "modules") dispatch(setModules(data.modules));
      setVersion((previous) => ({ ...previous, [key]: previous[key] + 1 }));
    } catch (err) {
      setSaveErrors((previous) => ({ ...previous, [key]: getErrorMessage(err, "Failed to save configuration.") }));
    } finally {
      setSaving(null);
    }
  };

  const closeAdd = () => {
    if (adding) return;
    setAddKind(null);
    setAddError("");
  };

  const handleAdd = async (values) => {
    try {
      setAdding(true);
      setAddError("");

      const { data } = await KINDS[addKind].add(values);
      await applyChange(addKind, data);

      setAddKind(null);
    } catch (err) {
      setAddError(getErrorMessage(err, `Failed to add ${KINDS[addKind].singular}.`));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      setDeleteError("");

      const { data } = await KINDS[deleteTarget.kind].remove(deleteTarget.item.code);
      await applyChange(deleteTarget.kind, data);

      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(getErrorMessage(err, `Failed to delete ${KINDS[deleteTarget.kind].singular}.`));
    } finally {
      setDeleting(false);
    }
  };

  const addConfig = addKind ? KINDS[addKind] : null;

  return (
    <div>
      <PageHeader
        title="Configuration"
        description="Choose the modules your organization uses, and the currencies and units of measurement it offers (or add your own)."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          <ModulesCard
            key={`modules-${version.modules}`}
            modules={state.config.modules}
            purchaseOrder={state.config.purchaseOrder}
            canEdit={canEdit}
            saving={saving === "modules"}
            error={saveErrors.modules}
            onSave={(payload) => save("modules", payload)}
          />

          <EnabledItemsCard
            key={`currencies-${version.currencies}`}
            title="Currencies"
            description={KINDS.currencies.inUseHint}
            itemNoun="currencies"
            addLabel="Add Currency"
            items={state.currencies.map((c) => ({ code: c.code, name: c.name, detail: c.symbol, isCustom: c.isCustom }))}
            enabledCodes={state.config.currencies}
            canEdit={canEdit}
            saving={saving === "currencies"}
            error={saveErrors.currencies}
            onSave={(codes) => save("currencies", { currencies: codes })}
            onAdd={() => {
              setAddError("");
              setAddKind("currencies");
            }}
            onDeleteItem={(item) => {
              setDeleteError("");
              setDeleteTarget({ kind: "currencies", item });
            }}
          />

          <EnabledItemsCard
            key={`units-${version.units}`}
            title="Units of Measurement"
            description={KINDS.units.inUseHint}
            itemNoun="units"
            addLabel="Add Unit"
            items={state.units.map((u) => ({ code: u.code, name: u.name, detail: u.group, isCustom: u.isCustom }))}
            enabledCodes={state.config.units}
            canEdit={canEdit}
            saving={saving === "units"}
            error={saveErrors.units}
            onSave={(codes) => save("units", { units: codes })}
            onAdd={() => {
              setAddError("");
              setAddKind("units");
            }}
            onDeleteItem={(item) => {
              setDeleteError("");
              setDeleteTarget({ kind: "units", item });
            }}
          />
        </div>
      )}

      <Modal
        isOpen={Boolean(addKind)}
        onClose={closeAdd}
        size="md"
        headerProps={{
          heading: addConfig ? `Add ${addConfig.singular === "currency" ? "Currency" : "Unit of Measurement"}` : "",
          icon: addConfig?.Icon,
        }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeAdd, disabled: adding },
          primaryButton: { text: "Add", type: "submit", form: ADD_ENTRY_FORM_ID, loading: adding },
        }}
      >
        {addKind && <AddEntryForm key={addKind} kind={addConfig.singular} onSubmit={handleAdd} apiError={addError} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget ? KINDS[deleteTarget.kind].singular : ""}`}
        message={`Delete "${deleteTarget?.item.name}" (${deleteTarget?.item.code})? Unsaved on/off changes in this list are discarded.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Configuration;
