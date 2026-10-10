import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getProfile } from "../../services/authService";

// Restores the session context (user, organization, permissions) from a stored token.
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      return await getProfile();
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Session expired"
      );
    }
  }
);

const token = localStorage.getItem("token");

const initialState = {
  user: null,
  // null for the system-level Super Admin.
  organization: null,
  // { resource: [actions] } - empty for Super Admin, who has no organization permissions.
  permissions: {},
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
  state.isSuperAdmin = Boolean(payload.isSuperAdmin);
  state.isAuthenticated = true;
  state.isInitializing = false;
};

const clearSession = (state) => {
  state.user = null;
  state.organization = null;
  state.permissions = {};
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
      });
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
