import React, { useEffect, useState } from "react";
import {
  pmListPendingReviews,
  pmApproveReview,
  pmRejectReview,
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
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [savingId, setSavingId] = useState("");
  const [actionErr, setActionErr] = useState("");

  async function load() {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await pmListPendingReviews();
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErrMsg(
        e?.response?.data?.message ||
          `Failed to load pending reviews (status ${e?.response?.status || "?"})`
      );
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(r) {
    setActionErr("");
    const id = getId(r);
    if (!id) return;

    setSavingId(id);
    try {
      await pmApproveReview(id);
      // remove from pending list
      setReviews((prev) => prev.filter((x) => getId(x) !== id));
    } catch (e) {
      setActionErr(
        e?.response?.data?.message ||
          `Failed to approve (status ${e?.response?.status || "?"})`
      );
    } finally {
      setSavingId("");
    }
  }

  async function reject(r) {
    setActionErr("");
    const id = getId(r);
    if (!id) return;

    const note = window.prompt("Optional moderation note (leave empty for none):", "") || "";
    setSavingId(id);
    try {
      await pmRejectReview(id, note.trim() ? note.trim() : null);
      setReviews((prev) => prev.filter((x) => getId(x) !== id));
    } catch (e) {
      setActionErr(
        e?.response?.data?.message ||
          `Failed to reject (status ${e?.response?.status || "?"})`
      );
    } finally {
      setSavingId("");
    }
  }

  if (loading) return <div>Loading pending comments…</div>;
  if (errMsg) return <div>⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Comments (Pending)</h2>
        <div className="pm-tab-actions">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {actionErr && <div className="pm-alert pm-alert-error">⚠️ {actionErr}</div>}

      {!reviews.length ? (
        <div className="pm-empty">No pending comments.</div>
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
            {reviews.map((r) => {
              const id = getId(r);
              const productId = r?.productId ?? r?.product?.id ?? r?.product?._id ?? "—";
              const userId = r?.userId ?? r?.customerId ?? r?.user?.id ?? r?.user?._id ?? "—";
              const rating = r?.rating ?? r?.stars ?? r?.score ?? null;
              const comment = r?.comment ?? r?.text ?? r?.content ?? "";

              const isSaving = savingId === id;

              return (
                <tr key={id}>
                  <td className="pm-td-mono">{id}</td>
                  <td className="pm-td-mono">{String(productId)}</td>
                  <td className="pm-td-mono">{String(userId)}</td>
                  <td>{rating != null ? stars(rating) : "—"}</td>
                  <td style={{ maxWidth: 520, whiteSpace: "pre-wrap" }}>
                    {comment || "—"}
                  </td>
                  <td>
                    <div className="pm-row-actions">
                      <button
                        type="button"
                        className="pm-btn pm-btn-primary"
                        onClick={() => approve(r)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Working…" : "Approve"}
                      </button>

                      <button
                        type="button"
                        className="pm-btn pm-btn-danger"
                        onClick={() => reject(r)}
                        disabled={isSaving}
                      >
                        {isSaving ? "Working…" : "Reject"}
                      </button>
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
