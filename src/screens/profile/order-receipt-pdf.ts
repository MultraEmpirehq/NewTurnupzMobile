import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { formatEventClock, formatEventDay } from "@/shared/utils/event-time";
import { TMyOrder, eventPlace } from "@/screens/live/live-api";

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const money = (price?: { amount?: number; formatted?: { withCurrency?: string } } | null) =>
  price?.amount ? price.formatted?.withCurrency ?? "" : "Free";

/** The receipt as a printable page: what was bought, the total, how it was paid. */
const receiptHtml = (order: TMyOrder, status: string) => {
  const event = order.ticket?.event;
  const reference = order.reference ?? order.id;
  const lines = (order.items ?? [])
    .map(
      (item) =>
        `<tr><td>${item.quantity} × ${escape(item.name)}</td><td class="r">${escape(money(item.unitPrice))} each</td></tr>`
    )
    .join("");
  const paid = [
    order.payment?.card &&
      `<tr><td>${escape(order.payment.cardLabel ?? "Card")}</td><td class="r">${escape(money(order.payment.card))}</td></tr>`,
    order.payment?.credit &&
      `<tr><td>Turnupz Credit</td><td class="r">${escape(money(order.payment.credit))}</td></tr>`
  ]
    .filter(Boolean)
    .join("");
  const refunds = (order.refunds ?? [])
    .map((refund) => {
      const parts = [
        refund.toCard.amount > 0 && `${refund.toCard.formatted?.withCurrency} to card`,
        refund.asCredit.amount > 0 && `${refund.asCredit.formatted?.withCurrency} as Turnupz Credit`
      ].filter(Boolean);
      return `<tr><td>${refund.tickets} ticket${refund.tickets === 1 ? "" : "s"} refunded</td><td class="r">${escape(parts.join(" + "))}</td></tr>`;
    })
    .join("");
  const tickets = (order.userTickets ?? [])
    .map((t) => `<tr><td class="mono">${escape((t.code ?? t.id).toUpperCase())}</td><td class="r">${escape(t.ticket?.name ?? "Ticket")}</td></tr>`)
    .join("");
  const when = event?.date
    ? `${formatEventDay(event.date, event.timezone)} · ${formatEventClock(event.date, event.timezone)}`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#07141D;padding:36px;font-size:13px}
    .brand{font-size:22px;font-weight:800;color:#0577FA;letter-spacing:-.3px}
    h1{font-size:20px;margin:18px 0 2px}.muted{color:#6B7280}
    .badge{display:inline-block;padding:3px 9px;border-radius:999px;background:#E7F8EE;color:#0F7A3B;font-weight:700;font-size:11px}
    h2{font-size:11px;letter-spacing:.6px;color:#9CA3AF;margin:22px 0 6px}
    table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #EEF0F4}
    .r{text-align:right}.total td{font-weight:800;font-size:15px;border-bottom:none}
    .mono{font-family:Menlo,monospace;letter-spacing:1px}.foot{margin-top:28px;color:#9CA3AF;font-size:11px}
  </style></head><body>
    <div class="brand">turnupz</div>
    <h1>Receipt</h1>
    <div class="muted">Order ${escape(reference)} · ${escape(new Date(order.createdAt).toLocaleString())} · <span class="badge">${escape(status)}</span></div>
    <h2>EVENT</h2>
    <div><b>${escape(event?.name ?? "Event")}</b></div>
    <div class="muted">${escape(when)}${event ? ` · ${escape(eventPlace(event))}` : ""}</div>
    <h2>WHAT YOU BOUGHT</h2>
    <table>${lines}<tr class="total"><td>Total</td><td class="r">${escape(money(order.total))}</td></tr></table>
    ${paid ? `<h2>HOW YOU PAID</h2><table>${paid}</table>` : ""}
    ${refunds ? `<h2>REFUNDS</h2><table>${refunds}</table>` : ""}
    ${tickets ? `<h2>TICKETS</h2><table>${tickets}</table>` : ""}
    <div class="foot">Need help? Quote order ${escape(reference)} in the Turnupz app (Settings › Orders › Get help).</div>
  </body></html>`;
};

/** Makes the receipt a PDF and opens the share sheet (save to Files, send, print). */
export const shareReceipt = async (order: TMyOrder, status: string) => {
  const html = receiptHtml(order, status);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: `Receipt ${order.reference ?? ""}`.trim()
  });
};
