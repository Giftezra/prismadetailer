import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import StyledText from "@/app/components/helpers/StyledText";
import StyledButton from "@/app/components/helpers/StyledButton";
import { QuickActionProps } from "@/app/interfaces/DashboardInterface";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

interface QuickActionsCardProps {
  actions: QuickActionProps[];
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ actions }) => {
  const backgroundColor = useThemeColor({}, "cards");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borders");

  const handleAction = (action: QuickActionProps) => {
    // Execute the action function directly
    if (action.action) {
      action.action();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <StyledText variant="titleMedium" style={{ color: textColor }}>
          Quick Actions
        </StyledText>
        <StyledText
          variant="bodySmall"
          style={{ color: textColor, opacity: 0.7 }}
        >
          Common tasks
        </StyledText>
      </View>

      <View style={styles.actionsGrid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={() => handleAction(action)}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={[backgroundColor, borderColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContainer}
            >
              <View style={styles.actionContent}>
                <StyledText
                  variant="titleMedium"
                  style={{
                    color: "white",
                    marginBottom: 4,
                  }}
                >
                  {action.icon}
                </StyledText>
                <StyledText
                  variant="labelSmall"
                  style={{
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  {action.title}
                </StyledText>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 3,
    padding: 10,
    marginHorizontal: 5,
    marginVertical: 10,
    borderWidth: 1,
  },
  header: {
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: "48%",
    marginBottom: 12,
    minHeight: 80,
    borderRadius: 8,
    overflow: "hidden",
  },
  gradientContainer: {
    flex: 1,
    borderRadius: 8,
  },
  actionContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 12,
  },
});

export default QuickActionsCard;
