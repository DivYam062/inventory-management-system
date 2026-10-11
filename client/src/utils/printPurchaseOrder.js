import { buildImageUrl } from "./buildImageUrl";
import { formatCurrency } from "./currency";
import { formatDate } from "./formatDate";

// Prints a purchase order as a clean A4 document (organization header, seller and supplier, items, totals,
// notes and signature lines). The page's own styling is not involved: the document is built as a separate
// HTML page and printed from a hidden frame, so the browser's print dialog can also "Save as PDF".
//
//   printPurchaseOrder(order, organization)   order: the full order (with items); organization: the session's
//                                             { name, logo, email, phone, address }

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Text with line breaks kept (addresses, notes).
const multiline = (value) => escapeHtml(value).replace(/\r?\n/g, "<br />");

const STATUS_LABELS = {
  draft: "Draft - not issued",
  issued: "Issued",
  partially_received: "Partially received",
  received: "Received",
  cancelled: "Cancelled",
};

const party = (title, lines) => `
  <div class="party">
    <h3>${escapeHtml(title)}</h3>
    ${lines.filter(Boolean).map((line) => `<p>${line}</p>`).join("")}
  </div>`;

export const buildPurchaseOrderHtml = (order, organization = {}) => {
  const money = (amount) => escapeHtml(formatCurrency(amount, order.currency));

  const logo = organization.logo ? buildImageUrl(organization.logo) : null;

  const rows = order.items
    .map(
      (item, index) => `
        <tr>
          <td class="num">${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.product?.name || "-")}</strong>
            ${item.product?.sku ? `<br /><span class="muted">${escapeHtml(item.product.sku)}</span>` : ""}
          </td>
          <td class="right">${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td>
          <td class="right">${money(item.unitPrice)}</td>
          <td class="right">${money(item.lineTotal)}</td>
        </tr>`
    )
    .join("");

  const orgContact = [organization.address && multiline(organization.address), organization.phone && escapeHtml(organization.phone), organization.email && escapeHtml(organization.email)];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(order.poNumber)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; color: #111827; line-height: 1.45; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 14px; }
    .org { display: flex; gap: 12px; align-items: flex-start; }
    .org img { max-height: 56px; max-width: 120px; object-fit: contain; }
    .org h1 { margin: 0 0 4px; font-size: 18px; }
    .org p { margin: 0; color: #4b5563; }
    .doc { text-align: right; }
    .doc h2 { margin: 0; font-size: 22px; letter-spacing: 0.08em; }
    .doc .number { margin: 4px 0 0; font-size: 14px; font-weight: 600; }
    .doc .status { margin: 6px 0 0; display: inline-block; border: 1px solid #9ca3af; border-radius: 4px; padding: 1px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .meta div span { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .meta div strong { font-size: 12px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .party { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px; }
    .party h3 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
    .party p { margin: 0 0 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
    th, td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .num { width: 28px; color: #6b7280; }
    .right { text-align: right; white-space: nowrap; }
    .muted { color: #6b7280; font-size: 11px; }
    tfoot td { border-bottom: none; font-size: 13px; font-weight: 700; }
    .notes { margin-top: 16px; }
    .notes h3 { margin: 0 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 56px; page-break-inside: avoid; }
    .signatures div { border-top: 1px solid #111827; padding-top: 4px; text-align: center; color: #4b5563; }
  </style>
</head>
<body>
  <div class="header">
    <div class="org">
      ${logo ? `<img src="${escapeHtml(logo)}" alt="" />` : ""}
      <div>
        <h1>${escapeHtml(organization.name || "")}</h1>
        ${orgContact.filter(Boolean).map((line) => `<p>${line}</p>`).join("")}
      </div>
    </div>
    <div class="doc">
      <h2>PURCHASE ORDER</h2>
      <p class="number">${escapeHtml(order.poNumber)}</p>
      <span class="status">${escapeHtml(STATUS_LABELS[order.status] || order.status)}</span>
    </div>
  </div>

  <div class="meta">
    <div><span>Order date</span><strong>${escapeHtml(formatDate(order.orderDate))}</strong></div>
    <div><span>Expected date</span><strong>${escapeHtml(order.expectedDate ? formatDate(order.expectedDate) : "-")}</strong></div>
    <div><span>Currency</span><strong>${escapeHtml(order.currency)}</strong></div>
    <div><span>Items</span><strong>${order.items.length}</strong></div>
  </div>

  <div class="parties">
    ${party("Seller", [
      `<strong>${escapeHtml(order.seller?.name || "-")}</strong>`,
      order.seller?.address && multiline(order.seller.address),
      order.seller?.phone && escapeHtml(order.seller.phone),
      order.seller?.email && escapeHtml(order.seller.email),
    ])}
    ${party("Supplier contact", [
      `<strong>${escapeHtml(order.supplier?.name || "-")}</strong>`,
      order.supplier?.phone && escapeHtml(order.supplier.phone),
      order.supplier?.email && escapeHtml(order.supplier.email),
    ])}
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Product</th>
        <th class="right">Quantity</th>
        <th class="right">Price per unit</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="right">Total (${escapeHtml(order.currency)})</td>
        <td class="right">${money(order.totalAmount)}</td>
      </tr>
    </tfoot>
  </table>

  ${order.notes ? `<div class="notes"><h3>Notes</h3><p>${multiline(order.notes)}</p></div>` : ""}

  <div class="signatures">
    <div>Prepared by</div>
    <div>Authorised signatory</div>
  </div>
</body>
</html>`;
};

// Prints from a hidden frame, which is removed again afterwards.
export const printPurchaseOrder = (order, organization) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

  const cleanup = () => frame.remove();

  // The frame's load event fires after its images (the logo) have loaded.
  frame.onload = () => {
    const printWindow = frame.contentWindow;
    printWindow.addEventListener("afterprint", cleanup);
    printWindow.focus();
    printWindow.print();
    // Browsers that never fire afterprint: remove the frame after a while anyway.
    setTimeout(cleanup, 60_000);
  };

  frame.srcdoc = buildPurchaseOrderHtml(order, organization);
  document.body.appendChild(frame);
};
