import { QuickStatsProps } from "../../interfaces/DashboardInterface";

/**
 * Dummy data for quick stats section
 */
export const quickStatsDummyData: QuickStatsProps = {
  weeklyEarnings: 1250,
  monthlyEarnings: 4800,
  completedJobsThisWeek: 8,
  completedJobsThisMonth: 32,
  pendingJobsCount: 3,
  averageRating: 4.7,
  totalReviews: 28,
};

/**
 * Generate quick stats data with random variations
 */
export const generateQuickStatsData = (): QuickStatsProps => {
  const baseData = quickStatsDummyData;

  // Add some random variation for more realistic data
  const variation = 0.1; // 10% variation

  return {
    weeklyEarnings: Math.round(
      baseData.weeklyEarnings * (1 + (Math.random() - 0.5) * variation)
    ),
    monthlyEarnings: Math.round(
      baseData.monthlyEarnings * (1 + (Math.random() - 0.5) * variation)
    ),
    completedJobsThisWeek: Math.max(
      0,
      Math.round(baseData.completedJobsThisWeek + (Math.random() - 0.5) * 2)
    ),
    completedJobsThisMonth: Math.max(
      0,
      Math.round(baseData.completedJobsThisMonth + (Math.random() - 0.5) * 4)
    ),
    pendingJobsCount: Math.max(
      0,
      Math.round(baseData.pendingJobsCount + (Math.random() - 0.5) * 2)
    ),
    averageRating: Math.min(
      5,
      Math.max(1, baseData.averageRating + (Math.random() - 0.5) * 0.2)
    ),
    totalReviews: Math.max(
      0,
      Math.round(baseData.totalReviews + (Math.random() - 0.5) * 5)
    ),
  };
};
