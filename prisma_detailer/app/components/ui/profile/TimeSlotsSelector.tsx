import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { Colors } from "../../../../constants/Colors";
import { useColorScheme } from "../../../../hooks/useColorScheme";
import { TimeSlot } from "../../../app-hooks/useAvailability";
import StyledText from "@/app/components/helpers/StyledText";

interface TimeSlotsSelectorProps {
  selectedDate: string;
  timeSlots: TimeSlot[];
  onTimeSlotToggle: (timeSlotId: string) => void;
}

const { width } = Dimensions.get("window");

export const TimeSlotsSelector: React.FC<TimeSlotsSelectorProps> = ({
  selectedDate,
  timeSlots,
  onTimeSlotToggle,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("dddd, MMMM D, YYYY");
  };

  const selectedSlots = timeSlots.filter((slot) => slot.isSelected);

  return (
    <View style={[styles.container, { backgroundColor: colors.cards }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="time-outline" size={20} color={colors.primary} />
        <StyledText variant="titleMedium">
          Available Times for {formatDate(selectedDate)}
        </StyledText>
      </View>

      {/* Selected count */}
      <StyledText variant="bodySmall">
        {selectedSlots.length} time slot{selectedSlots.length !== 1 ? "s" : ""}{" "}
        selected
      </StyledText>

      {/* Time slots grid */}
      <ScrollView
        style={styles.timeSlotsContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View style={styles.timeSlotsGrid}>
          {timeSlots.map((slot) => (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.timeSlot,
                {
                  backgroundColor: slot.isSelected
                    ? colors.primary
                    : colors.background,
                  borderColor: slot.isSelected
                    ? colors.primary
                    : colors.borders,
                },
              ]}
              onPress={() => onTimeSlotToggle(slot.id)}
            >
              <StyledText
                style={[
                  styles.timeText,
                  {
                    color: slot.isSelected ? colors.buttonText : colors.text,
                    fontWeight: slot.isSelected ? "600" : "500",
                  },
                ]}
              >
                {slot.time}
              </StyledText>
              {slot.isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.buttonText}
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Quick selection buttons */}
      <View style={styles.quickSelectionContainer}>
        <TouchableOpacity
          style={[
            styles.quickButton,
            { backgroundColor: colors.secondaryButton },
          ]}
          onPress={() => {
            // Select all morning slots (6:00 - 12:00)
            timeSlots.forEach((slot) => {
              const hour = parseInt(slot.time.split(":")[0]);
              if (hour >= 6 && hour < 12 && !slot.isSelected) {
                onTimeSlotToggle(slot.id);
              }
            });
          }}
        >
          <StyledText variant="bodySmall">Morning</StyledText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickButton,
            { backgroundColor: colors.secondaryButton },
          ]}
          onPress={() => {
            // Select all afternoon slots (12:00 - 18:00)
            timeSlots.forEach((slot) => {
              const hour = parseInt(slot.time.split(":")[0]);
              if (hour >= 12 && hour < 18 && !slot.isSelected) {
                onTimeSlotToggle(slot.id);
              }
            });
          }}
        >
          <StyledText variant="bodySmall">Afternoon</StyledText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickButton,
            { backgroundColor: colors.secondaryButton },
          ]}
          onPress={() => {
            // Select all evening slots (18:00 - 20:00)
            timeSlots.forEach((slot) => {
              const hour = parseInt(slot.time.split(":")[0]);
              if (hour >= 18 && hour <= 20 && !slot.isSelected) {
                onTimeSlotToggle(slot.id);
              }
            });
          }}
        >
          <StyledText variant="bodySmall">Evening</StyledText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 3,
    padding: 10,
    marginHorizontal: 5,
    marginVertical: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  selectedCount: {
    fontSize: 14,
    marginBottom: 16,
  },
  timeSlotsContainer: {
    maxHeight: 200,
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  timeSlot: {
    width: (width - 80) / 3,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkIcon: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  quickSelectionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  quickButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
