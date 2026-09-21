import { useCallback } from "react";
import useSlideStore from "../stores/slide.store";
import { screensList, screensToShowInSlide } from "../utils/data";
import useUserStore, { TUser } from "@/shared/stores/user.store";
import useUser from "@/shared/hooks/use-user.hook";

const TOTAL_SLIDE_NUMBER = screensList.length;

const useSlide = () => {
  const {
    nextSlide,
    prevSlide,
    activeSlideIndex,
    previousSlideIndex,
    shouldOpenAccountSetSuccessModal,
    setShouldOpenAccountSetSuccessModal,
    setActiveSlideIndex,
    ...otherContent
  } = useSlideStore();
  const userNotVerifiedDetails = useUserStore(
    (state) => state?.userNotVerifiedDetails
  );
  const { getUserDetails } = useUser();
  const setUserNotVerifiedDetails = useUserStore(
    (state) => state.setUserNotVerifiedDetails
  );
  const setUser = useUserStore((state) => state.setUser);

  const handleNextSlideClicked = useCallback(
    async (updatedUserNotVerifiedDetails: TUser | null) => {
      const userDetails =
        updatedUserNotVerifiedDetails || userNotVerifiedDetails;

      if (updatedUserNotVerifiedDetails) {
        setUserNotVerifiedDetails(updatedUserNotVerifiedDetails);
      }

      // const slideInArrayFormat = TOTAL_SLIDE_NUMBER - 1;

      const fullNameIndex = screensList.findIndex(
        (screen) => screen === screensToShowInSlide["full-name"]
      );
      const usernameIndex = screensList.findIndex(
        (screen) => screen === screensToShowInSlide["username"]
      );
      const dateOfBirthIndex = screensList.findIndex(
        (screen) => screen === screensToShowInSlide["date-of-birth"]
      );
      const genderIndex = screensList.findIndex(
        (screen) => screen === screensToShowInSlide["gender"]
      );

      if (!userDetails?.name) {
        console.log("fullNameIndex", fullNameIndex);
        setActiveSlideIndex(fullNameIndex);
        return;
      }
      if (!userDetails?.username) {
        console.log("usernameIndex", usernameIndex);
        setActiveSlideIndex(usernameIndex);
        return;
      }
      if (!userDetails?.dateOfBirth) {
        setActiveSlideIndex(dateOfBirthIndex);
        return;
      }
      if (!userDetails?.gender) {
        setActiveSlideIndex(genderIndex);
        return;
      }

      // if (activeSlideIndex < slideInArrayFormat) {
      //   const nextSlideIndex = activeSlideIndex + 1;
      //   nextSlide();
      //   return nextSlideIndex;
      // }

      // setShouldOpenAccountSetSuccessModal(true);
      setUser(userDetails);
      setActiveSlideIndex(0);
      getUserDetails();
    },
    [
      activeSlideIndex,
      nextSlide,
      userNotVerifiedDetails,
      setActiveSlideIndex,
      setUser,
      setUserNotVerifiedDetails
    ]
  );

  const handlePreviousSlideClicked = useCallback(async () => {
    const nextSlideIndex = activeSlideIndex - 1,
      slideIndexToReturn = nextSlideIndex > 0 ? nextSlideIndex : 0;

    if (
      activeSlideIndex === TOTAL_SLIDE_NUMBER &&
      shouldOpenAccountSetSuccessModal
    ) {
      setShouldOpenAccountSetSuccessModal(false);
    }
    prevSlide();
    return slideIndexToReturn;
  }, [activeSlideIndex, prevSlide, shouldOpenAccountSetSuccessModal]);
  return {
    activeSlideIndex,
    previousSlideIndex,
    handleNextSlideClicked,
    handlePreviousSlideClicked,
    setShouldOpenAccountSetSuccessModal,
    shouldOpenAccountSetSuccessModal,
    ...otherContent
  };
};

export default useSlide;
