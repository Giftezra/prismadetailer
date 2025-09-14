import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useThemeColor } from "../../../../hooks/useThemeColor";
import StyledText from "../../helpers/StyledText";
import { formatCurrency, formatDate } from "@/app/utils/converters";
import { EarningItemProps } from "@/app/interfaces/EarningInterface";

const RecentEarningItem = ({
  earning,
  onPress,
}: {
  earning: EarningItemProps;
  onPress?: () => void;
}) => {
  const textColor = useThemeColor({}, "text");
  const primaryColor = useThemeColor({}, "button");

  return (
    <TouchableOpacity
      style={styles.earningItem}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.earningHeader}>
        <View style={styles.earningInfo}>
          <StyledText variant="bodySmall" style={{ opacity: 0.7 }}>
            {earning.job_reference}
          </StyledText>
          <StyledText variant="bodyMedium">{earning.client_name}</StyledText>
          <StyledText
            variant="bodySmall"
            style={{ color: textColor, opacity: 0.7 }}
          >
            {earning.service_type}
          </StyledText>
        </View>
        <View style={styles.earningAmount}>
          <StyledText
            variant="titleMedium"
            style={{ color: primaryColor, fontWeight: "500" }}
          >
            {formatCurrency(earning.total_earned || 0)}
          </StyledText>
          {earning.tip_amount && earning.tip_amount > 0 && (
            <StyledText variant="bodySmall" style={{ opacity: 0.7 }}>
              {formatCurrency(earning.tip_amount)} tip
            </StyledText>
          )}
        </View>
      </View>

      <View style={styles.earningFooter}>
        <View style={styles.earningMeta}>
          {earning.commission_amount && (
            <StyledText
              variant="bodySmall"
              style={{ color: textColor, opacity: 0.7 }}
            >
              {formatCurrency(earning.commission_amount)} commission
            </StyledText>
          )}
          {earning.commission_amount &&
            earning.tip_amount &&
            earning.tip_amount > 0 && (
              <StyledText
                variant="bodySmall"
                style={{ color: textColor, opacity: 0.7 }}
              >
                +
              </StyledText>
            )}
          {earning.tip_amount && earning.tip_amount > 0 && (
            <StyledText
              variant="bodySmall"
              style={{ color: textColor, opacity: 0.7 }}
            >
              {formatCurrency(earning.tip_amount)} tip
            </StyledText>
          )}
          {earning.completed_date && (
            <StyledText
              variant="bodySmall"
              style={{ color: textColor, opacity: 0.7 }}
            >
              {formatDate(earning.completed_date)}
            </StyledText>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  earningItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  earningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  earningInfo: {
    flex: 1,
    marginRight: 12,
  },
  earningAmount: {
    alignItems: "flex-end",
  },
  earningFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningMeta: {
    flexDirection: "row",
    gap: 12,
  },
});

export default RecentEarningItem;
