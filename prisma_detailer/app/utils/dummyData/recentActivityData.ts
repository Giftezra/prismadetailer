import {
  RecentActivityProps,
  RecentJobProps,
  RecentEarningProps,
  RecentClientProps,
} from "../../interfaces/DashboardInterface";

/**
 * Dummy data for recent jobs
 */
export const recentJobsDummyData: RecentJobProps[] = [
  {
    id: "1",
    clientName: "Mike Wilson",
    serviceType: "Full Detail",
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    earnings: 150,
    rating: 5,
    status: "completed",
  },
  {
    id: "2",
    clientName: "Lisa Brown",
    serviceType: "Interior Detail",
    completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    earnings: 80,
    rating: 4,
    status: "completed",
  },
  {
    id: "3",
    clientName: "David Lee",
    serviceType: "Exterior Wash",
    completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    earnings: 45,
    status: "completed",
  },
  {
    id: "4",
    clientName: "Emma Davis",
    serviceType: "Premium Detail",
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    earnings: 200,
    rating: 5,
    status: "completed",
  },
  {
    id: "5",
    clientName: "James Miller",
    serviceType: "Interior Detail",
    completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    earnings: 90,
    rating: 4,
    status: "completed",
  },
];

/**
 * Dummy data for recent earnings
 */
export const recentEarningsDummyData: RecentEarningProps[] = [
  {
    id: "1",
    amount: 150,
    jobReference: "JOB-001",
    clientName: "Mike Wilson",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "paid",
  },
  {
    id: "2",
    amount: 80,
    jobReference: "JOB-002",
    clientName: "Lisa Brown",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "paid",
  },
  {
    id: "3",
    amount: 45,
    jobReference: "JOB-003",
    clientName: "David Lee",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
  },
  {
    id: "4",
    amount: 200,
    jobReference: "JOB-004",
    clientName: "Emma Davis",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "paid",
  },
  {
    id: "5",
    amount: 90,
    jobReference: "JOB-005",
    clientName: "James Miller",
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
  },
];

/**
 * Dummy data for recent clients
 */
export const recentClientsDummyData: RecentClientProps[] = [
  {
    id: "1",
    name: "Mike Wilson",
    lastService: "Full Detail",
    totalJobs: 3,
    totalSpent: 450,
    lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    name: "Lisa Brown",
    lastService: "Interior Detail",
    totalJobs: 2,
    totalSpent: 160,
    lastVisit: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    name: "David Lee",
    lastService: "Exterior Wash",
    totalJobs: 1,
    totalSpent: 45,
    lastVisit: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    name: "Emma Davis",
    lastService: "Premium Detail",
    totalJobs: 2,
    totalSpent: 400,
    lastVisit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    name: "James Miller",
    lastService: "Interior Detail",
    totalJobs: 1,
    totalSpent: 90,
    lastVisit: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Complete recent activity dummy data
 */
export const recentActivityDummyData: RecentActivityProps = {
  recentJobs: recentJobsDummyData,
  recentEarnings: recentEarningsDummyData,
  recentClients: recentClientsDummyData,
};

/**
 * Generate recent activity data with random variations
 */
export const generateRecentActivityData = (): RecentActivityProps => {
  return {
    recentJobs: recentJobsDummyData.slice(0, Math.floor(Math.random() * 3) + 3), // 3-5 jobs
    recentEarnings: recentEarningsDummyData.slice(
      0,
      Math.floor(Math.random() * 3) + 3
    ), // 3-5 earnings
    recentClients: recentClientsDummyData.slice(
      0,
      Math.floor(Math.random() * 3) + 3
    ), // 3-5 clients
  };
};
