import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Colors } from "../../../../constants/Colors";
import { useColorScheme } from "../../../../hooks/useColorScheme";
import { AvailabilityDate } from "../../../app-hooks/useAvailability";
import StyledText from "@/app/components/helpers/StyledText";

interface AvailabilitySummaryProps {
  selectedDates: AvailabilityDate[];
  onClearAll: () => void;
}

export const AvailabilitySummary: React.FC<AvailabilitySummaryProps> = ({
  selectedDates,
  onClearAll,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const totalSelectedSlots = selectedDates.reduce((total, date) => {
    return total + date.timeSlots.filter((slot) => slot.isSelected).length;
  }, 0);

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("MMM D, YYYY");
  };

  const formatTimeSlots = (
    timeSlots: { time: string; isSelected: boolean }[]
  ) => {
    const selectedSlots = timeSlots
      .filter((slot) => slot.isSelected)
      .map((slot) => slot.time);
    if (selectedSlots.length === 0) return "No times selected";
    if (selectedSlots.length <= 3) return selectedSlots.join(", ");
    return `${selectedSlots.slice(0, 3).join(", ")} +${
      selectedSlots.length - 3
    } more`;
  };

  if (selectedDates.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cards }]}>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={colors.icons} />
          <StyledText variant="titleMedium">No dates selected</StyledText>
          <StyledText variant="bodySmall">
            Select dates from the calendar above to set your availability
          </StyledText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cards }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <StyledText variant="titleMedium">Selected Availability</StyledText>
        </View>
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: colors.error }]}
          onPress={onClearAll}
        >
          <Ionicons name="trash-outline" size={16} color={colors.buttonText} />
          <StyledText variant="bodySmall">Clear All</StyledText>
        </TouchableOpacity>
      </View>

      {/* Summary stats */}
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <StyledText variant="titleMedium">{selectedDates.length}</StyledText>
          <StyledText variant="bodySmall">
            Date{selectedDates.length !== 1 ? "s" : ""}
          </StyledText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <StyledText variant="titleMedium">{totalSelectedSlots}</StyledText>
          <StyledText variant="bodySmall">
            Time Slot{totalSelectedSlots !== 1 ? "s" : ""}
          </StyledText>
        </View>
      </View>

      {/* Selected dates list */}
      <ScrollView style={styles.datesList} showsVerticalScrollIndicator={false}>
        {selectedDates.map((date) => (
          <View key={date.date} style={styles.dateItem}>
            <View style={styles.dateHeader}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <StyledText variant="bodySmall">
                {formatDate(date.date)}
              </StyledText>
            </View>
            <StyledText variant="bodySmall">
              {formatTimeSlots(date.timeSlots)}
            </StyledText>
          </View>
        ))}
      </ScrollView>

      {/* Console log button for debugging */}
      <TouchableOpacity
        style={[
          styles.debugButton,
          { backgroundColor: colors.secondaryButton },
        ]}
        onPress={() => {
          // AVAILABILITY SUMMARY
          selectedDates.forEach((date) => {
            const selectedTimes = date.timeSlots
              .filter((slot) => slot.isSelected)
              .map((slot) => slot.time);
            // Log date and selected times
          });
          // End availability summary
        }}
      >
        <Ionicons name="code-outline" size={16} color={colors.buttonText} />
        <StyledText variant="bodySmall">Log to Console</StyledText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 3,
    padding: 10,
    marginHorizontal: 5,
    marginVertical: 5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  datesList: {
    maxHeight: 200,
  },
  dateItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  timeSlotsText: {
    fontSize: 12,
    marginLeft: 24,
  },
  debugButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});
