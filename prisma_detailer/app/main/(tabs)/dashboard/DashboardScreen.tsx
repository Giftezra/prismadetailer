import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useThemeColor } from "../../../../hooks/useThemeColor";
import StyledText from "../../../components/helpers/StyledText";
import TodayOverviewCard from "../../../components/ui/dashboard/TodayOverviewCard";
import QuickStatsCard from "../../../components/ui/dashboard/QuickStatsCard";
import RecentActivityCard from "../../../components/ui/dashboard/RecentActivityCard";
import QuickActionsCard from "../../../components/ui/dashboard/QuickActionsCard";
import { useDashboard } from "../../../app-hooks/useDashboard";
import ModalServices from "@/app/services/ModalServices";
import RecentJobList from "@/app/components/ui/dashboard/RecentJobList";

const DashboardScreen = () => {
  // ... rest of your component

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  const [viewAllJobs, setViewAllJobs] = useState(false);
  const [viewChat, setViewChat] = useState(false);
  const {
    handleQuickActions,
    viewNextAppointment,
    beginJob,
    completeJob,
    callClient,
    quickStats,
    recentJobs,
    refetchAllData,
    todayOverview,
  } = useDashboard();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              refetchAllData();
            }}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <StyledText variant="titleMedium" style={{ color: textColor }}>
            Dashboard
          </StyledText>
          <StyledText
            variant="bodySmall"
            style={{ color: textColor, opacity: 0.7 }}
          >
            Last updated: {new Date().toLocaleTimeString()}
          </StyledText>
        </View>

        {/* Today's Overview */}
        {todayOverview && (
          <TodayOverviewCard
            data={todayOverview}
            onViewNextAppointment={viewNextAppointment}
            onStartCurrentJob={beginJob}
            onCompleteCurrentJob={completeJob}
            onViewChat={() => setViewChat(!viewChat)}
            onCallClient={callClient}
          />
        )}

        {/* Quick Stats */}
        <QuickStatsCard data={quickStats} />

        {/* Quick Actions */}
        <QuickActionsCard actions={handleQuickActions} />

        {/* Recent Activity */}
        <RecentActivityCard
          data={recentJobs}
          onViewAllJobs={() =>
            recentJobs && recentJobs.length > 0 && setViewAllJobs(!viewAllJobs)
          }
        />

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <ModalServices
        visible={viewAllJobs}
        onClose={() => setViewAllJobs(false)}
        component={<RecentJobList jobs={recentJobs || []} />}
        title="Recent Jobs"
        showCloseButton={true}
        animationType="slide"
        modalType="sheet"
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default DashboardScreen;
