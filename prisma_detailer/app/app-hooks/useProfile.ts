import { useGetProfileStatisticsQuery } from "../store/api/profileapi";
import { router } from "expo-router";
import { useAuthContext } from "../contexts/AuthContextProvider";

const useProfile = () => {
  const {
    data: profileStatistics,
    isLoading: isProfileStatisticsLoading,
    error: profileStatisticsError,
  } = useGetProfileStatisticsQuery();

  const { handleLogout } = useAuthContext();

  /**
   * The method is designed to handle the actions that are performed when clicked
   * @param action the actions to be performed when clicked
   */
  const handleActions = (action: string) => {
    switch (action) {
      case "availability":
        router.push("/main/profile/AvailabilityScreen");
        break;
      case "bankAccount":
        router.push("/main/profile/BankAccountScreen");
        break;
      case "helpSupport":
        break;
      case "notifications":
        router.push("/main/NotificationScreen");
        break;
      case "logout":
        handleLogout();
        break;
    }
  };

  return {
    profileStatistics,
    isProfileStatisticsLoading,
    profileStatisticsError,
    handleActions,
  };
};
export default useProfile;
