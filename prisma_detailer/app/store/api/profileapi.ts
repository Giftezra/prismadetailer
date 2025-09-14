import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "./baseQuery";
import { DetailerStatisticsInterface } from "@/app/interfaces/ProfileInterfaces";

const profileApi = createApi({
  reducerPath: "profileApi",
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    /* Get the statistics of the detailer profile */
    getProfileStatistics: builder.query<DetailerStatisticsInterface, void>({
      query: () => ({
        url: "/api/v1/profile/get_profile_statistics/",
        method: "GET",
      }),
      transformResponse: (response: DetailerStatisticsInterface) => response,
    }),
  }),
});

export const { useGetProfileStatisticsQuery } = profileApi;
export default profileApi;
