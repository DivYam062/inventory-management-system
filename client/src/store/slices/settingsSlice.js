import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getSettings, updateSettings } from "../../services/settingsService";

export const fetchSettings = createAsyncThunk(
  "settings/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getSettings();
      return data.settings;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load settings"
      );
    }
  }
);

export const updateCurrency = createAsyncThunk(
  "settings/updateCurrency",
  async (currency, { rejectWithValue }) => {
    try {
      const data = await updateSettings({ currency });
      return data.settings;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update currency"
      );
    }
  }
);

const initialState = {
  currency: "INR",
  loaded: false,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.currency = action.payload.currency;
        state.loaded = true;
      })
      .addCase(updateCurrency.fulfilled, (state, action) => {
        state.currency = action.payload.currency;
      });
  },
});

export default settingsSlice.reducer;
