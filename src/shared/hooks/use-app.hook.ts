import { useCallback } from "react";
import { setHeaderAuthorization } from "../../api";
// import useUserStore from "../stores/user-store/user-store";
import useUser from "./use-user.hook";
import useUserStore from "../stores/user.store";
const useApp = () => {
  // const { setUserToken, setUserDetails } = useUserStore();
  const { getUserDetails } = useUser();
  const setUserToken = useUserStore((state) => state.setUserToken);
  const performAuthOperations = useCallback(
    (token: string, isAuth: boolean = false) => {
      if (!token) {
        return;
      }
      try {
        setHeaderAuthorization(token);
        setUserToken(token);
        getUserDetails(isAuth);
      } catch {
        //do something
      }
    },
    []
  );

  return {
    performAuthOperations
  };
};

export default useApp;
