import React, { useEffect, useState } from "react";
import { listRefunds, decideRefund, markRefunded } from "../../../../lib/api";

export default function RefundsTab() {
  const [refunds, setRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundStatusFilter, setRefundStatusFilter] = useState(""); // "" = all, "REQUESTED", "APPROVED", etc.
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
      setRefundError(
        err.response?.data?.message || "Could not load refund requests."
      );
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
      // Refresh refunds list
      await handleFetchRefunds();
    } catch (err) {
      console.error("Error processing refund decision", err);
      setStatusKind("error");
      setStatusMessage(
        err.response?.data?.message || "Failed to process refund decision."
      );
    }
  };

  // Auto-load refunds on mount and when filter changes
  useEffect(() => {
    handleFetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundStatusFilter]);

  return (
    <div className="pm-tab-content">
      <div className="pm-tab-header">
        <h2>Refund Management</h2>
        <p>
          Review and process customer refund requests. Approve or deny requests, and mark refunds as completed when products are returned.
        </p>
      </div>

      <div className="pm-tab-body">
        {/* Filter */}
        <div className="pm-form">
          <div className="pm-field">
            <label htmlFor="refund-status-filter">Filter by Status</label>
            <select
              id="refund-status-filter"
              value={refundStatusFilter}
              onChange={(e) => setRefundStatusFilter(e.target.value)}
              style={{
                fontFamily: 'inherit',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%',
                maxWidth: '300px'
              }}
            >
              <option value="">All Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="pm-form-actions">
            <button
              type="button"
              className="pm-button"
              style={{ maxWidth: 180 }}
              onClick={handleFetchRefunds}
            >
              Refresh List
            </button>
          </div>
        </div>

        {loadingRefunds && <p>Loading refund requests…</p>}
        {!loadingRefunds && refundError && (
          <p style={{ color: "#b91c1c", fontSize: 13 }}>
            {refundError}
          </p>
        )}

        {/* Refund list */}
        {!loadingRefunds && !refundError && refunds.length > 0 && (
          <ul className="pm-list">
            {refunds.map((refund) => (
              <li key={refund.id} className="pm-list-item">
                <div className="pm-list-item-header">
                  <div>
                    <span>Refund #{refund.id?.slice(0, 8) || "N/A"}</span>
                    <span
                      style={{
                        marginLeft: "12px",
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background:
                          refund.status === "REQUESTED"
                            ? "#fef3c7"
                            : refund.status === "APPROVED"
                            ? "#dbeafe"
                            : refund.status === "DENIED"
                            ? "#fee2e2"
                            : "#dcfce7",
                        color:
                          refund.status === "REQUESTED"
                            ? "#92400e"
                            : refund.status === "APPROVED"
                            ? "#1e40af"
                            : refund.status === "DENIED"
                            ? "#991b1b"
                            : "#166534",
                        textTransform: "uppercase",
                        fontWeight: 500,
                      }}
                    >
                      {refund.status || "UNKNOWN"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 2,
                    }}
                  >
                    {refund.refundAmount && (
                      <span>
                        <strong>
                          ${Number(refund.refundAmount).toFixed(2)}
                        </strong>
                      </span>
                    )}
                    {refund.createdAt && (
                      <span style={{ fontSize: 12, color: "#555" }}>
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pm-list-item-meta">
                  <span>Order ID: {refund.orderId || "—"}</span>
                  {refund.userEmail && (
                    <span>Customer: {refund.userEmail}</span>
                  )}
                </div>
                {refund.items && refund.items.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                    <strong>Items:</strong>
                    <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                      {refund.items.map((item, idx) => (
                        <li key={idx}>
                          {item.productId} / {item.sku} - Qty: {item.quantity}
                          {item.reason && ` (${item.reason})`}
                          {item.unitPriceAtPurchase && (
                            <span style={{ marginLeft: 8, color: "#555" }}>
                              @ ${Number(item.unitPriceAtPurchase).toFixed(2)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {refund.customerNote && (
                  <p className="pm-list-item-description">
                    <strong>Customer Note:</strong> {refund.customerNote}
                  </p>
                )}
                {refund.managerNote && (
                  <p className="pm-list-item-description">
                    <strong>Manager Note:</strong> {refund.managerNote}
                  </p>
                )}
                {refund.refundSubtotal && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                    <div>
                      Subtotal: ${Number(refund.refundSubtotal).toFixed(2)}
                    </div>
                    {refund.refundTax && (
                      <div>Tax: ${Number(refund.refundTax).toFixed(2)}</div>
                    )}
                    {refund.refundAmount && (
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        Total Refund: ${Number(refund.refundAmount).toFixed(2)}
                      </div>
                    )}
                  </div>
                )}
                {/* Action buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  {refund.status === "REQUESTED" && (
                    <>
                      <button
                        type="button"
                        className="pm-button"
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          maxWidth: 120,
                          background: "#166534",
                          color: "white",
                        }}
                        onClick={() =>
                          handleOpenDecisionModal(refund.id, "approve")
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="pm-button"
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          maxWidth: 120,
                          background: "#b91c1c",
                          color: "white",
                        }}
                        onClick={() =>
                          handleOpenDecisionModal(refund.id, "deny")
                        }
                      >
                        Deny
                      </button>
                    </>
                  )}
                  {refund.status === "APPROVED" && (
                    <button
                      type="button"
                      className="pm-button"
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        maxWidth: 180,
                        background: "#3d211c",
                        color: "white",
                      }}
                      onClick={() =>
                        handleOpenDecisionModal(refund.id, "markRefunded")
                      }
                    >
                      Mark as Refunded
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loadingRefunds &&
          !refundError &&
          refunds.length === 0 && (
            <p style={{ fontSize: 13, color: "#555", marginTop: 12 }}>
              No refund requests found.
            </p>
          )}
      </div>

      {/* Decision Modal */}
      {showDecisionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseDecisionModal}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>
              {decisionAction === "approve"
                ? "Approve Refund Request"
                : decisionAction === "deny"
                ? "Deny Refund Request"
                : "Mark Refund as Completed"}
            </h3>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
              {decisionAction === "approve"
                ? "This will approve the refund request. The customer will be notified when the product is returned."
                : decisionAction === "deny"
                ? "This will deny the refund request. The customer will be notified."
                : "This will mark the refund as completed. Stock will be updated and the customer will be notified."}
            </p>
            {decisionAction !== "markRefunded" && (
              <div className="pm-field" style={{ marginBottom: 16 }}>
                <label htmlFor="decision-note">Manager Note (Optional)</label>
                <textarea
                  id="decision-note"
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows={3}
                  style={{
                    fontFamily: 'inherit',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%',
                    resize: 'vertical'
                  }}
                  placeholder="Add a note for the customer or internal records..."
                />
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button
                type="button"
                className="pm-button"
                style={{
                  padding: "8px 16px",
                  background: "#f5f5f5",
                  color: "#333",
                }}
                onClick={handleCloseDecisionModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pm-button"
                style={{
                  padding: "8px 16px",
                  background:
                    decisionAction === "deny"
                      ? "#b91c1c"
                      : decisionAction === "markRefunded"
                      ? "#3d211c"
                      : "#166534",
                  color: "white",
                }}
                onClick={handleSubmitDecision}
              >
                {decisionAction === "approve"
                  ? "Approve"
                  : decisionAction === "deny"
                  ? "Deny"
                  : "Mark as Refunded"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message Toast */}
      {statusMessage && (
        <div
          className="pm-toast"
          style={
            statusKind === "error"
              ? { backgroundColor: "#b91c1c", color: "#fff" }
              : {}
          }
          role="status"
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}
