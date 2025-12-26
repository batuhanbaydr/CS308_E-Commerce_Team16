import React, { useEffect, useMemo, useState } from "react";
import { pmListOrders, pmUpdateOrderStatus } from "../../../../lib/api";

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

// Try best-effort to show a “created at” if your entity has one
function getCreatedAt(o) {
  return o?.createdAt ?? o?.createdDate ?? o?.createdOn ?? o?.timestamp ?? null;
}

export default function OrdersTab() {
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

  // Build dropdown options from data so we don’t guess your enum values
  const statusOptions = useMemo(() => {
    const set = new Set();
    for (const o of orders) {
      if (o?.status) set.add(String(o.status));
    }
    // add common ones as extra convenience (won’t hurt)
    [
      "PENDING",
      "PROCESSING",
      "PAID",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
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

    if (!id) {
      setActionErr("Order id is missing.");
      return;
    }
    if (!status) {
      setActionErr("Status is required.");
      return;
    }

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

      {!orders.length ? (
        <div className="pm-empty">No orders found.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">Order ID</th>
              <th align="left">Created</th>
              <th align="left">Customer</th>
              <th align="left">Total</th>
              <th align="left">Status</th>
              <th align="left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => {
              const id = getId(o);
              const createdAt = getCreatedAt(o);
              const customer =
                o?.customerId ?? o?.userId ?? o?.customer?.id ?? o?.user?.id ?? "—";
              const total =
                o?.totalPrice ?? o?.total ?? o?.grandTotal ?? o?.amount ?? null;

              return (
                <tr key={id || Math.random()}>
                  <td className="pm-td-mono">{id || "—"}</td>
                  <td>{createdAt ? String(createdAt) : "—"}</td>
                  <td className="pm-td-mono">{String(customer)}</td>
                  <td>{money(total)}</td>

                  <td style={{ maxWidth: 220 }}>
                    <select
                      className="pm-input"
                      value={getDraft(o)}
                      onChange={(e) => setDraft(o, e.target.value)}
                    >
                      {/* allow current status even if not in list */}
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
