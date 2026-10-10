import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import LoadingState from "../../components/common/LoadingState";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import RoleTable from "./components/RoleTable";
import RoleForm, { ROLE_FORM_ID } from "./components/RoleForm";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getRoles,
  getPermissionCatalog,
  createRole,
  updateRole,
  deleteRole,
} from "../../services/roleService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const Roles = () => {
  const { can } = usePermissions();
  const canCreate = can("role", "create");
  const canEdit = can("role", "edit");
  // Edit also covers deleting a role.
  const canDelete = canEdit;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // formTarget: null = closed, { mode: "create" } or { mode: "edit" | "view", role }.
  const [formTarget, setFormTarget] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getRoles({ search: search || undefined, page, limit: PAGE_SIZE });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setRoles(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load roles."));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadRoles();
  }, [loadRoles]);

  const loadCatalog = useCallback(async () => {
    try {
      setCatalogError("");
      const { data } = await getPermissionCatalog();
      setCatalog(data);
    } catch (err) {
      setCatalogError(getErrorMessage(err, "Failed to load permissions."));
    }
  }, []);

  const openForm = (target) => {
    setFormError("");
    setFormTarget(target);
    if (!catalog) loadCatalog();
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

      if (formTarget.mode === "create") {
        await createRole(values);
      } else {
        await updateRole(formTarget.role.id, values);
      }

      setFormTarget(null);
      loadRoles();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save role."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteRole(roleToDelete.id);
      setRoleToDelete(null);

      if (roles.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadRoles();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete role."));
    } finally {
      setDeleting(false);
    }
  };

  const mode = formTarget?.mode;
  const isReadOnly = mode === "view" || Boolean(formTarget?.role?.isProtected);

  const modalTitle = { create: "Create Role", edit: "Edit Role", view: formTarget?.role?.name ?? "Role" }[mode];

  return (
    <div>
      <PageHeader title="Roles" description="Create roles and choose what each one can view, create and edit." />

      <Card bodyClassName="p-4">
        <div className="sm:w-72">
          <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by role name..." />
        </div>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadRoles} />
        ) : (
          <Card
            title="Roles"
            description={search ? "Filtered results" : "Default Admin and Support are system roles and cannot be changed"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm({ mode: "create" })}>
                  Create Role
                </Button>
              )
            }
          >
            {!loading && roles.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title={search ? "No roles match your search" : "No roles yet"}
                description={search ? "Try a different search." : "Use the Create Role button above to add one."}
              />
            ) : (
              <>
                <RoleTable
                  roles={roles}
                  loading={loading}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onView={(role) => openForm({ mode: "view", role })}
                  onEdit={(role) => openForm({ mode: "edit", role })}
                  onDelete={(role) => {
                    setDeleteError("");
                    setRoleToDelete(role);
                  }}
                />

                {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
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
          heading: modalTitle,
          subHeading: mode === "view" ? "Role permissions" : undefined,
          icon: ShieldCheck,
        }}
        footerProps={
          isReadOnly
            ? { secondaryButton: { text: "Close", onClick: closeForm } }
            : {
                secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
                primaryButton: {
                  text: mode === "create" ? "Create Role" : "Save Changes",
                  type: "submit",
                  form: ROLE_FORM_ID,
                  loading: submitting,
                },
              }
        }
      >
        {formTarget &&
          (catalogError ? (
            <ErrorState message={catalogError} onRetry={loadCatalog} />
          ) : !catalog ? (
            <LoadingState message="Loading permissions..." />
          ) : (
            <RoleForm
              key={formTarget.role?.id ?? "new"}
              role={formTarget.role}
              catalog={catalog}
              onSubmit={handleSubmit}
              apiError={formError}
              isReadOnly={isReadOnly}
            />
          ))}
      </Modal>

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        onClose={() => {
          setRoleToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Role"
        message={`Delete the role "${roleToDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Roles;
