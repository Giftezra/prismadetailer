import React, { useRef } from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from "@/app/interfaces/NotificationInterface";
import StyledText from "@/app/components/helpers/StyledText";
import { useThemeColor } from "@/hooks/useThemeColor";

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onDelete: (notificationId: string) => void;
}

const getNotificationIcon = (
  type: NotificationType,
  status: NotificationStatus
) => {

  const errorColor = useThemeColor({}, "error");
  const successColor = useThemeColor({}, "success");
  const warningColor = useThemeColor({}, "warning");
  const primaryColor = useThemeColor({}, "primary");
  const iconColor = useThemeColor({}, "icons");     


  const iconConfig = {
    [NotificationType.BOOKING_CONFIRMED]: {
      name: "checkmark-circle" as const,
      color: errorColor,
    },
    [NotificationType.BOOKING_CANCELLED]: {
      name: "close-circle" as const,
      color: errorColor,
    },
    [NotificationType.BOOKING_RESCHEDULED]: {
      name: "time" as const,
      color: warningColor,
    },
    [NotificationType.CLEANING_COMPLETED]: {
      name: "sparkles" as const,
      color: successColor,
    },
    [NotificationType.CAR_READY]: {
      name: "car" as const,
      color: successColor,
    },
    [NotificationType.PAYMENT_RECEIVED]: {
      name: "card" as const,
      color: successColor,
    },
    [NotificationType.REMINDER]: {
      name: "notifications" as const,
      color: primaryColor,
    },
    [NotificationType.SYSTEM]: {
      name: "settings" as const,
      color: iconColor,
    },
  };

  return (
    iconConfig[type] || {
      name: "notifications" as const,
      color: iconColor,
    }
  );
};

const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - timestamp.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return timestamp.toLocaleDateString();
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onDelete,
}) => {
  const cardColor = useThemeColor({}, "cards");
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const primaryColor = useThemeColor({}, "primary");
  const iconColor = useThemeColor({}, "icons");

  const icon = getNotificationIcon(notification.type, notification.status);
  const swipeableRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete(notification.id);
            // Close the swipeable after deletion
            swipeableRef.current?.close();
          },
        },
      ]
    );
  };

  const renderRightActions = () => {
    return (
      <View style={styles.deleteContainer}>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: primaryColor }]}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
          <StyledText variant="bodySmall" style={styles.deleteText}>
            Delete
          </StyledText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: notification.isRead
              ? cardColor
              : backgroundColor,
            borderColor: textColor,
          },
        ]}
        onPress={() => onPress(notification)}
        activeOpacity={0.7}
      >
        {/* Unread indicator */}
        {!notification.isRead && (
          <View
            style={[
              styles.unreadIndicator,
              { backgroundColor: primaryColor },
            ]}
          />
        )}

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <StyledText variant="titleMedium" numberOfLines={1}>
            {notification.title}
          </StyledText>
          <StyledText variant="bodySmall" numberOfLines={2}>
            {notification.message}
          </StyledText>
          <StyledText variant="bodySmall">
            {formatTimeAgo(notification.timestamp)}
          </StyledText>
        </View>

        {/* Action indicator */}
        <View style={styles.actionContainer}>
          <Ionicons name="chevron-forward" size={16} color={iconColor} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    marginHorizontal: 5,
    marginVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadIndicator: {
    position: "absolute",
    left: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: "400",
  },
  actionContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  deleteContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    marginVertical: 4,
    marginRight: 5,
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteText: {
    color: "white",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
});
