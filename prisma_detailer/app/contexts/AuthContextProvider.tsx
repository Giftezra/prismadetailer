import React, { createContext, useContext } from "react";
// import * as SecureStore from "expo-secure-store";
import { useAlertContext } from "./AlertContext";
import { useAppDispatch } from "@/app/store/my_store";
import {
  logout,
  setIsAuthenticated,
  setUser,
  setAccessToken,
  setRefreshToken,
} from "@/app/store/slices/authSlice";
import { useLoginMutation } from "@/app/store/api/authApi";
import { UserProfileProps } from "@/app/interfaces/ProfileInterfaces";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { usePermissions } from "@/app/app-hooks/usePermissions";
import { saveDataToStorage } from "../utils/storage";


/**
 * Create an auth context to manage the user's authentication state.
 */
interface AuthContextType {
  handleLogin: (
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<void>;
  handleLogout: () => void;
  isLoading: boolean;
  isError: boolean;
  error: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const { setIsVisible, setAlertConfig } = useAlertContext();

  /* Destructure the login mutation from the authApi */
  const [login, { isLoading, isError, error, status }] = useLoginMutation();

  /* Get permission service for first-time setup */
  const { requestAllPermissions } = usePermissions();

  /**
   * Reauthenticate a user when the page mounts by checking the secure store for the user data
   * If the data is correct, set data to the redux store and navigate to the dashboard page.
   */
  React.useEffect(() => {
    const reauthenticateUser = async () => {
      const user = await SecureStore.getItemAsync("user");
      const storedAccess = await SecureStore.getItemAsync("access");
      const storedRefresh = await SecureStore.getItemAsync("refresh");
      // Check if the user is authenticated.
      if (user && storedAccess && storedRefresh) {
        dispatch(setUser(JSON.parse(user)));
        dispatch(setAccessToken(storedAccess));
        dispatch(setRefreshToken(storedRefresh));
        dispatch(setIsAuthenticated(true));
        router.replace("/main/(tabs)/dashboard/DashboardScreen");
      }
    };
    reauthenticateUser();
  }, []);

  /* Handle the users logout functionality */
  const handleLogout = () => {
    setAlertConfig({
      title: "Logout",
      message: "Are you sure you want to logout?",
      type: "success",
      isVisible: true,
      onConfirm: async () => {
        try {
          await SecureStore.deleteItemAsync("user");
          await SecureStore.deleteItemAsync("access");
          await SecureStore.deleteItemAsync("refresh");
          dispatch(logout());
          // Navigate to signin page
          router.replace("/onboarding/SigninScreen");
        } catch (error) {
          console.error("Error during logout:", error);
        }
      },
      onClose: () => {
        setIsVisible(false);
      },
    });
  };

  /**
   * Login a new user using their email and password.
   * @param {email:string, password:string} credentials - The credentials of the user to login.
   * These will be sent to the server side to validate the user and when the user is properly validated,
   * the user will be redirected to the dashboard page
   */
  const handleLogin = async (
    email: string,
    password: string,
    rememberMe: boolean
  ) => {
    const credentials = { email, password };
    try {
      const response = await login(credentials).unwrap();

      // The response from the server should contain user, access, and refresh
      if (response && response.user && response.access && response.refresh) {
        dispatch(setUser(response.user));
        dispatch(setIsAuthenticated(true));
        dispatch(setAccessToken(response.access));
        dispatch(setRefreshToken(response.refresh));

        if (rememberMe) {
          // Call the save function to save the user data to the secure store.
          const saved = await saveDataToStorage(
            response.user,
            response.access,
            response.refresh
          );
          if (saved) {
            // Request permissions after successful login
            await requestAllPermissions();
            router.replace("/main/(tabs)/dashboard/DashboardScreen");
          }
        } else {
          // Request permissions after successful login
          await requestAllPermissions();
          router.replace("/main/(tabs)/dashboard/DashboardScreen");
        }
      } else {
        console.error("Invalid response structure:", response);
      }
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const value = {
    handleLogin,
    handleLogout,
    isLoading,
    isError,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuthContext must be used within an AuthContextProvider"
    );
  }
  return context;
};

export default AuthContextProvider;
