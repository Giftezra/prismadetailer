import { useState, useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { usePermissions } from "./usePermissions";
import Constants from "expo-constants";

/**
 * Notification service hook that handles push notifications
 *
 * Features:
 * - Registers device for push notifications
 * - Manages notification tokens
 * - Handles notification responses
 * - Schedules local notifications
 * - Integrates with permission system
 */
export const useNotificationService = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] =
    useState<Notifications.Notification>();
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);
  const { permissionStatus } = usePermissions();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.expoConfig?.plugins?.find(
      (plugin: any) => plugin[0] === "eas"
    )?.[1]?.projectId ||
    "";

  /**
   * Configure notification handler for the app
   */
  const configureNotifications = () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  };

  /**
   * Register device for push notifications
   */
  const registerForPushNotificationsAsync = async () => {
    let token;

    console.log("Registering for push notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return;
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: projectId, // Your EAS project ID
        })
      ).data;
      console.log("Expo push token:", token);
    } else {
      console.log("Must use physical device for Push Notifications");
    }

    return token;
  };

  /**
   * Schedule a local notification
   */
  const scheduleLocalNotification = async (
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ) => {
    try {
      if (!permissionStatus.notifications.granted) {
        console.log("Notification permission not granted");
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: trigger || null, // null means send immediately
      });

      return notificationId;
    } catch (error) {
      console.error("Error scheduling notification:", error);
      return null;
    }
  };

  /**
   * Cancel a scheduled notification
   */
  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  };

  /**
   * Cancel all scheduled notifications
   */
  const cancelAllNotifications = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error canceling all notifications:", error);
    }
  };

  /**
   * Get all scheduled notifications
   */
  const getScheduledNotifications = async () => {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error getting scheduled notifications:", error);
      return [];
    }
  };

  /**
   * Send a test notification
   */
  const sendTestNotification = async () => {
    if (!permissionStatus.notifications.granted) {
      console.log("Notification permission not granted");
      return;
    }

    await scheduleLocalNotification(
      "Test Notification",
      "This is a test notification from your app!",
      { type: "test" }
    );
  };

  /**
   * Initialize notification service
   */
  const initializeNotificationService = async () => {
    try {
      configureNotifications();

      if (permissionStatus.notifications.granted) {
        const token = await registerForPushNotificationsAsync();
        console.log("Expo push token:", token);
        setExpoPushToken(token);
      }

      // Set up notification listeners
      notificationListener.current =
        Notifications.addNotificationReceivedListener((notification) => {
          setNotification(notification);
        });

      responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log("Notification response:", response);
          // Handle notification tap here
          // You can navigate to specific screens based on the notification data
        });

      return;
    } catch (error) {
      console.error("Error initializing notification service:", error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeNotificationService();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [permissionStatus.notifications.granted]);

  return {
    expoPushToken,
    notification,
    scheduleLocalNotification,
    cancelNotification,
    cancelAllNotifications,
    getScheduledNotifications,
    sendTestNotification,
    initializeNotificationService,
  };
};
