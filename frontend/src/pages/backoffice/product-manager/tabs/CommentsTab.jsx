import React, { useEffect, useMemo, useState } from "react";
import {
  pmListProducts,
  pmListPendingReviews,
  pmApproveReview,
  pmRejectReview,
  getReviewsForProduct,
} from "../../../../lib/api";

function getId(r) {
  const raw = r?.id ?? r?._id ?? "";
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.toString === "function") return raw.toString();
  }
  return "";
}

function stars(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return "—";
  const full = Math.max(1, Math.min(5, Math.round(x)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function CommentsTab() {
  const [mode, setMode] = useState("pending"); // "pending" | "approved"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [workingId, setWorkingId] = useState("");
  const [actionErr, setActionErr] = useState("");

  const title = useMemo(
    () => (mode === "pending" ? "Comments (Pending)" : "Comments (Approved)"),
    [mode]
  );

  async function loadPending() {
    const res = await pmListPendingReviews();
    const data = Array.isArray(res.data) ? res.data : [];
    setRows(data);
  }

  async function loadApproved() {
    // 1) get all products
    const pRes = await pmListProducts();
    const products = Array.isArray(pRes.data) ? pRes.data : [];
    const productIds = products
      .map((p) => p?.id ?? p?._id)
      .filter(Boolean)
      .map((x) => (typeof x === "string" ? x : x?.$oid ?? String(x)));

    // 2) fetch reviews per product (sequential to be safe; you can parallelize later)
    const approved = [];
    for (const pid of productIds) {
      try {
        const rRes = await getReviewsForProduct(pid);
        const list = Array.isArray(rRes.data) ? rRes.data : [];
        // Backend already nulled comment for non-approved, so comment!=null => approved comment
        for (const r of list) {
          const c = (r?.comment ?? "").trim();
          if (c) approved.push(r);
        }
      } catch {
        // ignore one product failure; keeps page usable
      }
    }

    setRows(approved);
  }

  async function load() {
    setLoading(true);
    setErrMsg("");
    setActionErr("");
    try {
      if (mode === "pending") await loadPending();
      else await loadApproved();
    } catch (e) {
      setErrMsg(
        e?.response?.data?.message ||
          `Failed to load reviews (status ${e?.response?.status || "?"})`
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function approve(r) {
    setActionErr("");
    const id = getId(r);
    if (!id) return;

    setWorkingId(id);
    try {
      await pmApproveReview(id);
      // remove from pending list instantly
      setRows((prev) => prev.filter((x) => getId(x) !== id));
    } catch (e) {
      setActionErr(
        e?.response?.data?.message ||
          `Failed to approve (status ${e?.response?.status || "?"})`
      );
    } finally {
      setWorkingId("");
    }
  }

  async function reject(r) {
    setActionErr("");
    const id = getId(r);
    if (!id) return;

    setWorkingId(id);
    try {
      await pmRejectReview(id);
      setRows((prev) => prev.filter((x) => getId(x) !== id));
    } catch (e) {
      setActionErr(
        e?.response?.data?.message ||
          `Failed to reject (status ${e?.response?.status || "?"})`
      );
    } finally {
      setWorkingId("");
    }
  }

  // "Delete" approved comment (no backend delete) => reject it (removes it from product pages)
  async function removeApproved(r) {
    setActionErr("");
    const id = getId(r);
    if (!id) return;

    const ok = window.confirm("Remove this approved comment from the site?");
    if (!ok) return;

    setWorkingId(id);
    try {
      await pmRejectReview(id);
      setRows((prev) => prev.filter((x) => getId(x) !== id));
    } catch (e) {
      setActionErr(
        e?.response?.data?.message ||
          `Failed to remove (status ${e?.response?.status || "?"})`
      );
    } finally {
      setWorkingId("");
    }
  }

  if (loading) return <div>Loading…</div>;
  if (errMsg) return <div>⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">{title}</h2>

        <div className="pm-tab-actions">
          <button
            type="button"
            className={`pm-btn ${mode === "pending" ? "pm-btn-primary" : "pm-btn-secondary"}`}
            onClick={() => setMode("pending")}
          >
            Pending
          </button>
          <button
            type="button"
            className={`pm-btn ${mode === "approved" ? "pm-btn-primary" : "pm-btn-secondary"}`}
            onClick={() => setMode("approved")}
          >
            Approved
          </button>

          <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {actionErr && <div className="pm-alert pm-alert-error">⚠️ {actionErr}</div>}

      {!rows.length ? (
        <div className="pm-empty">No reviews found.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">Review ID</th>
              <th align="left">Product</th>
              <th align="left">Customer</th>
              <th align="left">Rating</th>
              <th align="left">Comment</th>
              <th align="left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const id = getId(r);
              const productId = r?.productId ?? r?.product?.id ?? r?.product?._id ?? "—";
              const userId = r?.userId ?? r?.customerId ?? r?.user?.id ?? r?.user?._id ?? "—";
              const rating = r?.rating ?? null;
              const comment = (r?.comment ?? "").trim();

              const busy = workingId === id;

              return (
                <tr key={id}>
                  <td className="pm-td-mono">{id}</td>
                  <td className="pm-td-mono">{String(productId)}</td>
                  <td className="pm-td-mono">{String(userId)}</td>
                  <td>{rating != null ? stars(rating) : "—"}</td>
                  <td style={{ maxWidth: 520, whiteSpace: "pre-wrap" }}>{comment || "—"}</td>

                  <td>
                    <div className="pm-row-actions">
                      {mode === "pending" ? (
                        <>
                          <button
                            type="button"
                            className="pm-btn pm-btn-primary"
                            disabled={busy}
                            onClick={() => approve(r)}
                          >
                            {busy ? "Working…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="pm-btn pm-btn-danger"
                            disabled={busy}
                            onClick={() => reject(r)}
                          >
                            {busy ? "Working…" : "Reject"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="pm-btn pm-btn-danger"
                          disabled={busy}
                          onClick={() => removeApproved(r)}
                        >
                          {busy ? "Working…" : "Remove"}
                        </button>
                      )}
                    </div>
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
