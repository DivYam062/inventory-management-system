import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getProfile } from "../../services/authService";

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getProfile();
      return data.user;
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
  token,
  isAuthenticated: !!token,
  // True only while we still need to verify a stored token by fetching the user's profile.
  isInitializing: !!token,
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;

      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.isInitializing = false;

      localStorage.setItem("token", token);
    },

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitializing = false;

      localStorage.removeItem("token");
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitializing = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isInitializing = false;

        localStorage.removeItem("token");
      });
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
