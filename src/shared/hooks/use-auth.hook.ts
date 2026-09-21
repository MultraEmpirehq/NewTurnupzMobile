import { useCallback } from "react";
import useUser from "./use-user.hook";
import { constructErrorMessage } from "@/api/functions";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { UnauthenticatedStackParamList } from "@/navigation/unauthenticated-navigator/unauthenticated-navigator";
import useUserStore from "../stores/user.store";

const useAuth = () => {
  const navigation =
    useNavigation<NavigationProp<UnauthenticatedStackParamList>>();
  const setUserDetails = useUserStore((state) => state.setUser);
  const { getUserDetails } = useUser();

  const performAuthVerificationCheck = useCallback(async () => {
    try {
      const userDetails = await getUserDetails(true);
      if (
        !userDetails?.name ||
        !userDetails?.dateOfBirth ||
        !userDetails?.gender ||
        !userDetails?.username
      ) {
        navigation.navigate("onboarding");
        return;
      }
      setUserDetails(userDetails);
    } catch (error) {
      throw error;
    }
  }, [setUserDetails, getUserDetails, navigation]);

  return {
    performAuthVerificationCheck
  };
};

export default useAuth;
