/**
 * @fileoverview Custom React hook for managing bank account operations
 *
 * This hook provides a comprehensive solution for bank account management including:
 * - Fetching user's bank accounts
 * - Adding new bank accounts with validation
 * - Deleting existing bank accounts (with business rule protection)
 * - Setting default bank accounts
 * - Form data collection and state management
 *
 * @author Prisma Detailer Team
 * @version 1.0.0
 * @since 2024
 */

import { useState, useCallback } from "react";
import { BankAccountProps } from "@/app/interfaces/BankingInterface";
import {
  useAppDispatch,
  useAppSelector,
  RootState,
} from "@/app/store/my_store";
import {
  useGetBankAccountsQuery,
  useSetDefaultBankAccountMutation,
  useAddBankAccountMutation,
  useDeleteBankAccountMutation,
} from "@/app/store/api/bankingApi";
import {
  setNewBankAccount,
  clearNewBankAccount,
} from "@/app/store/slices/bankingSlice";
import { useAlertContext } from "@/app/contexts/AlertContext";

/**
 * Custom hook for managing bank account operations
 *
 * This hook integrates with Redux for state management, RTK Query for API operations,
 * and the Alert Context for user notifications. It provides a complete solution for
 * bank account CRUD operations with proper validation and error handling.
 *
 * @returns {Object} Hook return object containing state and methods
 * @returns {BankAccountProps[]} bankAccounts - Array of user's bank accounts
 * @returns {boolean} isLoadingBankAccounts - Loading state for fetching bank accounts
 * @returns {boolean} isLoadingAddBankAccount - Loading state for adding bank account
 * @returns {boolean} isLoadingDeleteBankAccount - Loading state for deleting bank account
 * @returns {boolean} isLoadingSetDefaultBankAccount - Loading state for setting default account
 * @returns {BankAccountProps} newBankAccount - Current form data for new bank account
 * @returns {Function} handleAddBankAccount - Function to add a new bank account
 * @returns {Function} handleRemoveBankAccount - Function to remove a bank account
 * @returns {Function} handleSetDefaultBankAccount - Function to set default bank account
 * @returns {Function} getUserFullName - Function to get user's full name
 * @returns {Function} collectBankAccountInformation - Function to collect form data
 *
 * @example
 * ```typescript
 * const MyComponent = () => {
 *   const {
 *     bankAccounts,
 *     isLoadingBankAccounts,
 *     newBankAccount,
 *     handleAddBankAccount,
 *     handleRemoveBankAccount,
 *     handleSetDefaultBankAccount,
 *     collectBankAccountInformation,
 *   } = useBankAccount();
 *
 *   return (
 *     // Component JSX using the hook's methods and state
 *   );
 * };
 * ```
 */
export const useBankAccount = () => {
  // Redux state management
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.user);
  const newBankAccount = useAppSelector(
    (state: RootState) => state.banking.newBankAccount as BankAccountProps
  );

  /* RTK Query hooks for API operations */
  const {
    data: bankAccounts = [],
    isLoading: isLoadingBankAccounts,
    error: errorBankAccounts,
    refetch: refetchBankAccounts,
  } = useGetBankAccountsQuery();

  const [addBankAccount, { isLoading: isLoadingAddBankAccount }] =
    useAddBankAccountMutation();
  const [deleteBankAccount, { isLoading: isLoadingDeleteBankAccount }] =
    useDeleteBankAccountMutation();
  const [setDefaultBankAccount, { isLoading: isLoadingSetDefaultBankAccount }] =
    useSetDefaultBankAccountMutation();

  /* Alert context for user notifications */
  const { setAlertConfig, setIsVisible } = useAlertContext();

  /* Validate the  */

  /**
   * Adds a new bank account to the user's account list
   *
   * This function validates all required fields before making the API call.
   * It handles both success and error scenarios with appropriate user feedback.
   *
   * @async
   * @function handleAddBankAccount
   * @returns {Promise<void>} Promise that resolves when the operation completes
   *
   * @description
   * **Validation Requirements:**
   * - account_number: Required
   * - bank_name: Required
   * - account_name: Required
   * - iban: Required
   * - bic: Required
   * - sort_code: Required
   *
   * **Success Flow:**
   * 1. Validates required fields
   * 2. Calls addBankAccount API
   * 3. Shows success alert with server message
   * 4. Refetches bank accounts data
   * 5. Clears form data
   *
   * **Error Handling:**
   * - Client-side validation errors
   * - API errors with server messages
   * - Fallback error messages
   *
   * @throws {Error} When validation fails or API call fails
   */
  const handleAddBankAccount = useCallback(async () => {
    // Validate required fields
    if (
      !newBankAccount.account_number ||
      !newBankAccount.bank_name ||
      !newBankAccount.account_name ||
      !newBankAccount.iban ||
      !newBankAccount.bic ||
      !newBankAccount.sort_code
    ) {
      setAlertConfig({
        title: "Error",
        message: "Please fill in all the details",
        type: "error",
        isVisible: true,
        onConfirm: () => setIsVisible(false),
      });
      return;
    }

    try {
      const response = await addBankAccount(newBankAccount).unwrap();
      if (response && response.message) {
        // Success: Show alert and refresh data
        setAlertConfig({
          title: "Success",
          message: response.message,
          type: "success",
          isVisible: true,
          onConfirm: () => {
            refetchBankAccounts();
            dispatch(clearNewBankAccount());
            setIsVisible(false);
          },
        });
      }
    } catch (error: any) {
      // Extract error message from various response formats
      let errorMessage = "";
      errorMessage =
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        "Failed to add bank account";

      setAlertConfig({
        title: "Error",
        message: errorMessage,
        type: "error",
        isVisible: true,
        onConfirm: () => setIsVisible(false),
      });
    }
  }, [
    newBankAccount,
    dispatch,
    setAlertConfig,
    setIsVisible,
    addBankAccount,
    isLoadingAddBankAccount,
  ]);

  /**
   * Removes a bank account from the user's account list
   *
   * This function includes business logic to prevent deletion of the primary
   * bank account and provides appropriate user feedback.
   *
   * @async
   * @function handleRemoveBankAccount
   * @param {string} accountId - The unique identifier of the bank account to remove
   * @returns {Promise<void>} Promise that resolves when the operation completes
   *
   * @description
   * **Business Rules:**
   * - Cannot delete the primary/default bank account
   * - Shows error alert if user attempts to delete default account
   *
   * **Flow:**
   * 1. Find bank account by ID
   * 2. Check if it's the default account
   * 3. If default: Show error and return
   * 4. If not default: Call delete API
   * 5. On success: Show success alert and refetch data
   * 6. On error: Show error alert
   *
   * @throws {Error} When API call fails or account is primary
   */
  const handleRemoveBankAccount = useCallback(
    async (accountId: string) => {
      try {
        // Find the bank account to check if it's the default
        const bankAccount = bankAccounts.find(
          (bankAccount: BankAccountProps) => bankAccount.id === accountId
        );

        // Prevent deletion of primary bank account
        if (bankAccount && bankAccount.is_default) {
          setAlertConfig({
            title: "Error",
            message: "Sorry but you can not delete the primary bank account",
            type: "error",
            isVisible: true,
            onConfirm: () => setIsVisible(false),
          });
          return;
        }

        // Delete the bank account
        const response = await deleteBankAccount({ accountId }).unwrap();
        if (response && response.message) {
          setAlertConfig({
            title: "Success",
            message: response.message,
            type: "success",
            isVisible: true,
            onConfirm: async () => {
              await refetchBankAccounts();
              setIsVisible(false);
            },
          });
        }
      } catch (error: any) {
        // Extract and display error message
        let errorMessage = "";
        errorMessage =
          error?.data?.message ||
          error?.data?.error ||
          error?.message ||
          "Failed to remove bank account";

        setAlertConfig({
          title: "Error",
          message: errorMessage,
          type: "error",
          isVisible: true,
          onConfirm: () => setIsVisible(false),
        });
      }
    },
    [dispatch]
  );

  /**
   * Sets a bank account as the default account
   *
   * This function includes logic to prevent unnecessary API calls when
   * the account is already the default account.
   *
   * @async
   * @function handleSetDefaultBankAccount
   * @param {string} accountId - The unique identifier of the bank account to set as default
   * @returns {Promise<void>} Promise that resolves when the operation completes
   *
   * @description
   * **Business Logic:**
   * - Checks if account is already default (early return)
   * - Only processes non-default accounts
   *
   * **Flow:**
   * 1. Find bank account by ID
   * 2. Check if already default (return early if so)
   * 3. Call API to set as default
   * 4. On success: Show success alert and refetch data
   * 5. On error: Show error alert
   *
   * @note There's a bug in the current implementation - line 175-176 has incomplete logic for finding the bank account
   *
   * @throws {Error} When API call fails
   */
  const handleSetDefaultBankAccount = useCallback(async (accountId: string) => {
    // Find the bank account to check if it's already default
    const bankaccount = bankAccounts.find(
      (bankaccount: BankAccountProps) => bankaccount.id === accountId
    );

    // Early return if already default
    if (bankaccount && bankaccount.is_default) {
      return;
    }

    /* Set the account as default */
    try {
      const response = await setDefaultBankAccount({ accountId }).unwrap();
      if (response && response.message) {
        setAlertConfig({
          title: "Success",
          message: response.message,
          type: "success",
          isVisible: true,
          onConfirm: () => {
            refetchBankAccounts();
            setIsVisible(false);
          },
        });
      }
    } catch (error: any) {
      // Extract and display error message
      let errorMessage = "";
      errorMessage =
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        "Failed to set default bank account";

      setAlertConfig({
        title: "Error",
        message: errorMessage,
        type: "error",
        isVisible: true,
        onConfirm: () => setIsVisible(false),
      });
    }
  }, []);

  /**
   * Gets the user's full name for auto-populating the account name field
   *
   * @function getUserFullName
   * @returns {string} The user's full name (first_name + last_name) or empty string if no user
   *
   * @description
   * This function concatenates the user's first and last name to create
   * a full name that can be used as the default account name when adding
   * a new bank account.
   */
  const getUserFullName = useCallback(() => {
    if (!user) return "";
    return `${user.first_name} ${user.last_name}`.trim();
  }, [user]);

  /**
   * Cleans and formats SWIFT/BIC code
   *
   * @function cleanSwiftCode
   * @param {string} swiftCode - The raw SWIFT code input
   * @returns {string} Cleaned and formatted SWIFT code
   *
   * @description
   * **Formatting Rules:**
   * - Converts to uppercase
   * - Removes spaces and special characters
   * - Limits to 8-11 characters (standard SWIFT code length)
   *
   * **Usage:**
   * ```typescript
   * const cleanedSwift = cleanSwiftCode('chase us 33');
   * // Returns: 'CHASEUS33'
   * ```
   */
  const cleanSwiftCode = useCallback((swiftCode: string): string => {
    if (!swiftCode) return "";

    // Remove spaces and special characters, convert to uppercase
    const cleaned = swiftCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // Limit to 11 characters (max SWIFT code length)
    return cleaned.substring(0, 11);
  }, []);

  /**
   * Cleans and formats sort code
   *
   * @function cleanSortCode
   * @param {string} sortCode - The raw sort code input
   * @returns {string} Cleaned and formatted sort code
   *
   * @description
   * **Formatting Rules:**
   * - Removes spaces, hyphens, and special characters
   * - Keeps only digits
   * - Limits to 6 digits (UK sort code standard)
   *
   * **Usage:**
   * ```typescript
   * const cleanedSortCode = cleanSortCode('12-34-56');
   * // Returns: '123456'
   * ```
   */
  const cleanSortCode = useCallback((sortCode: string): string => {
    if (!sortCode) return "";

    // Remove all non-digit characters
    const cleaned = sortCode.replace(/[^0-9]/g, "");

    // Limit to 6 digits (UK sort code standard)
    return cleaned.substring(0, 6);
  }, []);

  /**
   * Cleans and formats IBAN (International Bank Account Number)
   *
   * @function cleanIban
   * @param {string} iban - The raw IBAN input
   * @returns {string} Cleaned and formatted IBAN
   *
   * @description
   * **Formatting Rules:**
   * - Converts to uppercase
   * - Removes spaces and special characters
   * - Keeps only alphanumeric characters
   * - Limits to 34 characters (max IBAN length)
   *
   * **Usage:**
   * ```typescript
   * const cleanedIban = cleanIban('gb82 west 1234 5698 7654 32');
   * // Returns: 'GB82WEST12345698765432'
   * ```
   */
  const cleanIban = useCallback((iban: string): string => {
    if (!iban) return "";

    // Remove spaces and special characters, convert to uppercase
    const cleaned = iban.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // Limit to 34 characters (max IBAN length)
    return cleaned.substring(0, 34);
  }, []);

  /**
   * Cleans and formats account number
   *
   * @function cleanAccountNumber
   * @param {string} accountNumber - The raw account number input
   * @returns {string} Cleaned and formatted account number
   *
   * @description
   * **Formatting Rules:**
   * - Removes spaces and special characters
   * - Keeps only digits
   * - Limits to 10 digits (standard account number length)
   *
   * **Usage:**
   * ```typescript
   * const cleanedAccount = cleanAccountNumber('1234 5678 90');
   * // Returns: '1234567890'
   * ```
   */
  const cleanAccountNumber = useCallback((accountNumber: string): string => {
    if (!accountNumber) return "";

    // Remove all non-digit characters
    const cleaned = accountNumber.replace(/[^0-9]/g, "");

    // Limit to 10 digits (standard account number length)
    return cleaned.substring(0, 10);
  }, []);

  /**
   * Collects bank account information from form fields
   *
   * This function updates the Redux state with form data as the user types,
   * providing real-time form state management with automatic cleaning and formatting.
   *
   * @function collectBankAccountInformation
   * @param {keyof BankAccountProps} fields - The field name being updated
   * @param {string} values - The new value for the field
   * @returns {void}
   *
   * @description
   * **Behavior:**
   * - Merges new field value with existing form data
   * - Auto-populates account_name with user's full name if not set
   * - Automatically cleans and formats specific fields:
   *   - account_number: Limited to 10 digits
   *   - iban: Converted to uppercase, alphanumeric only, max 34 chars
   *   - bic: Converted to uppercase, alphanumeric only, max 11 chars
   *   - sort_code: Digits only, max 6 chars
   * - Updates Redux state with new form data
   * - Maintains form state across component re-renders
   *
   * **Usage:**
   * ```typescript
   * collectBankAccountInformation('bank_name', 'Chase Bank');
   * collectBankAccountInformation('account_number', '1234 5678 90');
   * collectBankAccountInformation('iban', 'gb82 west 1234 5698 7654 32');
   * ```
   */
  const collectBankAccountInformation = (
    fields: keyof BankAccountProps,
    values: string
  ) => {
    // Initialize with default values if no existing data
    const currentData = newBankAccount || {
      account_name: getUserFullName(),
      bank_name: "",
      account_number: "",
      iban: "",
      bic: "",
      sort_code: "",
    };

    // Clean and format the value based on the field type
    let cleanedValue = values;
    switch (fields) {
      case "account_number":
        cleanedValue = cleanAccountNumber(values);
        break;
      case "iban":
        cleanedValue = cleanIban(values);
        break;
      case "bic":
        cleanedValue = cleanSwiftCode(values);
        break;
      case "sort_code":
        cleanedValue = cleanSortCode(values);
        break;
      default:
        cleanedValue = values;
    }

    // Update Redux state with new field value
    dispatch(setNewBankAccount({ ...currentData, [fields]: cleanedValue }));
  };

  // Return hook interface
  return {
    // State
    bankAccounts,
    isLoadingBankAccounts,
    isLoadingAddBankAccount,
    isLoadingDeleteBankAccount,
    isLoadingSetDefaultBankAccount,
    newBankAccount,

    // Methods
    handleAddBankAccount,
    handleRemoveBankAccount,
    handleSetDefaultBankAccount,
    getUserFullName,
    collectBankAccountInformation,

    // Cleaning and formatting methods
    cleanSwiftCode,
    cleanSortCode,
    cleanIban,
    cleanAccountNumber,
  };
};
