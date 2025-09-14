import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/app/store/my_store";
import {
  setSignUpData,
  clearSignUpData,
  setUser,
  setAccessToken,
  setRefreshToken,
  setIsAuthenticated,
  setIsLoading,
} from "@/app/store/slices/authSlice";
import { SignUpScreenProps } from "@/app/interfaces/AuthInterface";
import { RootState } from "@/app/store/my_store";
import { useAlertContext } from "@/app/contexts/AlertContext";
import { useRegisterMutation } from "@/app/store/api/authApi";
import { UserProfileProps } from "@/app/interfaces/ProfileInterfaces";
import * as SecureStore from "expo-secure-store";
import { AxiosError } from "axios";

export const useOnboarding = () => {
  const dispatch = useAppDispatch();
  const signUpData = useAppSelector(
    (state: RootState) => state.auth.signUpData
  );

  /* Import the alert context */
  const { setAlertConfig, setIsVisible } = useAlertContext();

  /* Import the auth api register mutation to be used to register a new user */
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Partial<SignUpScreenProps>>({});
  const [showPassword, setShowPassword] = useState(false);

  const steps = [
    { id: 1, title: "Personal Info", icon: "person-outline" },
    { id: 2, title: "Contact Details", icon: "mail-outline" },
    { id: 3, title: "Location", icon: "location-outline" },
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<SignUpScreenProps> = {};

    if (!signUpData) return false;

    switch (step) {
      case 1:
        if (!signUpData.first_name?.trim())
          newErrors.first_name = "First name is required";
        if (!signUpData.last_name?.trim())
          newErrors.last_name = "Last name is required";
        if (!signUpData.email?.trim()) {
          newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(signUpData.email)) {
          newErrors.email = "Please enter a valid email";
        }
        if (!signUpData.phone?.trim()) {
          newErrors.phone = "Phone number is required";
        } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(signUpData.phone)) {
          newErrors.phone = "Please enter a valid phone number";
        }
        break;
      case 2:
        if (!signUpData.password?.trim()) {
          newErrors.password = "Password is required";
        } else if (signUpData.password && signUpData.password.length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        }
        break;
      case 3:
        if (!signUpData.address?.trim())
          newErrors.address = "Address is required";
        if (!signUpData.city?.trim()) newErrors.city = "City is required";
        if (!signUpData.postcode?.trim())
          newErrors.postcode = "Postcode is required";
        if (!signUpData.country?.trim())
          newErrors.country = "Country is required";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Submit the form to the server if the current step is the last step, and the form is valid.
   * The method will show an alert after successfully registering the user,
   * returning the user to the dashboard screen.
   * @returns {token: string, refresh: string, user: UserProfileProps}
   * Save these in the redux store and the local storage.
   */
  const handleSubmit = useCallback(async () => {
    if (validateStep(currentStep) && signUpData) {
      console.log("Submitting signup data:", signUpData); // Debug log
      dispatch(setIsLoading(true));
      try {
        const response = await register(signUpData).unwrap();
        console.log("Registration response:", response); // Debug log
        if (response.user && response.access && response.refresh) {
          /*  Call the alert to show the user that the application has been submitted
           * Save the user data to the async storage after login.
           * This is used when the user tries to relogin,
           * @param user The returned user data which is of interface {User | Seller}
           * @param access The access token returned from the server
           * @param refresh The refresh token returned from the server
           */
          setAlertConfig({
            title: "Application Submitted!",
            message:
              "Thank you for applying to Prisma Valet. We'll review your application and contact you soon.",
            type: "success",
            isVisible: true,
            onConfirm: async () => {
              await saveDataToStorage(
                response.user,
                response.access,
                response.refresh
              );
              dispatch(setUser(response.user));
              dispatch(setAccessToken(response.access));
              dispatch(setRefreshToken(response.refresh));
              dispatch(setIsAuthenticated(true));
              setIsVisible(false);
              router.push("/main/(tabs)/dashboard/DashboardScreen");
            },
          });
        }
        dispatch(clearSignUpData());
      } catch (error) {
        console.log("Registration error:", error); // Debug log
        /*  If the user is not registered, show an alert with the error message returned from the server */
        let errorMessage = "Please try again";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error instanceof AxiosError) {
          errorMessage = error.response?.data?.detail || "Please try again";
        }
        setAlertConfig({
          title: "Registration Failed",
          message: errorMessage,
          type: "error",
          isVisible: true,
          onConfirm: () => {
            setIsVisible(false);
          },
        });
        return;
      } finally {
        dispatch(setIsLoading(false));
      }
    }
  }, [currentStep, signUpData, dispatch, setAlertConfig, register]);

  const updateFormData = (field: keyof SignUpScreenProps, value: string) => {
    const currentData = signUpData || {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      address: "",
      city: "",
      postcode: "",
      country: "",
    };
    dispatch(setSignUpData({ ...currentData, [field]: value }));
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  /**
   * Save the user data to the async storage after login.
   * This is used when the user tries to relogin,
   * @param user The returned user data which is of interface {User | Seller}
   * @param access The access token returned from the server
   * @param refresh The refresh token returned from the server
   */
  const saveDataToStorage = async (
    user: UserProfileProps | null,
    access: string,
    refresh: string
  ) => {
    try {
      await SecureStore.setItemAsync("user", JSON.stringify(user));
      await SecureStore.setItemAsync("access", access);
      await SecureStore.setItemAsync("refresh", refresh);
      console.log("Data saved to storage");
    } catch (error) {
      console.error("Error saving data to storage:", error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getFormData = () => {
    return (
      signUpData || {
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        address: "",
        city: "",
        postcode: "",
        country: "",
      }
    );
  };

  return {
    // State
    currentStep,
    errors,
    showPassword,
    steps,
    formData: getFormData(),

    // Actions
    handleNext,
    handleBack,
    handleSubmit,
    updateFormData,
    togglePasswordVisibility,
    setCurrentStep,
  };
};
