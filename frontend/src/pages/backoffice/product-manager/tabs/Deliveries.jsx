// src/pages/backoffice/product-manager/tabs/DeliveriesTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmListOrders, pmUpdateOrderStatus } from "../../../../lib/api";

/* -------------------- helpers -------------------- */

const DELIVERY_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED"];

function getOrderId(o) {
  const raw = o?.id ?? o?._id ?? "";
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.toString === "function") return raw.toString();
  }
  return "";
}

function pickNumber(...vals) {
  for (const v of vals) {
    if (v == null) continue;

    if (typeof v === "object") {
      const maybe = v.amount ?? v.value ?? v.total ?? v.price ?? v.grandTotal ?? null;
      const n = Number(maybe);
      if (Number.isFinite(n)) return n;
    }

    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function money(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toFixed(2)}`;
}

function getStatus(o) {
  return String(o?.status ?? o?.orderStatus ?? "").toUpperCase();
}

function getCustomerId(o) {
  return (
    o?.customerId ??
    o?.userId ??
    o?.customer?.id ??
    o?.user?.id ??
    o?.customer ??
    "—"
  );
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

function getItems(o) {
  const items =
    o?.items ??
    o?.orderItems ??
    o?.lineItems ??
    o?.lines ??
    o?.details ??
    [];
  return Array.isArray(items) ? items : [];
}

function getItemSku(it) {
  return String(it?.sku ?? it?.variantSku ?? it?.variant?.sku ?? it?.stockSku ?? "");
}

function getItemProductId(it) {
  return it?.productId ?? it?.product?.id ?? it?.product ?? it?.productRef ?? "—";
}

function getItemQty(it) {
  return pickNumber(it?.quantity, it?.qty, 1) ?? 1;
}

function getItemLineTotal(it) {
  return pickNumber(it?.lineTotal, it?.subtotal, it?.total);
}

function getItemUnitPrice(it) {
  return pickNumber(
    it?.unitPrice,
    it?.price,
    it?.salePrice,
    it?.basePrice,
    it?.productPrice,
    it?.variantPrice
  );
}

function getOrderGrandTotal(o) {
  return (
    pickNumber(o?.totals?.grandTotal, o?.totals?.total, o?.totalPrice, o?.grandTotal, o?.total) ??
    null
  );
}

function getDeliveryAddress(o) {
  return (
    o?.deliveryAddress ??
    o?.shippingAddress ??
    o?.shipping ??
    o?.shippingSnapshot ??
    o?.address ??
    o?.shippingAddressSnapshot ??
    null
  );
}

function formatAddress(a) {
  if (!a) return "—";
  const parts = [
    a.fullName || a.name,
    a.line1 || a.addressLine1,
    a.line2 || a.addressLine2,
    a.city,
    a.state,
    a.zipCode || a.postalCode,
    a.country,
    a.phoneNumber || a.phone,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function deliveryId(orderId, sku, idx) {
  const safeSku = sku || `item${idx}`;
  return `DEL-${String(orderId).slice(-6)}::${safeSku}`;
}

/**
 * Price strategy:
 * 1) item.lineTotal if exists
 * 2) unitPrice * qty if exists
 * 3) proportional split of order.grandTotal across items by qty (last resort)
 */
function computeRowTotal({ it, qty, orderGrandTotal, orderItems }) {
  const line = getItemLineTotal(it);
  if (line != null) return line;

  const unit = getItemUnitPrice(it);
  if (unit != null) return unit * qty;

  if (orderGrandTotal != null && orderItems?.length) {
    const totalQty = orderItems.reduce((acc, x) => acc + (getItemQty(x) || 0), 0);
    if (totalQty > 0) return (orderGrandTotal * qty) / totalQty;
  }

  return null;
}

/* -------------------- component -------------------- */

export default function DeliveriesTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [draftStatus, setDraftStatus] = useState({}); // orderId -> string
  const [savingId, setSavingId] = useState("");
  const [actionErr, setActionErr] = useState("");

  async function load() {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await pmListOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setOrders([]);
      setErrMsg(
        e?.response?.data?.message ||
          `Failed to load deliveries (status ${e?.response?.status || "?"})`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function getDraft(o) {
    const id = getOrderId(o);
    if (draftStatus[id] !== undefined) return draftStatus[id];
    return String(o?.status ?? "");
  }

  function setDraft(o, val) {
    const id = getOrderId(o);
    setDraftStatus((prev) => ({ ...prev, [id]: val }));
  }

  async function saveOrderStatus(o) {
    setActionErr("");
    const id = getOrderId(o);
    const status = String(getDraft(o) || "").trim().toUpperCase();

    if (!id) return setActionErr("Order id is missing.");
    if (!status) return setActionErr("Status is required.");

    // optional guard: don’t allow non-delivery statuses from Deliveries screen
    if (!DELIVERY_STATUSES.includes(status)) {
      return setActionErr(
        `Invalid delivery status: ${status}. Allowed: ${DELIVERY_STATUSES.join(", ")}`
      );
    }

    setSavingId(id);
    try {
      const res = await pmUpdateOrderStatus(id, status);
      const updated = res?.data;

      if (updated) {
        setOrders((prev) => prev.map((x) => (getOrderId(x) === id ? updated : x)));
      } else {
        await load();
      }
    } catch (e) {
      setActionErr(
        e?.response?.data?.message ||
          `Failed to update status (status ${e?.response?.status || "?"})`
      );
    } finally {
      setSavingId("");
    }
  }

  const deliveryRows = useMemo(() => {
    const rows = [];

    for (const o of orders) {
      const status = getStatus(o);
      if (status === "CART") continue; // deliveries are only placed orders

      const orderId = getOrderId(o) || "—";
      const customerId = getCustomerId(o);
      const createdAt = getCreatedAt(o);
      const createdAtText = createdAt ? new Date(createdAt).toLocaleString() : "—";
      const completed = status === "DELIVERED";
      const addrObj = getDeliveryAddress(o);
      const addrText = formatAddress(addrObj);

      const items = getItems(o);
      const grandTotal = getOrderGrandTotal(o);

      if (!items.length) {
        rows.push({
          deliveryId: deliveryId(orderId, "", 0),
          orderId,
          customerId,
          productId: "—",
          sku: "—",
          quantity: 0,
          total: grandTotal,
          addressText: addrText,
          completed,
          status,
          createdAt,
          createdAtText,
          _orderRef: o,
        });
        continue;
      }

      items.forEach((it, idx) => {
        const sku = getItemSku(it) || "—";
        const productId = String(getItemProductId(it));
        const quantity = getItemQty(it);
        const total = computeRowTotal({
          it,
          qty: quantity,
          orderGrandTotal: grandTotal,
          orderItems: items,
        });

        rows.push({
          deliveryId: deliveryId(orderId, sku, idx),
          orderId,
          customerId,
          productId,
          sku,
          quantity,
          total,
          addressText: addrText,
          completed,
          status,
          createdAt,
          createdAtText,
          _orderRef: o,
        });
      });
    }

    rows.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });

    return rows;
  }, [orders]);

  if (loading) return <div className="pm-tab">Loading deliveries…</div>;
  if (errMsg) return <div className="pm-tab">⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Deliveries</h2>
        <div className="pm-tab-actions">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {actionErr && <div className="pm-alert pm-alert-error">⚠️ {actionErr}</div>}

      {!deliveryRows.length ? (
        <div className="pm-empty">No deliveries found.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">Delivery ID</th>
              <th align="left">Order ID</th>
              <th align="left">Created</th>
              <th align="left">Customer ID</th>
              <th align="left">Product ID</th>
              <th align="left">SKU</th>
              <th align="left">Qty</th>
              <th align="left">Grand Total</th>
              <th align="left">Delivery Address</th>
              <th align="left">Completed</th>
              <th align="left">Delivery Status</th>
              <th align="left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {deliveryRows.map((r) => {
              const o = r._orderRef;
              const oid = getOrderId(o);
              const current = String(getDraft(o) || "").toUpperCase();
              const currentInList = DELIVERY_STATUSES.includes(current);

              return (
                <tr key={r.deliveryId}>
                  <td className="pm-td-mono">{r.deliveryId}</td>
                  <td className="pm-td-mono">{r.orderId}</td>
                  <td>{r.createdAtText}</td>
                  <td className="pm-td-mono">{String(r.customerId)}</td>
                  <td className="pm-td-mono">{String(r.productId)}</td>
                  <td className="pm-td-mono">{String(r.sku)}</td>
                  <td>{r.quantity}</td>
                  <td>{money(r.total)}</td>
                  <td style={{ maxWidth: 360, whiteSpace: "normal" }}>{r.addressText}</td>
                  <td>{r.completed ? "YES" : "NO"}</td>

                  <td style={{ maxWidth: 220 }}>
                    <select
                      className="pm-input"
                      value={currentInList ? current : DELIVERY_STATUSES[0]}
                      onChange={(e) => setDraft(o, e.target.value)}
                    >
                      {!currentInList && current && (
                        <option value={current} disabled>
                          {current} (not a delivery status)
                        </option>
                      )}
                      {DELIVERY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="pm-btn pm-btn-primary"
                      onClick={() => saveOrderStatus(o)}
                      disabled={savingId === oid}
                    >
                      {savingId === oid ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
