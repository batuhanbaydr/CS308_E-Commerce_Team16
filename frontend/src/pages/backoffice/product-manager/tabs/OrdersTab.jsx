// src/pages/backoffice/product-manager/tabs/OrdersTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmListOrders, pmUpdateOrderStatus, resolveUsers } from "../../../../lib/api";

function getId(o) {
  const raw = o?.id ?? o?._id ?? "";
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.toString === "function") return raw.toString();
  }
  return "";
}

function money(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `$${num.toFixed(2)}`;
}

function getCreatedAt(o) {
  return o?.createdAt ?? o?.createdDate ?? o?.createdOn ?? o?.timestamp ?? null;
}

// ---------- TOTAL HELPERS (robust) ----------
function pickNumber(...vals) {
  for (const v of vals) {
    if (v == null) continue;

    if (typeof v === "object") {
      const maybe = v.amount ?? v.value ?? v.total ?? v.price ?? null;
      const n = Number(maybe);
      if (Number.isFinite(n)) return n;
    }

    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function computeTotalFromItems(o) {
  const items =
    o?.items ??
    o?.orderItems ??
    o?.lines ??
    o?.lineItems ??
    o?.details ??
    o?.products ??
    [];

  if (!Array.isArray(items) || items.length === 0) return null;

  let sum = 0;
  let sawAnyPrice = false;

  for (const it of items) {
    const qty = pickNumber(it?.quantity, it?.qty, 1) ?? 1;

    const lineSubtotal = pickNumber(it?.subtotal, it?.lineTotal, it?.total);
    if (lineSubtotal != null) {
      sum += lineSubtotal;
      sawAnyPrice = true;
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
      sawAnyPrice = true;
    }
  }

  if (!sawAnyPrice) return null;
  return Number.isFinite(sum) ? sum : null;
}

function getTotal(o) {
  const fromTotalsObj = pickNumber(
    o?.totals?.grandTotal,
    o?.totals?.total,
    o?.totals?.amount,
    o?.totals?.subtotal
  );
  if (fromTotalsObj != null) return fromTotalsObj;

  const direct = pickNumber(
    o?.totalPrice,
    o?.total,
    o?.grandTotal,
    o?.totalAmount,
    o?.amount,
    o?.pricing?.total,
    o?.pricing?.grandTotal,
    o?.payment?.total
  );
  if (direct != null) return direct;

  const computed = computeTotalFromItems(o);
  if (computed != null) return computed;

  return null;
}

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [draftStatus, setDraftStatus] = useState({});
  const [savingId, setSavingId] = useState("");
  const [actionErr, setActionErr] = useState("");

  // userId -> displayName (or "Deleted user")
  const [userMap, setUserMap] = useState({});
  const [userLoadErr, setUserLoadErr] = useState("");

  async function load() {
    setLoading(true);
    setErrMsg("");
    setActionErr("");
    try {
      const res = await pmListOrders();
      const list = Array.isArray(res.data) ? res.data : [];
      setOrders(list);
    } catch (e) {
      setErrMsg(
        e?.response?.data?.message ||
          `Failed to load orders (status ${e?.response?.status || "?"})`
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ Bulk resolve once per load (no 404 spam)
  useEffect(() => {
    let cancelled = false;

    async function resolveCustomerNames() {
      setUserLoadErr("");

      const ids = Array.from(
        new Set(
          orders
            .map((o) => o?.customerId ?? o?.userId ?? o?.customer?.id ?? o?.user?.id)
            .filter(Boolean)
            .map(String)
        )
      );

      const missing = ids.filter((id) => !userMap[id]);
      if (!missing.length) return;

      try {
        const res = await resolveUsers(missing);
        const map = res?.data && typeof res.data === "object" ? res.data : {};

        if (cancelled) return;

        // Mark unresolved ids as "Deleted user" to avoid retry loops
        const merged = { ...map };
        for (const id of missing) {
          if (!merged[id]) merged[id] = "Deleted user";
        }

        setUserMap((prev) => ({ ...prev, ...merged }));
      } catch (e) {
        if (cancelled) return;

        setUserLoadErr(
          e?.response?.data?.message ||
            `Could not resolve customer names (status ${e?.response?.status || "?"})`
        );

        //  also cache as Deleted user to stop spamming
        const fallback = {};
        for (const id of missing) fallback[id] = "Deleted user";
        setUserMap((prev) => ({ ...prev, ...fallback }));
      }
    }

    if (orders.length) resolveCustomerNames();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const statusOptions = useMemo(() => {
    const set = new Set();
    for (const o of orders) {
      if (o?.status) set.add(String(o.status));
    }
    [
      "PENDING",
      "PROCESSING",
      "PAID",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
      "CART",
    ].forEach((s) => set.add(s));

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  function getDraft(o) {
    const id = getId(o);
    if (draftStatus[id] !== undefined) return draftStatus[id];
    return String(o?.status ?? "");
  }

  function setDraft(o, val) {
    const id = getId(o);
    setDraftStatus((prev) => ({ ...prev, [id]: val }));
  }

  async function save(o) {
    setActionErr("");
    const id = getId(o);
    const status = String(getDraft(o) || "").trim();

    if (!id) return setActionErr("Order id is missing.");
    if (!status) return setActionErr("Status is required.");

    setSavingId(id);
    try {
      const res = await pmUpdateOrderStatus(id, status);
      const updated = res?.data;

      if (updated) {
        setOrders((prev) => prev.map((x) => (getId(x) === id ? updated : x)));
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

  if (loading) return <div>Loading orders…</div>;
  if (errMsg) return <div>⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Orders</h2>
        <div className="pm-tab-actions">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {actionErr && <div className="pm-alert pm-alert-error">⚠️ {actionErr}</div>}

      {userLoadErr && <div className="pm-alert pm-alert-warn">⚠️ {userLoadErr}</div>}

      {!orders.length ? (
        <div className="pm-empty">No orders found.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">Order ID</th>
              <th align="left">Created</th>
              <th align="left">Customer</th>
              <th align="left">Grand Total</th>
              <th align="left">Status</th>
              <th align="left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => {
              const id = getId(o);
              const createdAt = getCreatedAt(o);

              const customerId = String(
                o?.customerId ??
                  o?.userId ??
                  o?.customer?.id ??
                  o?.user?.id ??
                  ""
              ).trim();

              const customerDisplay = customerId
                ? userMap[customerId] ?? "Deleted user"
                : "—";

              const status = String(o?.status ?? "").toUpperCase();
              const isCart = status === "CART";
              const total = isCart ? computeTotalFromItems(o) : getTotal(o);

              return (
                <tr key={id || customerId || createdAt || Math.random()}>
                  <td className="pm-td-mono">{id || "—"}</td>
                  <td>{createdAt ? String(createdAt) : "—"}</td>
                  <td className="pm-td-mono">{customerDisplay}</td>
                  <td>{money(total)}</td>

                  <td style={{ maxWidth: 220 }}>
                    <select
                      className="pm-input"
                      value={getDraft(o)}
                      onChange={(e) => setDraft(o, e.target.value)}
                    >
                      {!statusOptions.includes(String(o?.status ?? "")) && (
                        <option value={String(o?.status ?? "")}>
                          {String(o?.status ?? "") || "—"}
                        </option>
                      )}
                      {statusOptions.map((s) => (
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
                      onClick={() => save(o)}
                      disabled={savingId === id}
                    >
                      {savingId === id ? "Saving…" : "Save"}
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
