import { create } from "zustand";

type TLandingStoreType = {
  activeSlideIndex: number;
  previousSlideIndex: number;
  shouldOpenAccountSetSuccessModal: boolean;

  setActiveSlideIndex: (activeSlideIndex: number) => void;
  setShouldOpenAccountSetSuccessModal: (
    shouldOpenAccountSetSuccessModal: boolean
  ) => void;
  prevSlide: () => void;
  nextSlide: () => void;
};

const initialValue = {
  activeSlideIndex: 0,
  previousSlideIndex: -1,
  shouldOpenAccountSetSuccessModal: false
};

const useSlideStore = create<TLandingStoreType>((set) => ({
  ...initialValue,
  setActiveSlideIndex: (activeSlideIndex) => set({ activeSlideIndex }),
  setShouldOpenAccountSetSuccessModal: (
    shouldOpenAccountSetSuccessModal = false
  ) =>
    set({
      shouldOpenAccountSetSuccessModal
    }),
  prevSlide: () =>
    set((prevState) => ({
      ...prevState,
      activeSlideIndex:
        prevState.activeSlideIndex > 0 ? prevState.activeSlideIndex - 1 : 0,
      previousSlideIndex: prevState.activeSlideIndex
    })),
  nextSlide: () =>
    set((prevState) => ({
      ...prevState,
      activeSlideIndex: prevState.activeSlideIndex + 1 || 0,
      previousSlideIndex: prevState.activeSlideIndex
    }))
}));

export default useSlideStore;
