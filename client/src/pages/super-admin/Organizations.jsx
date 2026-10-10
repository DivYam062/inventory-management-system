import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import OrganizationTable from "./components/OrganizationTable";
import OrganizationForm, { ORGANIZATION_FORM_ID } from "./components/OrganizationForm";
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "../../services/organizationService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });

  // formTarget: null = closed, "new" = create form, otherwise the organization being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [organizationToDelete, setOrganizationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Activate/deactivate from the table. Deactivating asks for confirmation first.
  const [togglingId, setTogglingId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusError, setStatusError] = useState("");

  // Debounce the raw search input before it drives the API call. Nothing happens unless the text really
  // changed, so opening the page (or paging) is never reset to page 1 by a stray timer.
  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getOrganizations({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setOrganizations(data);
      setPagination({ totalPages: meta?.total_page ?? 1 });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load organizations."));
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadOrganizations();
  }, [loadOrganizations]);

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const openForm = (target) => {
    setFormError("");
    setFormTarget(target);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormTarget(null);
    setFormError("");
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setFormError("");

      if (formTarget === "new") {
        await createOrganization(values);
      } else {
        await updateOrganization(formTarget.id, values);
      }

      setFormTarget(null);
      loadOrganizations();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save organization."));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (organization, nextStatus) => {
    try {
      setTogglingId(organization.id);
      setStatusError("");

      const { data } = await updateOrganization(organization.id, { status: nextStatus });

      if (status) {
        // A status filter is active, so the row may no longer belong in the list.
        loadOrganizations();
      } else {
        setOrganizations((previous) => previous.map((o) => (o.id === data.id ? data : o)));
      }
      setStatusTarget(null);
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to update organization status."));
      setStatusTarget(null);
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleStatus = (organization) => {
    if (organization.status === "active") {
      setStatusTarget(organization);
    } else {
      changeStatus(organization, "active");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!organizationToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteOrganization(organizationToDelete.id);
      setOrganizationToDelete(null);

      if (organizations.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadOrganizations();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete organization."));
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = Boolean(searchInput || status);
  const isEditing = formTarget && formTarget !== "new";

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Create and manage the organizations on this system."
      />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by name, route or email..."
            />
          </div>

          <div className="sm:w-48">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadOrganizations} />
        ) : (
          <Card
            title="Organizations"
            description={search || status ? "Filtered results" : "All organizations"}
            actions={
              <Button icon={Plus} onClick={() => openForm("new")}>
                Create Organization
              </Button>
            }
          >
            {!loading && organizations.length === 0 ? (
              <EmptyState
                icon={Building2}
                title={hasActiveFilters ? "No organizations match your filters" : "No organizations yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : "Use the Create Organization button above to add the first one."
                }
              />
            ) : (
              <>
                {statusError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {statusError}
                  </div>
                )}

                <OrganizationTable
                  organizations={organizations}
                  loading={loading}
                  togglingId={togglingId}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(organization) => openForm(organization)}
                  onDelete={(organization) => {
                    setDeleteError("");
                    setOrganizationToDelete(organization);
                  }}
                />

                {!loading && (
                  <Pagination
                    currentPage={page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={Boolean(formTarget)}
        onClose={closeForm}
        size="xl"
        headerProps={{
          heading: isEditing ? "Edit Organization" : "Create Organization",
          icon: Building2,
        }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create Organization",
            type: "submit",
            form: ORGANIZATION_FORM_ID,
            loading: submitting,
          },
        }}
      >
        {formTarget && (
          <OrganizationForm
            key={isEditing ? formTarget.id : "new"}
            organization={isEditing ? formTarget : null}
            onSubmit={handleSubmit}
            apiError={formError}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => changeStatus(statusTarget, "inactive")}
        title="Deactivate Organization"
        message={`Deactivate "${statusTarget?.name}"? Its users will be signed out and cannot sign in until it is activated again. No data is deleted.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={Boolean(statusTarget) && togglingId === statusTarget.id}
      />

      <ConfirmDialog
        open={Boolean(organizationToDelete)}
        onClose={() => {
          setOrganizationToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Organization"
        message={`Delete "${organizationToDelete?.name}"? This permanently deletes the organization and its ${
          organizationToDelete?.userCount ?? 0
        } user(s), roles and all of its data. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Organizations;
