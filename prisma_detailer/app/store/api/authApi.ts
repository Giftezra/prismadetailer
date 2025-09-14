import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/app/store/api/baseQuery";
import { SignUpScreenProps } from "@/app/interfaces/AuthInterface";
import { UserProfileProps } from "@/app/interfaces/ProfileInterfaces";

const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    /**
     * Login a user using the api to access the url on the server.
     * The credential passed in the body is the {UserProfileProps} which is the users main
     * data
     */
    login: builder.mutation({
      query: (credentials) => ({
        url: "/api/v1/authentication/login/",
        method: "POST",
        data: credentials,
      }),
    }),

    /**
     * Register a new user using the api to access the url on the server.
     * The credential passed in the body is the {UserProfileProps} which is the users main
     * data
     * ARGS: {credentials: SignUpScreenProps}
     * RESPONSE: {token: string, refresh: string, user: UserProfileProps}
     */
    register: builder.mutation<
      { access: string; refresh: string; user: UserProfileProps },
      SignUpScreenProps
    >({
      query: (credentials) => ({
        url: "/api/v1/onboard/create_new_user/",
        method: "POST",
        data: { credentials: credentials },
      }),
    }),

    /**
     * Refresh the access token using the api to access the url on the server.
     * The credential passed in the body is the {UserProfileProps} which is the users main
     * data
     */
    refreshToken: builder.mutation({
      query: (credentials) => ({
        url: "/api/v1/authentication/refresh/",
        method: "POST",
        data: credentials,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
} = authApi;
export default authApi;
