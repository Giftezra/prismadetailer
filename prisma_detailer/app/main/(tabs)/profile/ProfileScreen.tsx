import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useAppSelector } from "../../../store/my_store";
import StyledText from "../../../components/helpers/StyledText";
import StyledButton from "../../../components/helpers/StyledButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { DetailerStatisticsInterface } from "../../../interfaces/ProfileInterfaces";
import LinearGradientComponent from "@/app/components/helpers/LinearGradientComponent";
import ReviewItems from "@/app/components/ui/profile/ReviewItems";
import ModalServices from "@/app/services/ModalServices";
import ReviewItemList from "@/app/components/ui/profile/ReviewItemList";
import useProfile from "@/app/app-hooks/useProfile";
import { formatCurrency } from "@/app/utils/converters";
import { APP_CONFIG } from "@/constants/Config";
import { useNotification } from "@/app/app-hooks/useNotification";
import { useAlertContext } from "@/app/contexts/AlertContext";

const ProfileScreen = () => {
  const user = useAppSelector((state: any) => state.auth.user);
  const {
    profileStatistics,
    isProfileStatisticsLoading,
    profileStatisticsError,
    handleActions,
  } = useProfile();
  const { setAlertConfig, setIsVisible } = useAlertContext();

  const { unreadCount } = useNotification();

  /* Set the modal visible state */
  const [isViewAllReviewsModalVisible, setIsViewAllReviewsModalVisible] =
    useState(false);
  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const cardColor = useThemeColor({}, "cards");
  const borderColor = useThemeColor({}, "borders");
  const primaryColor = useThemeColor({}, "primary");
  const successColor = useThemeColor({}, "success");
  const warningColor = useThemeColor({}, "warning");

  /**
   * Handle profile edit action
   */
  const handleEditProfile = () => {
    // Handle edit profile action
    setAlertConfig({
      title: "Edit Profile",
      message: "Profile editing functionality will be implemented soon.",
      type: "warning",
      isVisible: true,
      onConfirm: () => setIsVisible(false),
    });
  };

  /**
   * Render a stat card
   */
  const renderStatCard = (
    title: string,
    value: string | number,
    icon: string,
    color?: string
  ) => (
    <LinearGradientComponent
      color1={cardColor}
      color2={textColor}
      start={{ x: 0, y: 0 }}
      end={{ x: 4, y: 1 }}
      style={[styles.statCard, { borderColor }]}
    >
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color || primaryColor} />
        <StyledText variant="labelMedium" style={styles.statTitle}>
          {title}
        </StyledText>
      </View>
      <StyledText variant="titleMedium" style={styles.statValue}>
        {value}
      </StyledText>
    </LinearGradientComponent>
  );

  /**
   * Render a menu item
   */
  const renderMenuItem = (
    title: string,
    icon: string,
    onPress: () => void,
    showBadge?: boolean,
    badgeValue?: string
  ) => (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: cardColor, borderColor }]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon as any} size={24} color={primaryColor} />
        <StyledText variant="bodyLarge" style={styles.menuItemTitle}>
          {title}
        </StyledText>
      </View>
      <View style={styles.menuItemRight}>
        {showBadge && (
          <View style={[styles.badge, { backgroundColor: primaryColor }]}>
            <StyledText variant="labelSmall" style={styles.badgeText}>
              {badgeValue}
            </StyledText>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={textColor} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={[styles.header]}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              {user?.image ? (
                <Image source={{ uri: user.image }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: primaryColor },
                  ]}
                >
                  <StyledText
                    variant="headlineMedium"
                    style={styles.avatarText}
                  >
                    {user?.first_name?.charAt(0) +
                      " " +
                      user?.last_name?.charAt(0) || "U"}
                  </StyledText>
                </View>
              )}
              <TouchableOpacity style={styles.editAvatarButton}>
                <Ionicons name="camera" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
            <View style={styles.userInfo}>
              <StyledText variant="headlineSmall">
                {user?.first_name} {user?.last_name}
              </StyledText>
              <StyledText variant="bodyMedium">{user?.email}</StyledText>
              <StyledText variant="bodyMedium">{user?.phone}</StyledText>
            </View>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={user?.is_verified ? successColor : textColor}
            />
          </View>
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <StyledText variant="titleMedium" style={styles.sectionTitle}>
            Performance Overview
          </StyledText>
          <View style={styles.statsGrid}>
            {renderStatCard(
              "Total Bookings",
              profileStatistics?.total_bookings || 0,
              "calendar",
              successColor
            )}
            {renderStatCard(
              "Average Rating",
              `${profileStatistics?.avg_rating || 0}/5`,
              "star",
              warningColor
            )}
            {renderStatCard(
              "Total Earnings",
              `${formatCurrency(profileStatistics?.total_earnings || 0)}`,
              "cash",
              successColor
            )}
          </View>
        </View>

        {/* Recent Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <StyledText variant="titleMedium" style={styles.sectionTitle}>
              Recent Reviews
            </StyledText>
            <TouchableOpacity
              onPress={() =>
                setIsViewAllReviewsModalVisible(!isViewAllReviewsModalVisible)
              }
            >
              <StyledText variant="bodySmall" style={styles.viewAllText}>
                View All
              </StyledText>
            </TouchableOpacity>
          </View>
          <View style={styles.reviewsContainer}>
            {profileStatistics?.reviews.map((review) => (
              <ReviewItems key={review.id} review={review} />
            ))}
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.section}>
          <StyledText variant="titleMedium" style={styles.sectionTitle}>
            Account Settings
          </StyledText>
          <View style={styles.menuContainer}>
            {renderMenuItem("Availability", "calendar-outline", () =>
              handleActions("availability")
            )}
            {renderMenuItem("Bank Account", "cash-outline", () =>
              handleActions("bankAccount")
            )}
            {renderMenuItem("Help & Support", "help-circle-outline", () =>
              handleActions("helpSupport")
            )}
            {renderMenuItem(
              "Notifications",
              "notifications-outline",
              () => handleActions("notifications"),
              true,
              unreadCount.toString()
            )}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <StyledButton
            variant="icon"
            onPress={() => handleActions("logout")}
            style={styles.logoutButton}
            icon={
              <Ionicons name="log-out-outline" size={20} color={textColor} />
            }
          >
            Logout
          </StyledButton>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <StyledText variant="bodySmall" style={styles.versionText}>
            Prisma Detailer v{APP_CONFIG.version}
          </StyledText>
        </View>
      </ScrollView>

      <ModalServices
        visible={isViewAllReviewsModalVisible}
        onClose={() => setIsViewAllReviewsModalVisible(false)}
        component={
          <ReviewItemList reviews={profileStatistics?.reviews || []} />
        }
        title="Reviews"
        showCloseButton={true}
        modalType="sheet"
        animationType="slide"
        backgroundColor={cardColor}
        borderRadius={16}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    margin: 5,
    padding: 15,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#333",
    borderRadius: 12,
    padding: 4,
  },
  userInfo: {
    flex: 1,
    gap: 5,
  },
  editButton: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: 8,
  },
  verifiedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 4,
  },
  section: {
    marginHorizontal: 5,
    marginBottom: 2,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "600",
  },
  viewAllText: {
    textDecorationLine: "underline",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: 10,
    borderRadius: 2,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    marginLeft: 8,
    opacity: 0.8,
  },
  statValue: {
    fontWeight: "bold",
  },
  reviewsContainer: {
    gap: 12,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 2,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemTitle: {
    marginLeft: 12,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  logoutButton: {
    width: "100%",
  },
  versionContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  versionText: {
    opacity: 0.6,
  },
});

export default ProfileScreen;
