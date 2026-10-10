import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import EnabledItemsCard from "./components/EnabledItemsCard";
import { usePermissions } from "../../hooks/usePermissions";
import { getConfiguration, updateConfiguration } from "../../services/configurationService";
import { getCurrencies, getUnits } from "../../services/referenceService";
import { getErrorMessage } from "../../utils/getErrorMessage";

// The whole system list is small, so it is fetched in one request (the API cap is 100).
const ALL = { scope: "all", limit: 100 };

const Configuration = () => {
  const { can } = usePermissions();
  const canEdit = can("configuration", "edit");

  const [state, setState] = useState(null); // { config, currencies: [...], units: [...] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(null); // "currencies" | "units" | null
  const [saveErrors, setSaveErrors] = useState({});
  // Bumped after a save so the card re-reads the saved list.
  const [version, setVersion] = useState({ currencies: 0, units: 0 });

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

  const save = async (key, codes) => {
    try {
      setSaving(key);
      setSaveErrors((previous) => ({ ...previous, [key]: "" }));

      const { data } = await updateConfiguration({ [key]: codes });

      setState((previous) => ({ ...previous, config: data }));
      setVersion((previous) => ({ ...previous, [key]: previous[key] + 1 }));
    } catch (err) {
      setSaveErrors((previous) => ({ ...previous, [key]: getErrorMessage(err, "Failed to save configuration.") }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Configuration"
        description="Choose the currencies and units of measurement your organization uses. Only enabled ones are offered on products and later documents."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          <EnabledItemsCard
            key={`currencies-${version.currencies}`}
            title="Currencies"
            description="A currency that products still use cannot be removed. At least one must stay enabled."
            itemNoun="currencies"
            items={state.currencies.map((c) => ({ code: c.code, name: c.name, detail: c.symbol }))}
            enabledCodes={state.config.currencies}
            canEdit={canEdit}
            saving={saving === "currencies"}
            error={saveErrors.currencies}
            onSave={(codes) => save("currencies", codes)}
          />

          <EnabledItemsCard
            key={`units-${version.units}`}
            title="Units of Measurement"
            description="A unit that products still use cannot be removed. At least one must stay enabled."
            itemNoun="units"
            items={state.units.map((u) => ({ code: u.code, name: u.name, detail: u.group }))}
            enabledCodes={state.config.units}
            canEdit={canEdit}
            saving={saving === "units"}
            error={saveErrors.units}
            onSave={(codes) => save("units", codes)}
          />
        </div>
      )}
    </div>
  );
};

export default Configuration;
