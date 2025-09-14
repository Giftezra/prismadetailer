/**
 * Modern Settings Screen Component
 *
 * This component provides a comprehensive settings interface with:
 * - Collapsible sections for different setting categories
 * - Theme-aware styling that adapts to light/dark modes
 * - Interactive toggle switches for various app settings
 * - Integration with the app's ThemeProvider for real-time theme switching
 * - Smooth animations and modern UI design
 *
 * Features:
 * - Notifications: Email, Push, and Marketing notification preferences
 * - Appearance: Theme selection (Light, Dark, System Default)
 * - General: Auto-save, Location Services, and Analytics settings
 */

import { ScrollView, StyleSheet, View, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemeContext } from "@/app/contexts/ThemeProvider";
import SettingSection from "@/app/components/ui/settings/SettingSection";
import SettingItem from "@/app/components/ui/settings/SettingItem";
import StyledText from "@/app/components/helpers/StyledText";
import { usePermissions } from "@/app/app-hooks/usePermissions";
import { useNotificationService } from "@/app/app-hooks/useNotificationService";
import { useLocationService } from "@/app/app-hooks/useLocationService";
import * as SecureStore from "expo-secure-store";

/**
 * Main Settings Screen Component
 *
 * Provides a complete settings interface with:
 * - Three main sections: Notifications, Appearance, and General
 * - State management for all setting values
 * - Integration with ThemeProvider for theme switching
 * - Console logging for all setting changes
 * - Responsive design with proper scrolling
 */
const SettingScreen = () => {
  // Get theme context for theme switching functionality
  const { theme, setTheme } = useThemeContext();

  // Get permission and service hooks
  const {
    permissionStatus,
    requestNotificationPermission,
    requestLocationPermission,
    checkNotificationPermission,
    checkLocationPermission,
  } = usePermissions();
  const { sendTestNotification } = useNotificationService();
  const { currentLocation, getCurrentLocation } = useLocationService();

  // State for managing which sections are expanded
  const [expandedSections, setExpandedSections] = useState<{
    notifications: boolean;
    appearance: boolean;
    general: boolean;
  }>({
    notifications: false,
    appearance: false,
    general: false,
  });

  // User preference state (separate from system permissions)
  const [userPreferences, setUserPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    marketingNotifications: false,
    autoSave: true,
    locationServices: false,
    analytics: false,
  });

  /**
   * Load saved user preferences from SecureStore
   */
  const loadUserPreferences = async () => {
    try {
      const savedPreferences = await SecureStore.getItemAsync(
        "user_preferences"
      );
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        setUserPreferences((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
    }
  };

  /**
   * Save user preferences to SecureStore
   */
  const saveUserPreferences = async (
    newPreferences: typeof userPreferences
  ) => {
    try {
      await SecureStore.setItemAsync(
        "user_preferences",
        JSON.stringify(newPreferences)
      );
    } catch (error) {
      console.error("Error saving user preferences:", error);
    }
  };

  /**
   * Update user preferences and save to storage
   */
  const updateUserPreference = (
    key: keyof typeof userPreferences,
    value: boolean
  ) => {
    const newPreferences = { ...userPreferences, [key]: value };
    setUserPreferences(newPreferences);
    saveUserPreferences(newPreferences);
  };

  /**
   * Toggle the expanded state of a section
   * @param section - The section key to toggle
   */
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  /**
   * Handle notification setting changes
   * Updates state and logs changes to console
   * @param type - The type of notification (email, push, marketing)
   * @param value - The new boolean value
   */
  const handleNotificationToggle = async (type: string, value: boolean) => {
    console.log(`${type} notifications: ${value}`);
    switch (type) {
      case "email":
        updateUserPreference("emailNotifications", value);
        break;
      case "push":
        if (value) {
          // User wants to enable push notifications
          const granted = await requestNotificationPermission();
          if (granted) {
            updateUserPreference("pushNotifications", true);
            await sendTestNotification();
          } else {
            // Permission denied, keep toggle off
            updateUserPreference("pushNotifications", false);
          }
        } else {
          // User wants to disable push notifications
          updateUserPreference("pushNotifications", false);
          Alert.alert(
            "Push Notifications Disabled",
            "You can re-enable push notifications anytime in the settings.",
            [{ text: "OK" }]
          );
        }
        break;
      case "marketing":
        updateUserPreference("marketingNotifications", value);
        break;
    }
  };

  /**
   * Handle theme setting changes
   * Integrates with ThemeProvider to actually change the app theme
   * Only allows one theme to be active at a time
   * @param type - The theme type (light, dark, system)
   * @param value - The new boolean value
   */
  const handleThemeToggle = (type: string, value: boolean) => {
    console.log(`${type} theme: ${value}`);
    if (value) {
      setTheme(type as "light" | "dark" | "system");
    }
  };

  /**
   * Handle general setting changes
   * Updates state and logs changes to console
   * @param type - The setting type (autoSave, location, analytics)
   * @param value - The new boolean value
   */
  const handleGeneralToggle = async (type: string, value: boolean) => {
    console.log(`${type}: ${value}`);
    switch (type) {
      case "autoSave":
        updateUserPreference("autoSave", value);
        break;
      case "location":
        if (value) {
          // User wants to enable location services
          const granted = await requestLocationPermission();
          if (granted) {
            updateUserPreference("locationServices", true);
            await getCurrentLocation();
          } else {
            // Permission denied, keep toggle off
            updateUserPreference("locationServices", false);
          }
        } else {
          // User wants to disable location services
          updateUserPreference("locationServices", false);
          Alert.alert(
            "Location Services Disabled",
            "You can re-enable location services anytime in the settings.",
            [{ text: "OK" }]
          );
        }
        break;
      case "analytics":
        updateUserPreference("analytics", value);
        break;
    }
  };

  // Load user preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, []);

  // Get theme-aware colors for the main container
  const backgroundColor = useThemeColor({}, "background");

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <StyledText variant="titleLarge">Settings</StyledText>
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionsContainer}>
          {/* 
            NOTIFICATIONS SECTION
            Contains settings for different types of notifications
            - Email notifications for updates and alerts
            - Push notifications for instant device alerts
            - Marketing communications for promotional content
          */}
          <SettingSection
            title="Notifications"
            description="What you would like to be notified about"
            isExpanded={expandedSections.notifications}
            onToggle={() => toggleSection("notifications")}
          >
            <SettingItem
              title="Email Notifications"
              description="Receive updates and alerts via email"
              value={userPreferences.emailNotifications}
              onValueChange={(value) =>
                handleNotificationToggle("email", value)
              }
            />
            <SettingItem
              title="Push Notifications"
              description="Get instant notifications on your device"
              value={userPreferences.pushNotifications}
              onValueChange={(value) => handleNotificationToggle("push", value)}
            />
            <SettingItem
              title="Marketing Communications"
              description="Receive promotional content and offers"
              value={userPreferences.marketingNotifications}
              onValueChange={(value) =>
                handleNotificationToggle("marketing", value)
              }
            />
          </SettingSection>

          {/* 
            APPEARANCE SECTION
            Contains theme selection options
            - Dark theme for night viewing
            - Light theme for daytime viewing
            - System default to follow device settings
            Only one theme can be active at a time
          */}
          <SettingSection
            title="Appearance"
            description="How you want to see your app"
            isExpanded={expandedSections.appearance}
            onToggle={() => toggleSection("appearance")}
          >
            <SettingItem
              title="Dark Theme"
              description="Use dark colors for better night viewing"
              value={theme === "dark"}
              onValueChange={(value) => handleThemeToggle("dark", value)}
            />
            <SettingItem
              title="Light Theme"
              description="Use light colors for daytime viewing"
              value={theme === "light"}
              onValueChange={(value) => handleThemeToggle("light", value)}
            />
            <SettingItem
              title="System Default"
              description="Follow your device's theme setting"
              value={theme === "system"}
              onValueChange={(value) => handleThemeToggle("system", value)}
            />
          </SettingSection>

          {/* 
            GENERAL SECTION
            Contains general app settings
            - Auto save for progress preservation
            - Location services for app functionality
            - Analytics for app improvement data
          */}
          <SettingSection
            title="General"
            description="General settings for the app"
            isExpanded={expandedSections.general}
            onToggle={() => toggleSection("general")}
          >
            <SettingItem
              title="Auto Save"
              description="Automatically save your progress"
              value={userPreferences.autoSave}
              onValueChange={(value) => handleGeneralToggle("autoSave", value)}
            />
            <SettingItem
              title="Location Services"
              description="Allow app to access your location"
              value={userPreferences.locationServices}
              onValueChange={(value) => handleGeneralToggle("location", value)}
            />
            <SettingItem
              title="Analytics"
              description="Help improve the app with usage data"
              value={userPreferences.analytics}
              onValueChange={(value) => handleGeneralToggle("analytics", value)}
            />
          </SettingSection>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingScreen;

/**
 * Styles for the Settings Screen
 *
 * Features:
 * - Responsive layout with flex properties
 * - Modern card design with shadows and borders
 * - Proper spacing and typography
 * - Theme-aware colors (applied dynamically)
 * - Smooth animations and transitions
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  sectionsContainer: {
    padding: 8,
  },
  header: {
    padding: 16,
  },
});
