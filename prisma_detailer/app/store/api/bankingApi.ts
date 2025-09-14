import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "./baseQuery";
import { BankAccountProps } from "@/app/interfaces/BankingInterface";

const bankingApi = createApi({
  reducerPath: "bankingApi",
  baseQuery: axiosBaseQuery(),
  endpoints: (builder) => ({
    /* Get all the bank accounts of the user */
    getBankAccounts: builder.query<BankAccountProps[], void>({
      query: () => "/api/v1/banking/get_bank_accounts/",
      transformResponse: (response: BankAccountProps[]) => response,
    }),

    /**
     * Set a bank accounr to the default account. this method takes the id of the bank account to set as default
     * @params {string} id - The id of the bank account to set as default
     * @returns {string} The message from the server
     */
    setDefaultBankAccount: builder.mutation<
      { message: string },
      { accountId: string }
    >({
      query: ({ accountId }) => ({
        url: "/api/v1/banking/set_default_bank_account/",
        method: "PATCH",
        data: { accountId },
      }),
      transformResponse: (response: { message: string }) => response,
    }),

    /**
     * Add a new bank account to the users bank account information
     * @params {BankAccountProps} bankAccount - The bank account to add
     * @returns {BankAccountProps} The bank account that was added
     */
    addBankAccount: builder.mutation<{message:string}, BankAccountProps>({
      query: (bankAccount) => ({
        url: "/api/v1/banking/add_bank_account/",
        method: "POST",
        data: bankAccount,
      }),
    }),

    /**
     * Delete a bank account from the users bank account information
     * @params {string} accountId - The id of the bank account to delete
     * @returns {string} The message from the server
     */
    deleteBankAccount: builder.mutation<{message:string}, {accountId:string}>({
      query: ({accountId}) => ({
        url: "/api/v1/banking/delete_bank_account/",
        method: "DELETE",
        data: {accountId},
      }),
      transformResponse: (response: {message:string}) => response,
    }),
  }),
});

export const {
  useGetBankAccountsQuery,
  useSetDefaultBankAccountMutation,
  useAddBankAccountMutation,
  useDeleteBankAccountMutation,
} = bankingApi;
export default bankingApi;
