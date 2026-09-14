import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { updateCurrency } from "../../store/slices/settingsSlice";
import { CURRENCY_OPTIONS } from "../../utils/currency";

const Settings = () => {
  const dispatch = useDispatch();
  const currency = useSelector((state) => state.settings.currency);

  const [selected, setSelected] = useState(currency);
  const [savedCurrency, setSavedCurrency] = useState(currency);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Keep the dropdown in sync if the Redux value changes from elsewhere
  // (e.g. the initial fetch resolves after this page has already mounted).
  if (currency !== savedCurrency) {
    setSavedCurrency(currency);
    setSelected(currency);
  }

  const handleChange = (e) => {
    setSelected(e.target.value);
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSaved(false);

      await dispatch(updateCurrency(selected)).unwrap();
      setSaved(true);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to update currency.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure application-wide preferences."
      />

      <Card
        title="Currency"
        description="Choose the currency used to display prices across the app."
        className="max-w-xl"
      >
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Select
              label="Currency"
              value={selected}
              onChange={handleChange}
              options={CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: c.label }))}
            />
          </div>

          <Button onClick={handleSave} loading={saving} disabled={selected === currency}>
            Save
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-sm text-green-600">Currency updated successfully.</p>}
      </Card>
    </div>
  );
};

export default Settings;
