import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "./baseQuery";
import {
  JobCardProps,
  JobDetailsProps,
} from "@/app/interfaces/AppointmentInterface";

const appointmentsApi = createApi({
  reducerPath: "appointmentsApi",
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    /**
     * Get all appointments a user has for aspecifix date
     * @param date - The date to get appointments for
     * @returns {JobCardProps} The appointments for the date
     */
    getAllAppointments: builder.query<JobCardProps[], { date: string }>({
      query: ({ date }) => ({
        url: `/api/v1/appointments/get_all_appointments/`,
        method: "GET",
        params: { date },
      }),
      transformResponse: (response: JobCardProps[]) => response,
    }),

    /**
     * Get the details of a specific appointment by the id
     * @param id - The id of the appointment
     * @returns {JobDetailsProps} The appointment details
     */
    getAppointmentDetails: builder.query<JobDetailsProps, { id: string | null }>({
      query: ({ id }) => ({
        url: `/api/v1/appointments/get_appointment_details/`,
        method: "GET",
        params: { id },
      }),
      transformResponse: (response: JobDetailsProps) => response,
    }),

    /**
     * Complete the appointment when the job is done
     * @param id - The id of the appointment
     * @returns {message: string} The message from the server
     */
    completeAppointment: builder.mutation<{ message: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/v1/appointments/complete_appointment/`,
        method: "PATCH",
      }),
    }),

    /**
     * Cancel the appointment
     * @param id - The id of the appointment
     * @returns {message: string} The message from the server
     */
    cancelAppointment: builder.mutation<{ message: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/v1/appointments/cancel_appointment/`,
        method: "PATCH",
        data: { id },
      }),
    }),

    /**
     * Accept the appointment
     * @param id - The id of the appointment
     * @returns {message: string} The message from the server
     */
    acceptAppointment: builder.mutation<{ message: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/v1/appointments/accept_appointment/`,
        method: "PATCH",
        data: { id },
      }),
    }),

    /**
     * Start the appointment
     * @param id - The id of the appointment
     * @returns {message: string} The message from the server
     */
    startAppointment: builder.mutation<{ message: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/v1/appointments/start_appointment/`,
        method: "PATCH",
        data: { id },
      }),
    }),
  }),
});

export const {
  useGetAllAppointmentsQuery,
  useCompleteAppointmentMutation,
  useGetAppointmentDetailsQuery,
  useCancelAppointmentMutation,
  useAcceptAppointmentMutation,
  useStartAppointmentMutation,
} = appointmentsApi;
export default appointmentsApi;
