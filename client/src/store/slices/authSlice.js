import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getProfile } from "../../services/authService";

// Restores the session context (user, organization, permissions) from a stored token.
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await getProfile();
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Session expired"
      );
    }
  }
);

// On/off state of the receiving modules (see Configuration). Everything is on until the server says otherwise.
const DEFAULT_MODULES = { purchaseOrder: true, gateEntry: true, grn: true };

// Purchase order settings from Configuration. While over-receiving is off, orders have no over-receiving choice.
const DEFAULT_PURCHASE_ORDER_SETTINGS = { allowOverReceiving: false };

// Re-reads the session context (permissions, module switches, organization details) so a change made elsewhere
// - a role edited, a permission added, a module switched - shows up without a reload. Unlike fetchCurrentUser a
// failure here changes nothing: a lost connection must not sign the user out (an expired token is handled by
// the API layer's 401 handling).
export const refreshCurrentUser = createAsyncThunk("auth/refreshCurrentUser", async () => {
  const { data } = await getProfile();
  return data;
});

const token = localStorage.getItem("token");

const initialState = {
  user: null,
  // null for the system-level System Admin.
  organization: null,
  // { resource: [actions] } - empty for System Admin, who has no organization permissions.
  permissions: {},
  modules: DEFAULT_MODULES,
  purchaseOrder: DEFAULT_PURCHASE_ORDER_SETTINGS,
  isSuperAdmin: false,
  token,
  isAuthenticated: !!token,
  // True only while we still need to verify a stored token by fetching the session context.
  isInitializing: !!token,
};

const applyContext = (state, payload) => {
  state.user = payload.user;
  state.organization = payload.organization ?? null;
  state.permissions = payload.permissions ?? {};
  state.modules = payload.modules ?? DEFAULT_MODULES;
  state.purchaseOrder = payload.purchaseOrder ?? DEFAULT_PURCHASE_ORDER_SETTINGS;
  state.isSuperAdmin = Boolean(payload.isSuperAdmin);
  state.isAuthenticated = true;
  state.isInitializing = false;
};

const clearSession = (state) => {
  state.user = null;
  state.organization = null;
  state.permissions = {};
  state.modules = DEFAULT_MODULES;
  state.purchaseOrder = DEFAULT_PURCHASE_ORDER_SETTINGS;
  state.isSuperAdmin = false;
  state.token = null;
  state.isAuthenticated = false;
  state.isInitializing = false;

  localStorage.removeItem("token");
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    // payload: the login response ({ token, user, organization, permissions, isSuperAdmin })
    setCredentials: (state, action) => {
      applyContext(state, action.payload);
      state.token = action.payload.token;

      localStorage.setItem("token", action.payload.token);
    },

    // After the module switches are saved in Configuration, so the menu and routes follow at once.
    // payload: { modules, purchaseOrder } as returned by the configuration API.
    setModules: (state, action) => {
      state.modules = action.payload.modules;
      state.purchaseOrder = action.payload.purchaseOrder;
    },

    updateUser: (state, action) => {
      state.user = action.payload;
    },

    // After a password change: the server issues a fresh token and signs older sessions out.
    updateToken: (state, action) => {
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
    },

    logout: (state) => {
      clearSession(state);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        applyContext(state, action.payload);
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        clearSession(state);
      })
      .addCase(refreshCurrentUser.fulfilled, (state, action) => {
        applyContext(state, action.payload);
      });
  },
});

export const { setCredentials, setModules, updateUser, updateToken, logout } = authSlice.actions;

export default authSlice.reducer;
