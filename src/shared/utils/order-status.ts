export type TOrderStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED"
  | "NEEDS_REVIEW";

/** What each order outcome tells the buyer. Matches the web's order pages. */
export const ORDER_OUTCOMES: Record<
  TOrderStatus,
  { badge: string; title: string; message: string; tone: "good" | "wait" | "bad" | "info" }
> = {
  COMPLETED: {
    badge: "Completed",
    title: "You're going!",
    message: "Your tickets are ready in My Tickets.",
    tone: "good"
  },
  PENDING: {
    badge: "Awaiting payment",
    title: "Waiting for payment",
    message:
      "We haven't received your payment yet. If you've paid, give it a moment and check again.",
    tone: "wait"
  },
  FAILED: {
    badge: "Failed",
    title: "Payment didn't go through",
    message: "You haven't been charged. You can try again.",
    tone: "bad"
  },
  REFUNDED: {
    badge: "Refunded",
    title: "You've been refunded",
    message:
      "We couldn't issue your tickets, so your payment is on its way back to you.",
    tone: "info"
  },
  CANCELLED: {
    badge: "Cancelled",
    title: "Place cancelled",
    message: "You cancelled your place, so it went back for someone else.",
    tone: "wait"
  },
  NEEDS_REVIEW: {
    badge: "Being checked",
    title: "We're checking your payment",
    message:
      "Something didn't match on your payment, so our team is checking it. No action needed; we'll be in touch.",
    tone: "wait"
  }
};

export const orderOutcome = (status?: string | null) =>
  ORDER_OUTCOMES[(status?.toUpperCase() as TOrderStatus) ?? "PENDING"] ??
  ORDER_OUTCOMES.PENDING;
