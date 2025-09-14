import { useState, useCallback } from "react";
import dayjs from "dayjs";

export interface TimeSlot {
  id: string;
  time: string;
  isSelected: boolean;
}

export interface AvailabilityDate {
  date: string; // YYYY-MM-DD format
  timeSlots: TimeSlot[];
  isSelected: boolean;
}

export interface AvailabilityState {
  selectedDates: AvailabilityDate[];
  currentMonth: dayjs.Dayjs;
  currentYear: number;
}

const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 6; hour <= 20; hour++) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    slots.push({
      id: `${hour}-00`,
      time,
      isSelected: false,
    });
  }
  return slots;
};

const generateMonthDays = (year: number, month: number): dayjs.Dayjs[] => {
  const days: dayjs.Dayjs[] = [];
  const firstDay = dayjs().year(year).month(month).startOf("month");
  const lastDay = dayjs().year(year).month(month).endOf("month");

  // Add days from previous month to fill first week
  const startDate = firstDay.startOf("week");
  const endDate = lastDay.endOf("week");

  let currentDate = startDate;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
    days.push(currentDate);
    currentDate = currentDate.add(1, "day");
  }

  return days;
};

export const useAvailability = () => {
  const [state, setState] = useState<AvailabilityState>({
    selectedDates: [],
    currentMonth: dayjs(),
    currentYear: dayjs().year(),
  });

  const [selectedTimeSlots, setSelectedTimeSlots] = useState<
    Record<string, string[]>
  >({});

  /**
   * Navigate to the previous month
   */
  const goToPreviousMonth = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentMonth: prev.currentMonth.subtract(1, "month"),
      currentYear: prev.currentMonth.subtract(1, "month").year(),
    }));
  }, []);

  /**
   * Navigate to the next month
   */
  const goToNextMonth = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentMonth: prev.currentMonth.add(1, "month"),
      currentYear: prev.currentMonth.add(1, "month").year(),
    }));
  }, []);

  /**
   * Navigate to a specific month and year
   */
  const goToMonth = useCallback((month: number, year: number) => {
    setState((prev) => ({
      ...prev,
      currentMonth: dayjs().year(year).month(month),
      currentYear: year,
    }));
  }, []);

  /**
   * Toggle date selection
   */
  const toggleDateSelection = useCallback((date: string) => {
    setState((prev) => {
      const existingDate = prev.selectedDates.find((d) => d.date === date);

      if (existingDate) {
        // Remove date if already selected
        return {
          ...prev,
          selectedDates: prev.selectedDates.filter((d) => d.date !== date),
        };
      } else {
        // Add new date with default time slots
        const newDate: AvailabilityDate = {
          date,
          timeSlots: generateTimeSlots(),
          isSelected: true,
        };

        return {
          ...prev,
          selectedDates: [...prev.selectedDates, newDate],
        };
      }
    });
  }, []);

  /**
   * Toggle time slot selection for a specific date
   */
  const toggleTimeSlot = useCallback((date: string, timeSlotId: string) => {
    setState((prev) => {
      const updatedDates = prev.selectedDates.map((selectedDate) => {
        if (selectedDate.date === date) {
          const updatedTimeSlots = selectedDate.timeSlots.map((slot) => {
            if (slot.id === timeSlotId) {
              const updatedSlot = { ...slot, isSelected: !slot.isSelected };
              return updatedSlot;
            }
            return slot;
          });

          return {
            ...selectedDate,
            timeSlots: updatedTimeSlots,
          };
        }
        return selectedDate;
      });

      return {
        ...prev,
        selectedDates: updatedDates,
      };
    });
  }, []);

  /**
   * Get all days for the current month view
   */
  const getMonthDays = useCallback(() => {
    return generateMonthDays(state.currentYear, state.currentMonth.month());
  }, [state.currentYear, state.currentMonth]);

  /**
   * Check if a date is selected
   */
  const isDateSelected = useCallback(
    (date: string) => {
      return state.selectedDates.some((d) => d.date === date);
    },
    [state.selectedDates]
  );

  /**
   * Get selected time slots for a specific date
   */
  const getSelectedTimeSlots = useCallback(
    (date: string) => {
      const selectedDate = state.selectedDates.find((d) => d.date === date);
      return selectedDate?.timeSlots.filter((slot) => slot.isSelected) || [];
    },
    [state.selectedDates]
  );

  /**
   * Get all selected dates with their time slots
   */
  const getAllSelectedAvailabilities = useCallback(() => {
    return state.selectedDates.map((date) => ({
      date: date.date,
      timeSlots: date.timeSlots
        .filter((slot) => slot.isSelected)
        .map((slot) => slot.time),
    }));
  }, [state.selectedDates]);

  /**
   * Clear all selections
   */
  const clearAllSelections = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedDates: [],
    }));    
  }, []);

  /**
   * Get current month and year for display
   */
  const getCurrentMonthYear = useCallback(() => {
    return {
      month: state.currentMonth.format("MMMM"),
      year: state.currentYear,
    };
  }, [state.currentMonth, state.currentYear]);

  return {
    // State
    selectedDates: state.selectedDates,
    currentMonth: state.currentMonth,
    currentYear: state.currentYear,

    // Navigation methods
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,

    // Selection methods
    toggleDateSelection,
    toggleTimeSlot,
    isDateSelected,

    // Utility methods
    getMonthDays,
    getSelectedTimeSlots,
    getAllSelectedAvailabilities,
    clearAllSelections,
    getCurrentMonthYear,
  };
};
