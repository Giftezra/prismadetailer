import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { Platform, Alert } from "react-native";

/**
 * Permission status types
 */
export interface PermissionStatus {
  notifications: {
    granted: boolean;
    canAskAgain: boolean;
    status: "granted" | "denied" | "undetermined" | "blocked";
  };
  location: {
    granted: boolean;
    canAskAgain: boolean;
    status: "granted" | "denied" | "undetermined" | "blocked";
  };
}

/**
 * Permission service hook that manages notification and location permissions
 *
 * Features:
 * - Checks current permission status
 * - Requests permissions with proper error handling
 * - Persists permission preferences in SecureStore
 * - Provides real-time permission status updates
 * - Handles platform-specific permission flows
 * - Graceful degradation when permissions are denied
 */
export const usePermissions = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    notifications: {
      granted: false,
      canAskAgain: true,
      status: "undetermined",
    },
    location: {
      granted: false,
      canAskAgain: true,
      status: "undetermined",
    },
  });

  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load saved permission preferences from SecureStore
   */
  const loadSavedPermissions = async () => {
    try {
      const savedNotifications = await SecureStore.getItemAsync(
        "notification_permission"
      );
      const savedLocation = await SecureStore.getItemAsync(
        "location_permission"
      );

      if (savedNotifications) {
        setPermissionStatus((prev) => ({
          ...prev,
          notifications: JSON.parse(savedNotifications),
        }));
      }

      if (savedLocation) {
        setPermissionStatus((prev) => ({
          ...prev,
          location: JSON.parse(savedLocation),
        }));
      }
    } catch (error) {
      console.error("Error loading saved permissions:", error);
    }
  };

  /**
   * Save permission status to SecureStore
   */
  const savePermissionStatus = async (
    type: "notifications" | "location",
    status: any
  ) => {
    try {
      await SecureStore.setItemAsync(
        `${type}_permission`,
        JSON.stringify(status)
      );
    } catch (error) {
      console.error(`Error saving ${type} permission:`, error);
    }
  };

  /**
   * Check current notification permission status
   */
  const checkNotificationPermission = async () => {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();

      const permissionInfo = {
        granted: status === "granted",
        canAskAgain,
        status,
      };

      setPermissionStatus((prev) => ({
        ...prev,
        notifications: permissionInfo,
      }));

      await savePermissionStatus("notifications", permissionInfo);
      return permissionInfo;
    } catch (error) {
      console.error("Error checking notification permission:", error);
      return null;
    }
  };

  /**
   * Check current location permission status
   */
  const checkLocationPermission = async () => {
    try {
      const { status, canAskAgain } =
        await Location.getForegroundPermissionsAsync();

      const permissionInfo = {
        granted: status === "granted",
        canAskAgain,
        status,
      };

      setPermissionStatus((prev) => ({
        ...prev,
        location: permissionInfo,
      }));

      await savePermissionStatus("location", permissionInfo);
      return permissionInfo;
    } catch (error) {
      console.error("Error checking location permission:", error);
      return null;
    }
  };

  /**
   * Request notification permission
   */
  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      // First check if we can ask for permission
      const currentStatus = await Notifications.getPermissionsAsync();

      if (!currentStatus.canAskAgain) {
        Alert.alert(
          "Notification Permission Required",
          "Please enable notifications in your device settings to receive important updates about your bookings and services.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                // For notifications, we can use Linking to open app settings
                import("expo-linking").then(({ openSettings }) =>
                  openSettings()
                );
              },
            },
          ]
        );
        return false;
      }

      // Request permission
      const { status } = await Notifications.requestPermissionsAsync();

      const permissionInfo = {
        granted: status === "granted",
        canAskAgain: currentStatus.canAskAgain,
        status,
      };

      setPermissionStatus((prev) => ({
        ...prev,
        notifications: permissionInfo,
      }));

      await savePermissionStatus("notifications", permissionInfo);

      if (status === "granted") {
        // Configure notification handler for Android
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        }

        return true;
      } else {
        Alert.alert(
          "Permission Denied",
          "You can enable notifications later in the app settings.",
          [{ text: "OK" }]
        );
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  };

  /**
   * Request location permission
   */
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      // First check if we can ask for permission
      const currentStatus = await Location.getForegroundPermissionsAsync();

      if (!currentStatus.canAskAgain) {
        Alert.alert(
          "Location Permission Required",
          "Please enable location services in your device settings to find nearby services and provide accurate location-based features.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                // For location, we can use Linking to open app settings
                import("expo-linking").then(({ openSettings }) =>
                  openSettings()
                );
              },
            },
          ]
        );
        return false;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      const permissionInfo = {
        granted: status === "granted",
        canAskAgain: currentStatus.canAskAgain,
        status,
      };

      setPermissionStatus((prev) => ({
        ...prev,
        location: permissionInfo,
      }));

      await savePermissionStatus("location", permissionInfo);

      if (status === "granted") {
        return true;
      } else {
        Alert.alert(
          "Permission Denied",
          "You can enable location services later in the app settings.",
          [{ text: "OK" }]
        );
        return false;
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
      return false;
    }
  };

  /**
   * Request all permissions (for first-time setup)
   */
  const requestAllPermissions = async () => {
    setIsLoading(true);

    try {
      const notificationResult = await requestNotificationPermission();
      const locationResult = await requestLocationPermission();

      return {
        notifications: notificationResult,
        location: locationResult,
      };
    } catch (error) {
      console.error("Error requesting all permissions:", error);
      return {
        notifications: false,
        location: false,
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize permissions on app startup
   */
  const initializePermissions = async () => {
    setIsLoading(true);

    try {
      await loadSavedPermissions();
      await checkNotificationPermission();
      await checkLocationPermission();
    } catch (error) {
      console.error("Error initializing permissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset all permission preferences
   */
  const resetPermissions = async () => {
    try {
      await SecureStore.deleteItemAsync("notification_permission");
      await SecureStore.deleteItemAsync("location_permission");

      setPermissionStatus({
        notifications: {
          granted: false,
          canAskAgain: true,
          status: "undetermined",
        },
        location: {
          granted: false,
          canAskAgain: true,
          status: "undetermined",
        },
      });
    } catch (error) {
      console.error("Error resetting permissions:", error);
    }
  };

  // Initialize permissions on mount
  useEffect(() => {
    initializePermissions();
  }, []);

  return {
    permissionStatus,
    isLoading,
    checkNotificationPermission,
    checkLocationPermission,
    requestNotificationPermission,
    requestLocationPermission,
    requestAllPermissions,
    resetPermissions,
  };
};
