import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import StyledText from "@/app/components/helpers/StyledText";
import EarningsSummaryCard from "@/app/components/ui/earnings/EarningsSummaryCard";
import EarningsAnalyticsCard from "@/app/components/ui/earnings/EarningsAnalyticsCard";
import RecentEarningCard from "@/app/components/ui/earnings/RecentEarningCard";
import PayoutHistoryCard from "@/app/components/ui/earnings/PayoutHistoryCard";
import {
  EarningsAnalyticsProps,
  EarningsSummaryCardProps,
  EarningItemProps,
  PayoutItemProps,
} from "@/app/interfaces/EarningInterface";
import ModalServices from "@/app/services/ModalServices";
import RecentEarnings from "@/app/components/ui/earnings/RecentEarnings";
import PaymentHistory from "@/app/components/ui/earnings/PaymentHistory";
import { useEarnings } from "@/app/app-hooks/useEarnings";

const EarningScreen = () => {
  const {
    earningsSummary,
    recentEarnings,
    earningsAnalytics,
    payoutHistory,
    isAllDataLoading,
    isLoadingEarningsSummary,
    isLoadingRecentEarnings,
    isLoadingEarningsAnalytics,
    isLoadingPayoutHistory,
    handleRefetchData,
  } = useEarnings();

  const [showAllEarnings, setShowAllEarnings] = React.useState(false);
  const [showAllPayouts, setShowAllPayouts] = React.useState(false);

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  const [lastUpdated, setLastUpdated] = React.useState(
    new Date().toISOString()
  );

  const handleRefresh = () => {
    handleRefetchData();
    setLastUpdated(new Date().toISOString());
  };

  const handleEarningPress = (earningId: string) => {
    console.log("Navigate to earning:", earningId);
    // TODO: Implement navigation to earning details
  };

  const handlePayoutPress = (payoutId: string) => {
    console.log("Navigate to payout:", payoutId);
    // TODO: Implement navigation to payout details
  };

  if (isAllDataLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor={textColor}
          />
        }
      >
        {/* Header to display the title and the last time the user opened the screen which automatically updates */}
        <View style={styles.header}>
          <StyledText variant="headlineMedium" style={{ color: textColor }}>
            Earnings
          </StyledText>
          <StyledText
            variant="bodySmall"
            style={{ color: textColor, opacity: 0.7 }}
          >
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </StyledText>
        </View>

        {/* Earnings Summary */}
        {earningsSummary && <EarningsSummaryCard {...earningsSummary} />}

        {/* Earnings Analytics */}
        {earningsAnalytics && <EarningsAnalyticsCard {...earningsAnalytics} />}

        {/* Earnings List */}
        <RecentEarningCard
          earnings={recentEarnings?.slice(0, 3) || []}
          onViewAllPress={() => setShowAllEarnings(!showAllEarnings)}
        />

        {/* Payout History */}
        <PayoutHistoryCard
          payments={payoutHistory?.slice(0, 2) || []}
          onViewAllPress={() => setShowAllPayouts(!showAllPayouts)}
        />
      </ScrollView>

      <ModalServices
        visible={showAllEarnings}
        onClose={() => setShowAllEarnings(false)}
        component={<RecentEarnings earnings={recentEarnings || []} />}
        title="All Earnings"
        modalType="fullscreen"
        animationType="fade"
        showCloseButton={true}
      />

      <ModalServices
        visible={showAllPayouts}
        onClose={() => setShowAllPayouts(false)}
        component={<PaymentHistory payments={payoutHistory || []} />}
        title="All Payouts"
        modalType="sheet"
        animationType="fade"
        showCloseButton={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default EarningScreen;
