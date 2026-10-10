import { useCallback, useEffect, useState } from "react";
import { Plus, UserPlus, Users as UsersIcon, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import LoadingState from "../../components/common/LoadingState";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import UserTable from "./components/UserTable";
import UserForm, { USER_FORM_ID } from "./components/UserForm";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getUsers,
  getAssignableRoles,
  createUser,
  updateUser,
  deleteUser,
} from "../../services/userService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const Users = () => {
  const { can } = usePermissions();
  const canCreate = can("user", "create");
  const canEdit = can("user", "edit");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [roleId, setRoleId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // The roles this user may assign (role dropdown in the form, and the role filter).
  const [roles, setRoles] = useState(null);
  const [rolesError, setRolesError] = useState("");

  // formTarget: null = closed, "new" = create form, otherwise the user being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Activate/deactivate from the table. Deactivating asks for confirmation first.
  const [togglingId, setTogglingId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusError, setStatusError] = useState("");

  // Debounce the raw search input before it drives the API call.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getUsers({
        search: search || undefined,
        status: status || undefined,
        roleId: roleId || undefined,
        page,
        limit: PAGE_SIZE,
      });

      setUsers(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  }, [search, status, roleId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadUsers();
  }, [loadUsers]);

  const loadRoles = useCallback(async () => {
    try {
      setRolesError("");
      const { data } = await getAssignableRoles();
      setRoles(data);
    } catch (err) {
      setRolesError(getErrorMessage(err, "Failed to load roles."));
    }
  }, []);

  // Only people who can create or edit users may ask for the assignable roles.
  useEffect(() => {
    if (canCreate || canEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
      loadRoles();
    }
  }, [canCreate, canEdit, loadRoles]);

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchInput || status || roleId);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setRoleId("");
    setPage(1);
  };

  const openForm = (target) => {
    setFormError("");
    setFormTarget(target);
    if (!roles && !rolesError) loadRoles();
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
        await createUser(values);
      } else {
        await updateUser(formTarget.id, values);
      }

      setFormTarget(null);
      loadUsers();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save user."));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (user, nextStatus) => {
    try {
      setTogglingId(user.id);
      setStatusError("");

      const { data } = await updateUser(user.id, { status: nextStatus });

      if (status) {
        // A status filter is active, so the row may no longer belong in the list.
        loadUsers();
      } else {
        setUsers((previous) => previous.map((u) => (u.id === data.id ? data : u)));
      }
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to update user status."));
    } finally {
      setTogglingId(null);
      setStatusTarget(null);
    }
  };

  const handleToggleStatus = (user) => {
    if (user.status === "active") {
      setStatusTarget(user);
    } else {
      changeStatus(user, "active");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteUser(userToDelete.id);
      setUserToDelete(null);

      if (users.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        loadUsers();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete user."));
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = formTarget && formTarget !== "new";

  const roleFilterOptions = [{ value: "", label: "All Roles" }, ...(roles ?? []).map((r) => ({ value: r.id, label: r.name }))];

  return (
    <div>
      <PageHeader title="Users" description="Add people to your organization and choose what each one can do." />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or email..." />
          </div>

          <div className="sm:w-44">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => handleFilterChange(setStatus)(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>

          {roles && roles.length > 0 && (
            <div className="sm:w-52">
              <Select
                aria-label="Filter by role"
                value={roleId}
                onChange={(e) => handleFilterChange(setRoleId)(e.target.value)}
                options={roleFilterOptions}
              />
            </div>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadUsers} />
        ) : (
          <Card
            title="Users"
            description={hasActiveFilters ? "Filtered results" : "Everyone in your organization"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm("new")}>
                  Create User
                </Button>
              )
            }
          >
            {!loading && users.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title={hasActiveFilters ? "No users match your filters" : "No users yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : "Use the Create User button above to add the first one."
                }
              />
            ) : (
              <>
                {statusError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {statusError}
                  </div>
                )}

                <UserTable
                  users={users}
                  loading={loading}
                  canEdit={canEdit}
                  togglingId={togglingId}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(user) => openForm(user)}
                  onDelete={(user) => {
                    setDeleteError("");
                    setUserToDelete(user);
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
          heading: isEditing ? "Edit User" : "Create User",
          subHeading: isEditing ? formTarget.email : undefined,
          icon: UserPlus,
        }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create User",
            type: "submit",
            form: USER_FORM_ID,
            loading: submitting,
            disabled: !roles,
          },
        }}
      >
        {formTarget &&
          (rolesError ? (
            <ErrorState message={rolesError} onRetry={loadRoles} />
          ) : !roles ? (
            <LoadingState message="Loading roles..." />
          ) : (
            <UserForm
              key={isEditing ? formTarget.id : "new"}
              user={isEditing ? formTarget : null}
              roles={roles}
              onSubmit={handleSubmit}
              apiError={formError}
            />
          ))}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => changeStatus(statusTarget, "inactive")}
        title="Deactivate User"
        message={`Deactivate ${statusTarget?.name}? They will be signed out and cannot sign in until you activate them again. Nothing is deleted.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={Boolean(statusTarget) && togglingId === statusTarget.id}
      />

      <ConfirmDialog
        open={Boolean(userToDelete)}
        onClose={() => {
          setUserToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Delete ${userToDelete?.name} (${userToDelete?.email})? They will lose access immediately. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Users;
