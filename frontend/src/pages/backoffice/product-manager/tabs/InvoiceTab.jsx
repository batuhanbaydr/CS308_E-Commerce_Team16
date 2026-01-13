import React, { useEffect, useMemo, useState } from "react";
import { pmListOrders, pmGetOrderDetail } from "../../../../lib/api";

/**
 * InvoiceTab
 * - Lists orders using: GET /api/admin/product/orders
 * - Prints full invoice by fetching: GET /api/admin/product/orders/{orderId}
 */

function getId(o) {
  const raw = o?.id ?? o?._id ?? "";
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.toString === "function") return raw.toString();
  }
  return "";
}

function getCustomerId(o) {
  return o?.customerId ?? o?.userId ?? o?.customer?.id ?? o?.customer ?? "—";
}

function getCreatedAt(o) {
  return (
    o?.createdAt ??
    o?.created ??
    o?.createdDate ??
    o?.createdOn ??
    o?.timestamp ??
    o?.date ??
    null
  );
}

function getStatus(o) {
  return String(o?.status ?? o?.orderStatus ?? "—").toUpperCase();
}

function pickNumber(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;

    if (typeof v === "object") {
      const maybe =
        v.amount ?? v.value ?? v.total ?? v.price ?? v.grandTotal ?? null;
      const nn = Number(maybe);
      if (Number.isFinite(nn)) return nn;
    }
  }
  return null;
}

function computeSubtotalFromItems(o) {
  const items =
    o?.items ??
    o?.orderItems ??
    o?.lines ??
    o?.lineItems ??
    o?.products ??
    o?.details ??
    [];

  if (!Array.isArray(items) || items.length === 0) return null;

  let sum = 0;
  let sawAny = false;

  for (const it of items) {
    const qty = pickNumber(it?.quantity, it?.qty, 1) ?? 1;

    const lineTotal = pickNumber(it?.lineTotal, it?.total, it?.subtotal);
    if (lineTotal != null) {
      sum += lineTotal;
      sawAny = true;
      continue;
    }

    const unit = pickNumber(
      it?.unitPrice,
      it?.price,
      it?.salePrice,
      it?.basePrice,
      it?.productPrice,
      it?.variantPrice
    );

    if (unit != null) {
      sum += unit * qty;
      sawAny = true;
    }
  }

  if (!sawAny) return null;
  return Number.isFinite(sum) ? sum : null;
}

function getInvoiceTotal(o) {
  const fromTotals = pickNumber(
    o?.totals?.grandTotal,
    o?.totals?.total,
    o?.totals?.amount,
    o?.totals?.subtotal
  );
  if (fromTotals != null) return fromTotals;

  const legacy = pickNumber(
    o?.grandTotal,
    o?.totalPrice,
    o?.totalAmount,
    o?.orderTotal,
    o?.finalTotal,
    o?.paidTotal,
    o?.amount,
    o?.total,
    o?.pricing?.total,
    o?.pricing?.grandTotal,
    o?.payment?.total
  );
  if (legacy != null) return legacy;

  const computed = computeSubtotalFromItems(o);
  if (computed != null) return computed;

  return 0;
}

function invoiceIdFromOrderId(orderId) {
  if (!orderId) return "INV-—";
  const short = String(orderId).slice(-6).toUpperCase();
  return `INV-${short}`;
}

function toDateInputValue(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inRange(createdAtIso, from, to) {
  if (!createdAtIso) return false;
  const t = Date.parse(createdAtIso);
  if (!Number.isFinite(t)) return false;

  const fromTs = from ? Date.parse(from + "T00:00:00Z") : null;
  const toTs = to ? Date.parse(to + "T23:59:59Z") : null;

  if (fromTs != null && t < fromTs) return false;
  if (toTs != null && t > toTs) return false;
  return true;
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateString);
  }
}

function formatCurrency(amount) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function buildAddressBlock(title, a) {
  if (!a) return "";
  return `
    <div class="section">
      <div class="h3">${escapeHtml(title)}</div>
      <div class="addr">
        <div class="strong">${escapeHtml(a.fullName || "")}</div>
        <div>${escapeHtml(a.line1 || "")}</div>
        ${a.line2 ? `<div>${escapeHtml(a.line2)}</div>` : ""}
        <div>${escapeHtml(`${a.city || ""}, ${a.state || ""} ${a.zipCode || ""}`)}</div>
        <div>${escapeHtml(a.country || "")}</div>
        ${a.phoneNumber ? `<div>Phone: ${escapeHtml(a.phoneNumber)}</div>` : ""}
      </div>
    </div>
  `;
}

function printFullInvoice(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const totals = order?.totals || {};
  const shipping = order?.shippingAddress || null;
  const billing = order?.billingAddress || null;

  const rowsHtml = items
    .map((it) => {
      const name = escapeHtml(it?.name ?? "");
      const sku = escapeHtml(it?.sku ?? "");
      const qty = escapeHtml(it?.quantity ?? 1);
      const unit = formatCurrency(it?.unitPrice);
      const line = formatCurrency(it?.lineTotal);

      return `
        <tr>
          <td>
            <div class="strong">${name}</div>
            <div class="muted small">SKU: ${sku}</div>
          </td>
          <td class="center">${qty}</td>
          <td class="right">${unit}</td>
          <td class="right strong">${line}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
  <html>
    <head>
      <title>${escapeHtml(invoiceIdFromOrderId(order?.id))}</title>
      <style>
        @page { margin: 0; size: A4; }
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; background: #fff; }
        .wrap { max-width: 900px; margin: 0 auto; padding: 32px; }
        .center { text-align: center; }
        .right { text-align: right; }
        .muted { color: #666; }
        .small { font-size: 12px; }
        .strong { font-weight: 600; }
        .title { font-size: 40px; letter-spacing: .12em; font-weight: 650; margin: 0; }
        .sub { margin: 10px 0 0; font-size: 13px; }
        .status { margin: 28px 0; padding: 14px; background: #f5f5f5; text-align: center; font-weight: 600; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0 26px; }
        .h3 { font-size: 14px; letter-spacing: .08em; font-weight: 700; margin-bottom: 10px; }
        .section { margin: 22px 0; }
        .addr { line-height: 1.6; font-size: 13px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th { border-bottom: 2px solid #e5e5e5; padding: 12px; text-align: left; }
        tbody td { border-bottom: 1px solid #e5e5e5; padding: 12px; vertical-align: top; }
        .centerCol { text-align: center; }
        .totals { width: 320px; margin-left: auto; margin-top: 18px; }
        .totals .row { display: flex; justify-content: space-between; margin: 8px 0; }
        .totals .grand { border-top: 2px solid #e5e5e5; padding-top: 12px; margin-top: 12px; font-size: 16px; font-weight: 700; }
        .footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="center">
          <div class="title">INVOICE</div>
          <div class="sub muted">Order #${escapeHtml(order?.id)}</div>
          <div class="sub muted">${escapeHtml(formatDate(order?.createdAt))}</div>
        </div>

        <div class="status">
          Status: <span style="text-transform: uppercase;">${escapeHtml(order?.status)}</span>
        </div>

        <div class="grid2">
          <div>
            <div class="h3">TIDL</div>
            <div class="muted small">Online Store</div>
          </div>
          <div class="right">
            <div class="muted small"><span class="strong">Order ID:</span> ${escapeHtml(order?.id)}</div>
            <div class="muted small"><span class="strong">Date:</span> ${escapeHtml(formatDate(order?.createdAt))}</div>
          </div>
        </div>

        ${buildAddressBlock("SHIPPING ADDRESS", shipping)}
        ${buildAddressBlock("BILLING ADDRESS", billing)}

        <div class="section">
          <div class="h3">ORDER ITEMS</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="centerCol">Quantity</th>
                <th class="right">Unit Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="4" class="muted">No items found.</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div class="row"><span>Subtotal:</span><span>${formatCurrency(totals.subtotal)}</span></div>
          ${
            totals.tax && Number(totals.tax) > 0
              ? `<div class="row"><span>Tax:</span><span>${formatCurrency(totals.tax)}</span></div>`
              : ""
          }
          ${
            totals.shipping && Number(totals.shipping) > 0
              ? `<div class="row"><span>Shipping:</span><span>${formatCurrency(totals.shipping)}</span></div>`
              : ""
          }
          <div class="row grand"><span>Total:</span><span>${formatCurrency(totals.grandTotal)}</span></div>
        </div>

        <div class="footer">Internal copy (Admin Panel)</div>
      </div>

      <script>
        window.onload = () => window.print();
      </script>
    </body>
  </html>
  `;

  const w = window.open("", "_blank", "width=900,height=650");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function InvoiceTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));

  async function load() {
    try {
      setErrMsg("");
      setLoading(true);
      const res = await pmListOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setOrders([]);
      setErrMsg(
        e?.response?.data?.message ||
          `Failed to load invoices (status ${e?.response?.status || "?"})`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invoiceRows = useMemo(() => {
    return orders
      .map((o) => {
        const orderId = getId(o);
        const createdAt = getCreatedAt(o);
        const status = getStatus(o);

        return {
          invoiceId: invoiceIdFromOrderId(orderId),
          orderId: orderId || "—",
          customerId: getCustomerId(o),
          createdAt,
          createdAtText: createdAt ? new Date(createdAt).toLocaleString() : "—",
          total: getInvoiceTotal(o),
          status,
        };
      })
      .filter((r) => r.status !== "CART")
      .filter((r) => {
        if (!from && !to) return true;
        if (!r.createdAt) return false;
        return inRange(r.createdAt, from, to);
      })
      .sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
  }, [orders, from, to]);

  const totalSum = useMemo(
    () => invoiceRows.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
    [invoiceRows]
  );

  const handlePrint = async (orderId) => {
    try {
      // ✅ IMPORTANT: use ADMIN endpoint for PM
      const res = await pmGetOrderDetail(orderId);
      printFullInvoice(res.data);
    } catch (e) {
      console.log("detail error", e?.response);
      alert(
        `Failed to load invoice detail (status ${e?.response?.status ?? "?"}): ` +
          (e?.response?.data?.message || e?.message)
      );
    }
  };

  if (loading) return <div className="pm-tab">Loading invoices…</div>;
  if (errMsg) return <div className="pm-tab">⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Invoices</h2>
        <div className="pm-tab-actions">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="pm-card">
        <div className="pm-form pm-invoice-filters">
          <div className="pm-form-grid-2">
            <div className="pm-form-field">
              <label className="pm-label">From</label>
              <input
                className="pm-input"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="pm-form-field">
              <label className="pm-label">To</label>
              <input
                className="pm-input"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="pm-row-actions" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="pm-btn pm-btn-secondary"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="pm-card pm-invoice-summary">
        <div>
          <div className="pm-label">Count</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{invoiceRows.length}</div>
        </div>
        <div>
          <div className="pm-label">Total</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>${totalSum.toFixed(2)}</div>
        </div>
      </div>

      {!invoiceRows.length ? (
        <div className="pm-empty">No invoices in this range.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">Invoice ID</th>
              <th align="left">Order ID</th>
              <th align="left">Customer ID</th>
              <th align="left">Created</th>
              <th align="left">Total</th>
              <th align="left">Status</th>
              <th align="left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {invoiceRows.map((r) => (
              <tr key={r.invoiceId + r.orderId}>
                <td className="pm-td-mono">{r.invoiceId}</td>
                <td className="pm-td-mono">{r.orderId}</td>
                <td className="pm-td-mono">{r.customerId}</td>
                <td>{r.createdAtText}</td>
                <td>${Number(r.total || 0).toFixed(2)}</td>
                <td>{r.status}</td>
                <td>
                  <div className="pm-row-actions">
                    <button
                      type="button"
                      className="pm-btn pm-btn-secondary"
                      onClick={() => handlePrint(r.orderId)}
                    >
                      Print / PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
