import { useCallback } from "react";
import {
  useGetEarningsSummaryQuery,
  useGetEarningsAnalyticsQuery,
  useGetRecentEarningsQuery,
  useGetPayoutHistoryQuery,
  useGetBankAccountsQuery,
  useAddBankAccountMutation,
} from "@/app/store/api/earningApi";

/**
 * Simplified hook for earnings navigation and actions
 * Each component now fetches its own data using RTK Query
 */
export const useEarnings = () => {
  const {
    data: earningsSummary,
    isLoading: isLoadingEarningsSummary,
    refetch: refetchEarningsSummary,
  } = useGetEarningsSummaryQuery();
  const {
    data: recentEarnings,
    isLoading: isLoadingRecentEarnings,
    refetch: refetchRecentEarnings,
  } = useGetRecentEarningsQuery();
  const {
    data: earningsAnalytics,
    isLoading: isLoadingEarningsAnalytics,
    refetch: refetchEarningsAnalytics,
  } = useGetEarningsAnalyticsQuery();
  const {
    data: payoutHistory,
    isLoading: isLoadingPayoutHistory,
    refetch: refetchPayoutHistory,
  } = useGetPayoutHistoryQuery();

  /* Refetch the data when the user refetch the data */
  const handleRefetchData = useCallback(() => {
    refetchEarningsSummary();
    refetchRecentEarnings();
    refetchEarningsAnalytics();
    refetchPayoutHistory();
  }, [
    refetchEarningsSummary,
    refetchRecentEarnings,
    refetchEarningsAnalytics,
    refetchPayoutHistory,
  ]);

  const isAllDataLoading =
    isLoadingEarningsSummary ||
    isLoadingRecentEarnings ||
    isLoadingEarningsAnalytics ||
    isLoadingPayoutHistory; 

  /**
   * Set bank account as primary
   */
  const setPrimaryBankAccount = useCallback((accountId: string) => {
    console.log("Set primary bank account:", accountId);
    // TODO: Implement set primary bank account functionality
  }, []);

  /**
   * Delete bank account
   */
  const deleteBankAccount = useCallback((accountId: string) => {
    console.log("Delete bank account:", accountId);
    // TODO: Implement delete bank account functionality
  }, []);

  /**
   * Add new bank account
   */
  const addBankAccount = useCallback((accountData: any) => {
    console.log("Add bank account:", accountData);
    // TODO: Implement add bank account functionality
  }, []);

  /**
   * Request payout
   */
  const requestPayout = useCallback((amount: number, bankAccountId: string) => {
    console.log("Request payout:", { amount, bankAccountId });
    // TODO: Implement request payout functionality
  }, []);

  return {
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
    setPrimaryBankAccount,
    deleteBankAccount,
    addBankAccount,
    requestPayout,
  };
};
