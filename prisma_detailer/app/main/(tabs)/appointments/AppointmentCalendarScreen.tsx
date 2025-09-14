import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from "react-native";
import React from "react";
import dayjs from "dayjs";
import StyledText from "@/app/components/helpers/StyledText";
import { useAppointment } from "@/app/app-hooks/useAppointment";
import { useThemeColor } from "@/hooks/useThemeColor";

/**
 * AppointmentCalendarScreen Component
 *
 * This component displays a Google Calendar-like interface with:
 * - Horizontal scrollable month selector (Jan-Dec)
 * - Calendar grid showing days of the selected month
 * - Navigation to daily view when a day is clicked
 *
 * Features:
 * - Month navigation with visual indicators
 * - Today highlighting with blue border
 * - Selected day highlighting with blue background
 * - Appointment indicators (red dots with counts)
 * - Responsive design that fills available screen space
 */

const AppointmentCalendarScreen = () => {
  const {
    selectedMonth,
    selectedDay,
    months,
    calendarDays,
    selectDay,
    navigateToMonth,
  } = useAppointment();

  // Get screen dimensions for responsive design
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;

  // Import the colors
  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "cards");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "borders");

  // Calculate dynamic heights for calendar components
  const monthSelectorHeight = 50; // Fixed height for month selector
  const headerHeight = 30; // Fixed height for month/year display
  const weekdayHeaderHeight = 30; // Fixed height for weekday headers
  const padding = 32; // Total padding (16 top + 16 bottom)

  // Calculate available height for calendar grid
  const availableHeight =
    screenHeight -
    monthSelectorHeight -
    headerHeight -
    weekdayHeaderHeight -
    padding;

  // Calculate day item height (6 rows for calendar weeks)
  const dayItemHeight = Math.max(availableHeight / 6, 50); // Minimum 50px height

  /**
   * Render individual day in the calendar grid
   *
   * @param item - Calendar day data object
   * @returns TouchableOpacity component for each day
   */
  const renderDayItem = ({ item }: { item: any }) => {
    const isCurrentMonth = dayjs(item.date).isSame(selectedMonth, "month");

    return (
      <TouchableOpacity
        style={[
          styles.dayItem,
          {
            height: dayItemHeight,
            width: (screenWidth - 32) / 7,
            backgroundColor,
            borderColor: borderColor,
            shadowColor: textColor,
          },
          !isCurrentMonth && styles.otherMonthDay,
          item.isToday && {
            backgroundColor: tintColor,
            borderColor: borderColor,
          },
          item.isSelected && {
            backgroundColor: tintColor,
          },
        ]}
        onPress={() => selectDay(dayjs(item.date))}
        disabled={!isCurrentMonth}
      >
        <StyledText
          style={[
            !isCurrentMonth && styles.otherMonthDayText,
            item.isToday && styles.todayText,
            item.isSelected && styles.selectedDayText,
          ]}
          variant="bodyMedium"
        >
          {item.day}
        </StyledText>
        {item.hasAppointments && (
          <View style={styles.appointmentIndicator}>
            <StyledText style={styles.appointmentCount}>
              {item.appointmentCount}
            </StyledText>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Render weekday headers (Sun, Mon, Tue, etc.)
   *
   * @returns View component with weekday labels
   */
  const renderWeekdayHeader = () => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <View style={[styles.weekdayHeader, { height: weekdayHeaderHeight }]}>
        {weekdays.map((day, index) => (
          <View
            key={index}
            style={[styles.weekdayItem, { width: (screenWidth - 32) / 7 }]}
          >
            <StyledText variant="bodyMedium">{day}</StyledText>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Month Selector - Horizontal scrollable months */}
      <View
        style={[styles.monthSelectorContainer, { height: monthSelectorHeight }]}
      >
        <StyledText variant="titleMedium">Select Month</StyledText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthSelector}
        >
          {months.map((month, index) => (
            <TouchableOpacity
              key={index}
              /* Define the styles for the months.
               * This style is to handle the display for the current month, selected month and the other months. */
              style={[
                styles.monthItem,
                {
                  backgroundColor: cardColor,
                  shadowColor: tintColor,
                  borderColor: borderColor,
                },
                month.isSelected && {
                  backgroundColor: tintColor,
                  borderColor: borderColor,
                },
                month.isCurrent && {
                  backgroundColor: tintColor,
                  borderColor: borderColor,
                },
              ]}
              onPress={() => navigateToMonth(month.value)}
            >
              <StyledText
                style={[
                  month.isSelected && styles.selectedMonthText,
                  month.isCurrent && styles.currentMonthText,
                ]}
                variant="bodyMedium"
              >
                {month.name}
              </StyledText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Current Month Display - Shows selected month and year */}
      <View style={[styles.currentMonthContainer, { height: headerHeight }]}>
        <StyledText variant="titleMedium">
          {selectedMonth.format("MMMM YYYY")}
        </StyledText>
      </View>

      {/* Calendar Grid - Main calendar with days */}
      <View style={styles.calendarContainer}>
        {renderWeekdayHeader()}
        <FlatList
          data={calendarDays}
          renderItem={renderDayItem}
          keyExtractor={(item) => item.date}
          numColumns={7}
          scrollEnabled={false}
          contentContainerStyle={styles.calendarGrid}
        />
      </View>
    </ScrollView>
  );
};

export default AppointmentCalendarScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 5,
  },

  // Month Selector Styles
  monthSelectorContainer: {
    marginBottom: 20,
  },
  monthSelector: {
    paddingHorizontal: 8,
  },
  monthItem: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginHorizontal: 4,
    borderRadius: 10,
    minWidth: 60,
    alignItems: "center",
    borderWidth: 1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    elevation: 3,
  },
  selectedMonthItem: {
    borderWidth: 2,
  },
  currentMonthItem: {
    borderWidth: 1,
  },
  selectedMonthText: {
    color: "#fff",
  },
  currentMonthText: {
    color: "black",
  },

  currentMonthContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  calendarContainer: {
    flex: 1,
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekdayItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  calendarGrid: {
    flexGrow: 1,
  },
  dayItem: {
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
    borderRadius: 3,
    position: "relative",
    maxHeight:70,
    borderWidth:1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
  },
  otherMonthDay: {
    backgroundColor: "gray",
  },
  todayItem: {
    borderWidth: 2,
  },
  otherMonthDayText: {
    color: "#ccc",
  },
  todayText: {
    fontWeight: "bold",
  },
  selectedDayText: {
    fontWeight: "bold",
  },
  appointmentIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#ff4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentCount: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },

  // Selected Day Info
  selectedDayInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    alignItems: "center",
  },
  selectedDayInfoText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
  },
});
