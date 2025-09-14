import { createSlice } from "@reduxjs/toolkit";
import AuthState, { SignUpScreenProps } from "@/app/interfaces/AuthInterface";

const initialState: AuthState = {
  user: null,
  access: "",
  refresh: "",
  isAuthenticated: false,
  isLoading: false,
  signUpData: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setIsAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setAccessToken: (state, action) => {
      state.access = action.payload;
    },
    setRefreshToken: (state, action) => {
      state.refresh = action.payload;
    },

    /**
     * Collect the users data during the registration process and store it in the state
     * @param state - The current state of the auth slice
     * @param action - The action payload containing the field and value to update
     */
    setSignUpData: (state, action) => {
      state.signUpData = action.payload;
    },

    /**
     * Clear the user information from the state
     * and the local storage
     */
    logout: (state) => {
      state.user = null;
      state.access = "";
      state.refresh = "";
      state.isAuthenticated = false;
    },

    /**
     * Clear the sign up data from the state
     * @param state - The current state of the auth slice
     */
    clearSignUpData: (state) => {
      state.signUpData = null;
    },
  },
});

export const {
  setUser,
  setIsLoading,
  setIsAuthenticated,
  setSignUpData,
  clearSignUpData,
  logout,
  setAccessToken,
  setRefreshToken,
} = authSlice.actions;
export default authSlice.reducer;
