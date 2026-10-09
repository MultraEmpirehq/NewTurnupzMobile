import {
  eventZoneNote,
  formatEventClock,
  formatEventDay
} from "@/shared/utils/event-time";
import {
  describeTicketSaleState,
  ticketSaleState
} from "@/shared/utils/ticket-sales";
import { orderOutcome } from "@/shared/utils/order-status";
import { formatPrice } from "./live-api";

const mockReportEvent = jest.fn().mockResolvedValue({});
jest.mock("./live-api", () => ({
  ...jest.requireActual("./live-api"),
  reportEvent: (...args: unknown[]) => mockReportEvent(...args)
}));
jest.mock("@/api", () => ({ getData: jest.fn(), postData: jest.fn() }));

describe("event times", () => {
  // 19:00 UTC is 8 PM in Lagos and 2 PM in New York (daylight saving ended that morning).
  const instant = "2026-11-01T19:00:00.000Z";

  it("reads the clock in the event's own zone", () => {
    expect(formatEventClock(instant, "Africa/Lagos")).toBe("8:00 PM");
    expect(formatEventClock(instant, "America/New_York")).toBe("2:00 PM");
    expect(formatEventDay(instant, "Africa/Lagos")).toBe("Sun, 1 Nov 2026");
  });

  it("rolls the day over when the zone does", () => {
    expect(formatEventDay("2026-11-01T23:30:00.000Z", "Africa/Lagos")).toBe(
      "Mon, 2 Nov 2026"
    );
  });

  it("defaults to Lagos and names a zone that isn't the phone's", () => {
    expect(formatEventClock(instant, undefined)).toBe("8:00 PM");
    const note = eventZoneNote("Asia/Tokyo");
    expect(note === null || note === "Times in Asia/Tokyo").toBe(true);
  });
});

describe("ticket sales window", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");

  it("is on sale with no window", () => {
    expect(ticketSaleState({}, now)).toEqual({ status: "open" });
  });

  it("is upcoming before it opens and closed after it ends", () => {
    expect(
      ticketSaleState({ salesStartAt: "2026-10-11T09:00:00.000Z" }, now).status
    ).toBe("upcoming");
    expect(
      ticketSaleState({ salesEndAt: "2026-10-10T11:59:00.000Z" }, now).status
    ).toBe("ended");
    expect(describeTicketSaleState({ status: "ended" })).toBe(
      "Sales have closed"
    );
  });
});

describe("order outcomes", () => {
  it("knows every status, whatever its case", () => {
    expect(orderOutcome("REFUNDED").badge).toBe("Refunded");
    expect(orderOutcome("needs_review").badge).toBe("Being checked");
    expect(orderOutcome(undefined).badge).toBe("Awaiting payment");
  });
});

describe("prices", () => {
  it("shows free, the API's own label, or a total for several", () => {
    expect(formatPrice({ amount: 0 })).toBe("Free");
    expect(
      formatPrice({ amount: 5000, formatted: { withCurrency: "₦5,000.00" } })
    ).toBe("₦5,000.00");
    expect(
      formatPrice({ amount: 5000, currency: { code: "NGN", locale: "en-NG" } }, 2)
    ).toContain("10,000");
  });
});

describe("feed reports", () => {
  it("maps the feed's reasons onto the API's and keeps the wording", async () => {
    const { submitEventReport } = jest.requireActual<
      typeof import("@/screens/home/service/event-actions.service")
    >("@/screens/home/service/event-actions.service");
    await submitEventReport({
      eventId: "e1",
      reason: "Harassment or discrimination",
      comment: "Abusive poster",
      submittedAt: ""
    });
    expect(mockReportEvent).toHaveBeenCalledWith("e1", {
      reason: "inappropriate",
      details: "Harassment or discrimination: Abusive poster"
    });
  });
});

describe("sending tickets", () => {
  const { canTransfer } = jest.requireActual<typeof import("./live-api")>("./live-api");
  const base = {
    id: "ut1",
    status: "UN_USED",
    ticket: { id: "t1", name: "VIP", price: { amount: 0 }, transferable: true }
  };

  it("offers sending only when the category allows it", () => {
    expect(canTransfer(base as never)).toBe(true);
    expect(
      canTransfer({ ...base, ticket: { ...base.ticket, transferable: false } } as never)
    ).toBe(false);
  });

  it("never offers a used ticket or one already on its way", () => {
    expect(canTransfer({ ...base, status: "USED" } as never)).toBe(false);
    expect(
      canTransfer({
        ...base,
        transfer: { id: "tr", status: "PENDING", toEmail: "a@b.co", createdAt: "" }
      } as never)
    ).toBe(false);
  });

  it("lets a received ticket (its old transfer claimed) be sent on", () => {
    expect(
      canTransfer({
        ...base,
        transfer: { id: "tr", status: "CLAIMED", toEmail: "a@b.co", createdAt: "" }
      } as never)
    ).toBe(true);
  });
});

describe("transfer recipient", () => {
  const { parseRecipient, recipientBody } = jest.requireActual<
    typeof import("@/shared/utils/transfer-recipient")
  >("@/shared/utils/transfer-recipient");

  it("reads an email, lowercased", () => {
    expect(parseRecipient(" Bo@Example.com ")).toEqual({ kind: "email", email: "bo@example.com" });
  });

  it("reads a username with or without the @", () => {
    expect(parseRecipient("@ada_obi")).toEqual({ kind: "username", username: "ada_obi" });
    expect(parseRecipient("ada.obi")).toEqual({ kind: "username", username: "ada.obi" });
  });

  it("rejects what is neither", () => {
    expect(parseRecipient("not an email")).toBeNull();
    expect(parseRecipient("@")).toBeNull();
  });

  it("sends the matching field", () => {
    expect(recipientBody({ kind: "username", username: "ada" })).toEqual({ recipientUsername: "ada" });
    expect(recipientBody({ kind: "email", email: "a@b.co" })).toEqual({ recipientEmail: "a@b.co" });
  });
});
