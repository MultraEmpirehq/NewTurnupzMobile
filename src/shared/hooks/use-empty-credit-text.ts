import useUserStore from "@/shared/stores/user.store";
import { formatZero } from "@/screens/live/live-api";

/** Credit currency for someone with none yet, from their currency or country. */
const HOME_CURRENCY: Record<string, { code: string; locale: string }> = {
  NG: { code: "NGN", locale: "en-NG" },
  NGN: { code: "NGN", locale: "en-NG" },
  CA: { code: "CAD", locale: "en-GB" },
  CAD: { code: "CAD", locale: "en-GB" }
};

/**
 * What an empty Turnupz Credit balance reads: zero in the person's own
 * currency (₦0.00, CA$0.00), or "No credit yet" when we don't know it.
 * Never assumes naira.
 */
export const useEmptyCreditText = () =>
  useUserStore((state) => {
    const user = state.user;
    const home =
      HOME_CURRENCY[user?.platformCurrency?.toUpperCase() ?? ""] ??
      HOME_CURRENCY[user?.countryCode?.toUpperCase() ?? ""];
    return home ? formatZero({ currency: home }) : "No credit yet";
  });
