import React, { useEffect, useMemo, useState } from "react";
import { pmListOrders } from "../../../../lib/api";

/**
 * InvoiceTab
 * Uses existing backend:
 *   GET /api/admin/product/orders
 *
 * We treat each order as an invoice row.
 * No backend changes.
 */

function getId(o) {
  return o?.id ?? o?._id ?? "";
}

function getCustomerId(o) {
  return (
    o?.customerId ??
    o?.userId ??
    o?.customer?.id ??
    o?.customer ??
    "—"
  );
}

function getCreatedAt(o) {
  // backend might use createdAt / created / createdDate / date
  return (
    o?.createdAt ??
    o?.created ??
    o?.createdDate ??
    o?.date ??
    null
  );
}

function getTotal(o) {
  const raw =
    o?.totalPrice ??
    o?.total ??
    o?.totalAmount ??
    o?.amount ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function getStatus(o) {
  return String(o?.status ?? o?.orderStatus ?? "—");
}

function invoiceIdFromOrderId(orderId) {
  if (!orderId) return "INV-—";
  const short = String(orderId).slice(-6).toUpperCase();
  return `INV-${short}`;
}

function toDateInputValue(d) {
  // returns yyyy-mm-dd
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

function printInvoiceRow(row) {
  // simplest robust “PDF”: browser print -> user chooses “Save as PDF”
  const html = `
  <html>
    <head>
      <title>${row.invoiceId}</title>
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px; }
        h1 { margin: 0 0 8px; font-size: 20px; letter-spacing: .06em; }
        .muted { color: #666; font-size: 12px; }
        .card { border: 1px solid #eee; padding: 16px; border-radius: 10px; margin-top: 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin-top: 10px; }
        .label { color:#666; font-size: 12px; text-transform: uppercase; letter-spacing:.06em; }
        .val { font-size: 14px; }
        .line { height:1px; background:#eee; margin: 14px 0; }
      </style>
    </head>
    <body>
      <h1>TIDL — INVOICE</h1>
      <div class="muted">Generated from order data</div>

      <div class="card">
        <div class="grid">
          <div>
            <div class="label">Invoice ID</div>
            <div class="val">${row.invoiceId}</div>
          </div>
          <div>
            <div class="label">Status</div>
            <div class="val">${row.status}</div>
          </div>

          <div>
            <div class="label">Order ID</div>
            <div class="val">${row.orderId}</div>
          </div>
          <div>
            <div class="label">Customer ID</div>
            <div class="val">${row.customerId}</div>
          </div>

          <div>
            <div class="label">Created</div>
            <div class="val">${row.createdAtText}</div>
          </div>
          <div>
            <div class="label">Total</div>
            <div class="val">$${row.total.toFixed(2)}</div>
          </div>
        </div>

        <div class="line"></div>
        <div class="muted">
          To export: Print → “Save as PDF”
        </div>
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

  // default date range: last 30 days
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
      const total = getTotal(o);
      const customerId = getCustomerId(o);
      const status = getStatus(o);

      return {
        invoiceId: invoiceIdFromOrderId(orderId),
        orderId: orderId || "—",
        customerId,
        createdAt,
        createdAtText: createdAt
          ? new Date(createdAt).toLocaleString()
          : "—",
        total,
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

            <button
              type="button"
              className="pm-btn pm-btn-primary"
              onClick={() => window.print()}
            >
              Print Page
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
                      onClick={() => printInvoiceRow(r)}
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
