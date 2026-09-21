import { useCallback } from "react";
import { getData, setHeaderAuthorization } from "../../api";
import { constructErrorMessage } from "../../api/functions";
import useUserStore, { TUser } from "../stores/user.store";
import { onInfo } from "../components/status/toast";
const useUser = () => {
  const setUserDetails = useUserStore((state) => state.setUser);
  const setUserNotVerifiedDetails = useUserStore(
    (state) => state?.setUserNotVerifiedDetails
  );
  const setFetchingUserDetailsError = useUserStore(
    (state) => state.setFetchingUserDetailsError
  );
  const clearUserStore = useUserStore((state) => state.clearUserStore);

  const getUserDetails = useCallback(
    async (isAuth: boolean = false, retryCount: number = 1) => {
      if (retryCount > 5) {
        return;
      }
      setFetchingUserDetailsError(null);
      try {
        const { data } = await getData<TUser>("/user");
        if (!isAuth) {
          setUserDetails(data?.data);
        }
        setUserNotVerifiedDetails(data?.data);
        return data?.data;
      } catch (error) {
        setFetchingUserDetailsError(
          constructErrorMessage(
            error as TApiErrorResponseType,
            "Oops! Couldn't fetch your details. Don't fret, we are working on getting you back"
          )
        );
        if (retryCount >= 5) {
          throw error;
        }
        return getUserDetails(isAuth, retryCount + 1);
      }
    },
    []
  );

  const logoutUser = useCallback(async () => {
    setHeaderAuthorization();
    clearUserStore();
    onInfo("You have successfully signed out");
  }, []);

  return {
    getUserDetails,
    logoutUser
  };
};

export default useUser;
