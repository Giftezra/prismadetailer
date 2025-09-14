/**
 * SettingItem Component
 *
 * Renders an individual setting with:
 * - Title and description text
 * - Toggle switch on the right side
 * - Theme-aware styling for text and borders
 * - Proper spacing and layout
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ToggleComponent from "./ToggleComponent";
import { useThemeColor } from "@/hooks/useThemeColor";
import StyledText from "@/app/components/helpers/StyledText";

/**
 * Props interface for individual setting items
 * Each setting item displays a title, description, and toggle switch
 */
interface SettingItemProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingItem = ({
  title,
  description,
  value,
  onValueChange,
}: SettingItemProps) => {
  // Get theme-aware colors for dynamic styling
  const textColor = useThemeColor({}, "text");

  return (
    <View
      style={[
        styles.settingItem,
        { borderBottomColor: useThemeColor({}, "borders") },
      ]}
    >
      <View style={styles.settingTextContainer}>
        <StyledText variant="labelLarge">{title}</StyledText>
        <StyledText variant="bodySmall" style={styles.settingDescription}>{description}</StyledText>
      </View>
      <ToggleComponent
        label=""
        value={value}
        onValueChange={onValueChange}
        size="small"
      />
    </View>
  );
};

export default SettingItem;

const styles = StyleSheet.create({
  // Individual setting item container
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  // Container for setting text (title and description)
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  // Setting title styling
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 10,
    lineHeight: 18,
  },
});
