import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "./baseQuery";
import { AvailabilityState, TimeSlot } from "@/app/app-hooks/useAvailability";

const availabilityApi = createApi({
  reducerPath: "availabilityApi",
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    /* Get an array of all the detailers availability for a year */
    getAvailability: builder.query<AvailabilityState, void>({
      query: () => ({
        url: "/api/v1/availability/get_availability/",
        method: "GET",
      }),
      transformResponse: (response: AvailabilityState) => response,
    }),

    /* Create an availability for a detailer */
    createAvailability: builder.mutation<AvailabilityState, AvailabilityState>({
      query: (availability) => ({
        url: "/api/v1/availability/create_availability/",
        method: "POST",
        data: availability,
      }),
    }),
  }),
});

export const { useGetAvailabilityQuery, useCreateAvailabilityMutation } =
  availabilityApi;
export default availabilityApi;
