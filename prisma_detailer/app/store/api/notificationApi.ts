import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "./baseQuery";
import { Notification } from "@/app/interfaces/NotificationInterface";

const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["Notifications"],
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => ({
        url: "/api/v1/notifications/get_notifications/",
        method: "GET",
      }),
      transformResponse: (response: any[]) =>
        response.map((notification) => ({
          ...notification,
          isRead: notification.is_read,
        })),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "Notifications" as const,
                id,
              })),
              { type: "Notifications", id: "LIST" },
            ]
          : [{ type: "Notifications", id: "LIST" }],
    }),

    markNotificationAsRead: builder.mutation<
      { success: boolean },
      { id: string }
    >({
      query: ({ id }) => ({
        url: "/api/v1/notifications/mark_notification_as_read/",
        method: "PATCH",
        data: { id },
      }),
      transformResponse: (response: { success: boolean }) => response,
      invalidatesTags: (result, error, { id }) => [
        { type: "Notifications", id },
        { type: "Notifications", id: "LIST" },
      ],
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchResult = dispatch(
          notificationApi.util.updateQueryData(
            "getNotifications",
            undefined,
            (draft) => {
              const notification = draft.find((n) => n.id === id);
              if (notification) {
                notification.isRead = true;
              }
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    markAllNotificationsAsRead: builder.mutation<
      { success: boolean },
      { ids: string[] }
    >({
      query: ({ ids }) => ({
        url: "/api/v1/notifications/mark_all_notifications_as_read/",
        method: "PATCH",
        data: { ids },
      }),
      transformResponse: (response: { success: boolean }) => response,
      invalidatesTags: (result, error, { ids }) => [
        ...ids.map((id) => ({ type: "Notifications" as const, id })),
        { type: "Notifications", id: "LIST" },
      ],
      async onQueryStarted({ ids }, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchResult = dispatch(
          notificationApi.util.updateQueryData(
            "getNotifications",
            undefined,
            (draft) => {
              ids.forEach((id) => {
                const notification = draft.find((n) => n.id === id);
                if (notification) {
                  notification.isRead = true;
                }
              });
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    deleteNotification: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: "/api/v1/notifications/delete_notification/",
        method: "DELETE",
        data: { id },
      }),
      transformResponse: (response: { success: boolean }) => response,
      invalidatesTags: (result, error, { id }) => [
        { type: "Notifications", id },
        { type: "Notifications", id: "LIST" },
      ],
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchResult = dispatch(
          notificationApi.util.updateQueryData(
            "getNotifications",
            undefined,
            (draft) => {
              const index = draft.findIndex((n) => n.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }
          )
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    saveNotificationToken: builder.mutation<
      { success: boolean },
      { token: string }
    >({
      query: ({ token }) => ({
        url: "/api/v1/notifications/save_notification_token/",
        method: "PATCH",
        data: { token },
      }),
      transformResponse: (response: { success: boolean }) => response,
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useSaveNotificationTokenMutation,
} = notificationApi;

export default notificationApi;
