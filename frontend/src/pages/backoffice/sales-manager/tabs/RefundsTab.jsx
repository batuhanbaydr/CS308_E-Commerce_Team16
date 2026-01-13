import React, { useEffect, useMemo, useState } from "react";
import { listRefunds, decideRefund, markRefunded } from "../../../../lib/api";

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function dateLabel(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function shortId(id) {
  const s = String(id || "");
  if (!s) return "N/A";
  if (s.length <= 10) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function statusKey(s) {
  const x = String(s || "UNKNOWN").toUpperCase();
  if (x === "REQUESTED") return "requested";
  if (x === "APPROVED") return "approved";
  if (x === "DENIED") return "denied";
  if (x === "REFUNDED") return "refunded";
  return "unknown";
}

export default function RefundsTab() {
  const [refunds, setRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundStatusFilter, setRefundStatusFilter] = useState(""); // "" = all

  const [selectedRefundId, setSelectedRefundId] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionAction, setDecisionAction] = useState(null); // "approve" | "deny" | "markRefunded"

  const [statusMessage, setStatusMessage] = useState(null);
  const [statusKind, setStatusKind] = useState("success"); // "success" | "error"

  const handleFetchRefunds = async () => {
    setLoadingRefunds(true);
    setRefundError("");

    try {
      const status = refundStatusFilter || null;
      const response = await listRefunds(status);
      setRefunds(response.data || []);
    } catch (err) {
      console.error("Error fetching refunds", err);
      setRefundError(err.response?.data?.message || "Could not load refund requests.");
    } finally {
      setLoadingRefunds(false);
    }
  };

  const handleOpenDecisionModal = (refundId, action) => {
    setSelectedRefundId(refundId);
    setDecisionAction(action);
    setDecisionNote("");
    setShowDecisionModal(true);
  };

  const handleCloseDecisionModal = () => {
    setShowDecisionModal(false);
    setSelectedRefundId(null);
    setDecisionAction(null);
    setDecisionNote("");
  };

  const handleSubmitDecision = async () => {
    if (!selectedRefundId || !decisionAction) return;

    try {
      if (decisionAction === "markRefunded") {
        await markRefunded(selectedRefundId);
        setStatusKind("success");
        setStatusMessage("Refund marked as completed. Stock updated and customer notified.");
      } else {
        const approve = decisionAction === "approve";
        await decideRefund(selectedRefundId, approve, decisionNote);
        setStatusKind("success");
        setStatusMessage(
          approve
            ? "Refund request approved. Customer will be notified when product is returned."
            : "Refund request denied. Customer has been notified."
        );
      }

      handleCloseDecisionModal();
      await handleFetchRefunds();
    } catch (err) {
      console.error("Error processing refund decision", err);
      setStatusKind("error");
      setStatusMessage(err.response?.data?.message || "Failed to process refund decision.");
    }
  };

  // Auto-load refunds on mount and when filter changes
  useEffect(() => {
    handleFetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundStatusFilter]);

  // Small header summary (optional but helpful)
  const counts = useMemo(() => {
    const c = { total: refunds.length, requested: 0, approved: 0, denied: 0, refunded: 0 };
    refunds.forEach((r) => {
      const k = statusKey(r.status);
      if (k in c) c[k] += 1;
    });
    return c;
  }, [refunds]);

  return (
    <div className="pm-tab-content">
      <div className="pm-tab-header">
        <h2>Refund Management</h2>
        <p>
          Review and process customer refund requests. Approve/deny requests, then mark refunded when products are returned.
        </p>
      </div>

      <div className="pm-tab-body">
        {/* Toolbar */}
        <div className="refunds-toolbar">
          <div className="refunds-filter">
            <label htmlFor="refund-status-filter">Filter by Status</label>
            <select
              id="refund-status-filter"
              value={refundStatusFilter}
              onChange={(e) => setRefundStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="refunds-toolbar-actions">
            <button type="button" className="pm-btn pm-btn--outline" onClick={handleFetchRefunds}>
              Refresh
            </button>
          </div>
        </div>

        {/* Small summary row */}
        <div className="refunds-summary">
          <div className="refunds-summary-pill">
            <span>Total</span>
            <strong>{counts.total}</strong>
          </div>
          <div className="refunds-summary-pill">
            <span>Requested</span>
            <strong>{counts.requested}</strong>
          </div>
          <div className="refunds-summary-pill">
            <span>Approved</span>
            <strong>{counts.approved}</strong>
          </div>
          <div className="refunds-summary-pill">
            <span>Denied</span>
            <strong>{counts.denied}</strong>
          </div>
          <div className="refunds-summary-pill">
            <span>Refunded</span>
            <strong>{counts.refunded}</strong>
          </div>
        </div>

        {loadingRefunds && <p>Loading refund requests…</p>}
        {!loadingRefunds && refundError && <p className="refunds-error">{refundError}</p>}

        {/* Cards */}
        {!loadingRefunds && !refundError && refunds.length > 0 && (
          <div className="refunds-grid">
            {refunds.map((refund) => {
              const statusText = String(refund.status || "UNKNOWN").toUpperCase();
              const chip = statusKey(refund.status);

              return (
                <article key={refund.id} className="refund-card">
                  <div className="refund-card__header">
                    <div className="refund-card__title">
                      <div className="refund-card__id">
                        Refund <span className="refund-mono">#{shortId(refund.id)}</span>
                      </div>

                      <span className={`refund-chip refund-chip--${chip}`}>
                        {statusText}
                      </span>
                    </div>

                    <div className="refund-card__money">
                      <div className="refund-card__amount">{money(refund.refundAmount)}</div>
                      <div className="refund-card__date">{dateLabel(refund.createdAt)}</div>
                    </div>
                  </div>

                  <div className="refund-kv">
                    <div className="refund-kv__item">
                      <div className="refund-kv__k">Order ID</div>
                      <div className="refund-kv__v refund-mono">{refund.orderId || "—"}</div>
                    </div>

                    <div className="refund-kv__item">
                      <div className="refund-kv__k">Customer</div>
                      <div className="refund-kv__v">{refund.userEmail || "—"}</div>
                    </div>

                    <div className="refund-kv__item">
                      <div className="refund-kv__k">Subtotal</div>
                      <div className="refund-kv__v">{money(refund.refundSubtotal)}</div>
                    </div>

                    <div className="refund-kv__item">
                      <div className="refund-kv__k">Tax</div>
                      <div className="refund-kv__v">{money(refund.refundTax)}</div>
                    </div>
                  </div>

                  <details className="refund-details">
                    <summary className="refund-details__summary">View details</summary>

                    {refund.items && refund.items.length > 0 && (
                      <div className="refund-section">
                        <div className="refund-section__title">Items</div>
                        <ul className="refund-items">
                          {refund.items.map((item, idx) => (
                            <li key={idx} className="refund-item">
                              <div className="refund-item__top">
                                <span className="refund-mono">{item.productId || "—"}</span>
                                <span className="refund-dot">•</span>
                                <span>{item.sku || "—"}</span>
                              </div>
                              <div className="refund-item__meta">
                                <span>Qty: {item.quantity ?? "—"}</span>
                                <span className="refund-dot">•</span>
                                <span>Unit: {money(item.unitPriceAtPurchase)}</span>
                                {item.reason ? (
                                  <>
                                    <span className="refund-dot">•</span>
                                    <span>Reason: {item.reason}</span>
                                  </>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {refund.customerNote && (
                      <div className="refund-section">
                        <div className="refund-section__title">Customer note</div>
                        <div className="refund-note">{refund.customerNote}</div>
                      </div>
                    )}

                    {refund.managerNote && (
                      <div className="refund-section">
                        <div className="refund-section__title">Manager note</div>
                        <div className="refund-note">{refund.managerNote}</div>
                      </div>
                    )}
                  </details>

                  <div className="refund-actions">
                    {statusText === "REQUESTED" && (
                      <>
                        <button
                          type="button"
                          className="pm-btn pm-btn--approve"
                          onClick={() => handleOpenDecisionModal(refund.id, "approve")}
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          className="pm-btn pm-btn--deny"
                          onClick={() => handleOpenDecisionModal(refund.id, "deny")}
                        >
                          Deny
                        </button>
                      </>
                    )}

                    {statusText === "APPROVED" && (
                      <button
                        type="button"
                        className="pm-btn pm-btn--primary"
                        onClick={() => handleOpenDecisionModal(refund.id, "markRefunded")}
                      >
                        Mark as Refunded
                      </button>
                    )}

                    {(statusText === "DENIED" || statusText === "REFUNDED") && (
                      <span className="refund-muted">
                        No actions available for <strong>{statusText}</strong>
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loadingRefunds && !refundError && refunds.length === 0 && (
          <p style={{ fontSize: 13, color: "#555", marginTop: 12 }}>No refund requests found.</p>
        )}
      </div>

      {/* Modal */}
      {showDecisionModal && (
        <div className="refund-modal-overlay" onClick={handleCloseDecisionModal}>
          <div className="refund-modal" onClick={(e) => e.stopPropagation()}>
            <div className="refund-modal__head">
              <h3 className="refund-modal__title">
                {decisionAction === "approve"
                  ? "Approve Refund Request"
                  : decisionAction === "deny"
                  ? "Deny Refund Request"
                  : "Mark Refund as Completed"}
              </h3>

              <p className="refund-modal__subtitle">
                {decisionAction === "approve"
                  ? "This will approve the refund request. The customer will be notified when the product is returned."
                  : decisionAction === "deny"
                  ? "This will deny the refund request. The customer will be notified."
                  : "This will mark the refund as completed. Stock will be updated and the customer will be notified."}
              </p>
            </div>

            {decisionAction !== "markRefunded" && (
              <div className="refund-modal__body">
                <label className="refund-modal__label" htmlFor="decision-note">
                  Manager Note (Optional)
                </label>
                <textarea
                  id="decision-note"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={4}
                  className="refund-modal__textarea"
                  placeholder="Add a note for the customer or internal records..."
                />
              </div>
            )}

            <div className="refund-modal__actions">
              <button type="button" className="pm-btn pm-btn--outline" onClick={handleCloseDecisionModal}>
                Cancel
              </button>

              <button
                type="button"
                className={
                  decisionAction === "deny"
                    ? "pm-btn pm-btn--deny"
                    : decisionAction === "markRefunded"
                    ? "pm-btn pm-btn--primary"
                    : "pm-btn pm-btn--approve"
                }
                onClick={handleSubmitDecision}
              >
                {decisionAction === "approve" ? "Approve" : decisionAction === "deny" ? "Deny" : "Mark as Refunded"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {statusMessage && (
        <div className={`pm-toast ${statusKind === "error" ? "pm-toast--error" : ""}`} role="status">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
