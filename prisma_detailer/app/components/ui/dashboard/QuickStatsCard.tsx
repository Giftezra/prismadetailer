import React from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import StyledText from "@/app/components/helpers/StyledText";
import { QuickStatsProps, StatCardProps } from "@/app/interfaces/DashboardInterface";
import { LinearGradient } from "expo-linear-gradient";
import { formatCurrency } from "@/app/utils/converters";
  
interface QuickStatsCardProps {
  data: QuickStatsProps | undefined;
}

const QuickStatsCard = ( { data }: QuickStatsCardProps ) => {
  const cardColor = useThemeColor({}, "cards");
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borders");

  const stats: StatCardProps[] = [
    {
      title: "Weekly Earnings",
      value: formatCurrency(data?.weeklyEarnings || 0),
      icon: "💰",
      color: "primary",
    },
    {
      title: "Monthly Earnings",
      value: formatCurrency(data?.monthlyEarnings || 0),
      icon: "📊",
      color: "success",
    },
    {
      title: "Jobs This Week",
      value: data?.completedJobsThisWeek || 0,
      icon: "✅",
      color: "info",
    },
    {
      title: "Pending Jobs",
      value: data?.pendingJobsCount || 0,
      icon: "⏳",
      color: "warning",
    },
    {
      title: "Average Rating",
      value: `${data?.averageRating?.toFixed(1) || 0} ⭐`,
      subtitle: `${data?.totalReviews || 0} reviews`,
      icon: "⭐",
      color: "success",
    },
    {
      title: "Jobs This Month",
      value: data?.completedJobsThisMonth || 0,
      icon: "📈",
      color: "primary",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: cardColor, borderColor }]}>
      <View style={styles.header}>
        <StyledText variant="titleMedium" style={{ color: textColor }}>
          Quick Stats
        </StyledText>
        <StyledText
          variant="bodySmall"
          style={{ color: textColor, opacity: 0.7 }}
        >
          This week
        </StyledText>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <LinearGradient
            key={index}
            colors={[backgroundColor, borderColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.statCard, { borderColor }]}
          >
            <View style={styles.statHeader}>
              <StyledText
                variant="labelSmall"
              >
                {stat.icon}
              </StyledText>
            </View>
            <View style={styles.statContent}>
              <StyledText variant="titleMedium" style={{ color: textColor }}>
                {stat.value}
              </StyledText>
              <StyledText
                variant="bodySmall"
                style={{ color: textColor, opacity: 0.7 }}
              >
                {stat.title}
              </StyledText>
              {stat.subtitle && (
                <StyledText
                  variant="labelSmall"
                  style={{ color: textColor, opacity: 0.5 }}
                >
                  {stat.subtitle}
                </StyledText>
              )}
            </View>
          </LinearGradient>
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    flexDirection: "row",
    gap: 10,
    width: "48%",
    borderRadius: 5,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  statHeader: {
    marginBottom: 8,
  },
  statContent: {
    alignItems: "flex-start",
  },
});

export default QuickStatsCard;
