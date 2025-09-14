import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAvailability } from "../../../app-hooks/useAvailability";
import { AvailabilityCalendar } from "../../../components/ui/profile/AvailabilityCalendar";
import { TimeSlotsSelector } from "../../../components/ui/profile/TimeSlotsSelector";
import { AvailabilitySummary } from "../../../components/ui/profile/AvailabilitySummary";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useThemeContext } from "@/app/contexts/ThemeProvider";
import StyledText from "@/app/components/helpers/StyledText";

const AvailabilityScreen = () => {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const primaryColor = useThemeColor({}, "primary");
  const iconColor = useThemeColor({}, "icons");
  const { theme } = useThemeContext();
  const {
    selectedDates,
    currentMonth,
    currentYear,
    goToPreviousMonth,
    goToNextMonth,
    toggleDateSelection,
    toggleTimeSlot,
    getMonthDays,
    clearAllSelections,
  } = useAvailability();

  const [selectedDateForTimeSlots, setSelectedDateForTimeSlots] = useState<
    string | null
  >(null);

  const handleDatePress = (date: string) => {
    toggleDateSelection(date);
    setSelectedDateForTimeSlots(date);
  };

  const handleTimeSlotToggle = (timeSlotId: string) => {
    if (selectedDateForTimeSlots) {
      toggleTimeSlot(selectedDateForTimeSlots, timeSlotId);
    }
  };

  const getSelectedDateTimeSlots = () => {
    if (!selectedDateForTimeSlots) return [];
    const selectedDate = selectedDates.find(
      (d) => d.date === selectedDateForTimeSlots
    );
    return selectedDate?.timeSlots || [];
  };

  const selectedDatesStrings = selectedDates.map((date) => date.date);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: backgroundColor }]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="calendar-outline" size={24} color={primaryColor} />
          <StyledText variant="titleMedium">Set Availability</StyledText>
        </View>
        <StyledText variant="bodySmall">
          Select dates and times when you're available
        </StyledText>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Calendar Component */}
        <AvailabilityCalendar
          currentMonth={currentMonth}
          currentYear={currentYear}
          monthDays={getMonthDays()}
          selectedDates={selectedDatesStrings}
          onDatePress={handleDatePress}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
        />

        {/* Time Slots Selector - Only show when a date is selected */}
        {selectedDateForTimeSlots && (
          <TimeSlotsSelector
            selectedDate={selectedDateForTimeSlots}
            timeSlots={getSelectedDateTimeSlots()}
            onTimeSlotToggle={handleTimeSlotToggle}
          />
        )}

        {/* Availability Summary */}
        <AvailabilitySummary
          selectedDates={selectedDates}
          onClearAll={clearAllSelections}
        />

        {/* Instructions */}
        <View
          style={[
            styles.instructionsContainer,
            { backgroundColor: backgroundColor },
          ]}
        >
          <View style={styles.instructionsHeader}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={primaryColor}
            />
            <StyledText variant="titleMedium">How to use</StyledText>
          </View>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={primaryColor}
              />
              <StyledText variant="bodySmall">
                Tap on dates in the calendar to select them
              </StyledText>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={primaryColor}
              />
              <StyledText variant="bodySmall">
                Select time slots for each chosen date
              </StyledText>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={primaryColor}
              />
              <StyledText variant="bodySmall">
                Use quick selection buttons for faster setup
              </StyledText>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={primaryColor}
              />
              <StyledText variant="bodySmall">
                Navigate between months using arrow buttons
              </StyledText>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AvailabilityScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    paddingTop: 5,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  instructionsContainer: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  instructionsList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  instructionText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});
