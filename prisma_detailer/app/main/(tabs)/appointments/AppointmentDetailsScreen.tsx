import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useThemeColor } from "@/hooks/useThemeColor";
import StyledText from "@/app/components/helpers/StyledText";
import { Ionicons } from "@expo/vector-icons";
import StyledButton from "@/app/components/helpers/StyledButton";
import LinearGradientComponent from "@/app/components/helpers/LinearGradientComponent";
import { JobDetailsProps } from "@/app/interfaces/AppointmentInterface";
import { useAppointment } from "@/app/app-hooks/useAppointment";
import { formatCurrency } from "@/app/utils/converters";

/**
 * AppointmentDetailsScreen Component
 *
 * This component displays detailed information about a specific appointment.
 * It shows comprehensive job details including client information, service details,
 * pricing, timing, and status. The data is passed via route parameters from the
 * time slot selection.
 *
 * Features:
 * - Client information display
 * - Service details with description
 * - Pricing and duration information
 * - Appointment timing details
 * - Status indicator with color coding
 * - Back navigation
 * - Simulated data for demonstration
 *
 * Navigation:
 * - Receives job data via route parameters
 * - Provides back navigation to daily view
 * - Ready for action buttons (accept, start, complete, etc.)
 */

const AppointmentDetailsScreen = () => {
  const {
    isLoadingAppointmentDetails,
    handleAcceptAppointment,
    handleCancelAppointment,
    handleCompleteAppointment,
    handleStartAppointment,
  } = useAppointment();
  const params = useLocalSearchParams();
  const appointmentDetails = params.appointmentDetails
    ? JSON.parse(params.appointmentDetails as string)
    : null;

  const backgroundColor = useThemeColor({}, "background");
  const cardColor = useThemeColor({}, "cards");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "borders");

  /**
   * Get status style based on job status
   *
   * Returns the appropriate style object for different job statuses.
   * Each status has a unique color scheme for visual distinction.
   *
   * @param status - Job status string (pending, accepted, in_progress, completed, cancelled)
   * @returns Style object for the status badge
   */
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return styles.statusPending;
      case "accepted":
        return styles.statusAccepted;
      case "in_progress":
        return styles.statusInProgress;
      case "completed":
        return styles.statusCompleted;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  /**
   * Get status icon based on job status
   *
   * Returns the appropriate Ionicons icon for different job statuses.
   *
   * @param status - Job status string
   * @returns Icon name for the status
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "accepted":
        return "checkmark-circle-outline";
      case "in_progress":
        return "play-circle-outline";
      case "completed":
        return "checkmark-done-circle-outline";
      case "cancelled":
        return "close-circle-outline";
      default:
        return "time-outline";
    }
  };
  /**
   * Render action buttons based on current status
   *
   * Displays different action buttons depending on the appointment status.
   * Each status has appropriate actions that can be performed.
   *
   * @returns View component with action buttons
   */
  const renderActionButtons = () => {
    switch (appointmentDetails?.status) {
      case "pending":
        return (
          <View style={styles.sleekButtonContainer}>
            <StyledButton
              key="accept"
              variant="tonal"
              onPress={() => handleAcceptAppointment(appointmentDetails.id)}
              style={[styles.sleekActionButton, styles.sleekAcceptButton]}
            >
              <StyledText variant="labelMedium" style={styles.sleekButtonText}>
                Accept
              </StyledText>
            </StyledButton>
            <StyledButton
              key="decline"
              variant="tonal"
              onPress={() => handleCancelAppointment(appointmentDetails.id)}
              style={[styles.sleekActionButton, styles.sleekCancelButton]}
            >
              <StyledText variant="labelMedium" style={styles.sleekButtonText}>
                Decline
              </StyledText>
            </StyledButton>
          </View>
        );
      case "accepted":
        return (
          <View style={styles.buttonContainer}>
            <StyledButton
              key="start"
              variant="small"
              onPress={() => handleStartAppointment(appointmentDetails.id)}
              style={[styles.actionButton, styles.startButton]}
            >
              <StyledText variant="labelLarge" style={{ color: "white" }}>
                Start Job
              </StyledText>
            </StyledButton>
            <StyledButton
              key="cancel"
              variant="small"
              onPress={() => handleCancelAppointment(appointmentDetails.id)}
              style={[styles.actionButton, styles.cancelButton]}
            >
              <StyledText variant="labelLarge" style={{ color: "white" }}>
                Cancel Job
              </StyledText>
            </StyledButton>
          </View>
        );
      case "in_progress":
        return (
          <View style={styles.buttonContainer}>
            <StyledButton
              key="complete"
              variant="tonal"
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleCompleteAppointment(appointmentDetails.id)}
            >
              <Ionicons name="checkmark-done" size={20} color="white" />
              <StyledText variant="labelLarge" style={{ color: "white" }}>
                Complete Job
              </StyledText>
            </StyledButton>
          </View>
        );
      case "completed":
        return (
          <View style={styles.completedMessage}>
            <Ionicons name="checkmark-done-circle" size={24} color="#28a745" />
            <StyledText variant="labelLarge">
              Job completed successfully
            </StyledText>
          </View>
        );
      case "cancelled":
        return (
          <View style={styles.completedMessage}>
            <Ionicons name="close-circle" size={24} color="#dc3545" />
            <StyledText variant="labelLarge">Job was cancelled</StyledText>
          </View>
        );
      default:
        return null;
    }
  };

  if (isLoadingAppointmentDetails) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color={tintColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: cardColor, borderBottomColor: borderColor },
        ]}
      >
        <View style={styles.headerContent}>
          <StyledText variant="titleMedium" style={{ color: textColor }}>
            Job Details
          </StyledText>
          <StyledText variant="bodySmall" style={{ color: textColor }}>
            #{appointmentDetails?.booking_reference}
          </StyledText>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <View style={styles.statusContainer}>
            <Ionicons
              name={getStatusIcon(appointmentDetails?.status || "")}
              size={20}
              color={getStatusStyle(appointmentDetails?.status || "").color}
            />
            <View style={styles.statusTextContainer}>
              <StyledText variant="bodySmall">Status</StyledText>
              <StyledText
                variant="bodySmall"
                style={[
                  getStatusStyle(appointmentDetails?.status || ""),
                  {
                    width: 100,
                    borderRadius: 10,
                    marginTop: 5,
                    padding: 5,
                    color: getStatusStyle(appointmentDetails?.status || "")
                      .color,
                    textAlign: "center",
                  },
                ]}
              >
                {appointmentDetails?.status.replace("_", " ").toUpperCase()}
              </StyledText>
            </View>
          </View>
        </LinearGradientComponent>

        {/* Client Information */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <StyledText variant="labelMedium">Client Information</StyledText>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.client_name}
              </StyledText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.client_phone}
              </StyledText>
            </View>
          </View>
        </LinearGradientComponent>

        {/* Vehicle Information */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <StyledText variant="labelMedium">Vehicle Information</StyledText>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="car" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.vehicle_year}{" "}
                {appointmentDetails?.vehicle_make}{" "}
                {appointmentDetails?.vehicle_model}
              </StyledText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="color-palette" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.vehicle_color}
              </StyledText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="card" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.vehiclie_license}
              </StyledText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="water" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.valet_type}
              </StyledText>
            </View>
          </View>
        </LinearGradientComponent>

        {/* Location Information */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <StyledText variant="labelMedium">Location</StyledText>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.address}
              </StyledText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.city}, {appointmentDetails?.post_code}
              </StyledText>
            </View>
          </View>
        </LinearGradientComponent>

        {/* Service Details */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <StyledText variant="labelMedium">Service Details</StyledText>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="car" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.service_type.name}
              </StyledText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="list" size={15} color={tintColor} />
              <View style={styles.descriptionContainer}>
                {appointmentDetails?.service_type.description.map(
                  (desc: string, index: number) => (
                    <StyledText
                      key={index}
                      variant="bodyMedium"
                      style={styles.descriptionItem}
                    >
                      • {desc}
                    </StyledText>
                  )
                )}
              </View>
            </View>
          </View>
        </LinearGradientComponent>

        {/* Timing & Pricing */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <StyledText variant="labelMedium">Timing & Pricing</StyledText>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.appointment_time} (
                {appointmentDetails?.duration} minutes)
              </StyledText>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {formatCurrency(appointmentDetails?.service_type.price || 0)}
              </StyledText>
            </View>
          </View>
        </LinearGradientComponent>

        {/* Addons */}
        {appointmentDetails?.addons && appointmentDetails.addons.length > 0 && (
          <LinearGradientComponent
            color1={cardColor}
            color2={textColor}
            start={{ x: 0, y: 0 }}
            end={{ x: 3, y: 1 }}
            style={[styles.card, { borderColor }]}
          >
            <StyledText variant="labelMedium">Addons</StyledText>
            <View style={styles.infoContainer}>
              {appointmentDetails.addons.map((addon: string, index: number) => (
                <View key={index} style={styles.infoRow}>
                  <Ionicons name="add-circle" size={15} color={tintColor} />
                  <StyledText variant="bodyMedium">{addon}</StyledText>
                </View>
              ))}
            </View>
          </LinearGradientComponent>
        )}

        {/* Loyalty Information */}
        {(appointmentDetails?.loyalty_tier ||
          appointmentDetails?.loyalty_benefits) && (
          <LinearGradientComponent
            color1={cardColor}
            color2={textColor}
            start={{ x: 0, y: 0 }}
            end={{ x: 3, y: 1 }}
            style={[styles.card, { borderColor }]}
          >
            <StyledText variant="labelMedium">Loyalty Information</StyledText>
            <View style={styles.infoContainer}>
              {appointmentDetails?.loyalty_tier && (
                <View style={styles.infoRow}>
                  <Ionicons name="star" size={15} color={tintColor} />
                  <StyledText variant="bodyMedium">
                    Tier:{" "}
                    {appointmentDetails.loyalty_tier.charAt(0).toUpperCase() +
                      appointmentDetails.loyalty_tier.slice(1)}
                  </StyledText>
                </View>
              )}
              {appointmentDetails?.loyalty_benefits &&
                appointmentDetails.loyalty_benefits.length > 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons name="gift" size={15} color={tintColor} />
                    <View style={styles.descriptionContainer}>
                      {appointmentDetails.loyalty_benefits.map(
                        (benefit: string, index: number) => (
                          <StyledText
                            key={index}
                            variant="bodyMedium"
                            style={styles.descriptionItem}
                          >
                            • {benefit}
                          </StyledText>
                        )
                      )}
                    </View>
                  </View>
                )}
            </View>
          </LinearGradientComponent>
        )}

        {/* Notes */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <StyledText variant="labelMedium">Notes</StyledText>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="document-text" size={15} color={tintColor} />
              <StyledText variant="bodyMedium">
                {appointmentDetails?.special_instruction ||
                  "No special instructions"}
              </StyledText>
            </View>
          </View>
        </LinearGradientComponent>

        {/* Before & After Images */}
        <LinearGradientComponent
          color1={cardColor}
          color2={textColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 1 }}
          style={[styles.card, { borderColor }]}
        >
          <StyledText variant="labelMedium">Before & After Images</StyledText>

          {/* Before Images */}
          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <Ionicons name="images" size={20} color={tintColor} />
              <StyledText variant="bodySmall">Before Images</StyledText>
            </View>
            <View style={styles.imageGrid}>
              {appointmentDetails?.before_images ? (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image" size={32} color={tintColor} />
                  <StyledText variant="bodySmall">Before Image</StyledText>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, { borderColor }]}
                  onPress={() => {
                    /* Upload before image */
                  }}
                >
                  <Ionicons name="camera" size={24} color={tintColor} />
                  <StyledText variant="bodySmall">Add Before Image</StyledText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* After Images */}
          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <Ionicons name="images" size={20} color={tintColor} />
              <StyledText variant="bodySmall">After Images</StyledText>
            </View>
            <View style={styles.imageGrid}>
              {appointmentDetails?.after_images ? (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image" size={32} color={tintColor} />
                  <StyledText variant="bodySmall">After Image</StyledText>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadButton, { borderColor }]}
                  onPress={() => {
                    /* Upload after image */
                  }}
                >
                  <Ionicons name="camera" size={24} color={tintColor} />
                  <StyledText variant="bodySmall">Add After Image</StyledText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradientComponent>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {renderActionButtons()}
        </View>
      </ScrollView>
    </View>
  );
};

export default AppointmentDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 5,
  },
  card: {
    borderRadius: 5,
    padding: 10,
    marginBottom: 5,
    borderWidth: 1,
    gap: 5,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusPending: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  statusAccepted: {
    backgroundColor: "#d1ecf1",
    color: "#0c5460",
  },
  statusInProgress: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  statusCompleted: {
    backgroundColor: "#c3e6cb",
    color: "#155724",
  },
  statusCancelled: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoContainer: {
    paddingHorizontal: 10,
    gap: 5,
  },
  descriptionContainer: {
    flex: 1,
    marginLeft: 10,
  },
  descriptionItem: {
    marginBottom: 2,
  },
  actionButtonsContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 12,
  },
  modernButtonContainer: {
    gap: 16,
    paddingHorizontal: 4,
  },
  sleekButtonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sleekActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 0,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modernActionButton: {
    padding: 0,
    borderRadius: 16,
    marginBottom: 0,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    width: "100%",
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  sleekButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 14,
  },
  modernButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 2,
  },
  modernButtonSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  modernAcceptButton: {
    backgroundColor: "#10B981",
  },
  sleekAcceptButton: {
    backgroundColor: "#10B981",
  },
  startButton: {
    backgroundColor: "#007bff",
  },
  completeButton: {
    backgroundColor: "#28a745",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
  },
  modernCancelButton: {
    backgroundColor: "#EF4444",
  },
  sleekCancelButton: {
    backgroundColor: "#EF4444",
  },
  completedMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
  },
  imageSection: {
    marginBottom: 16,
  },
  imageSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  imageSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  uploadButton: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
});
