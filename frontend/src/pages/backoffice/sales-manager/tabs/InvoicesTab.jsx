import React, { useState } from "react";
import { listInvoicesByDateRange, downloadInvoicePdf } from "../../../../lib/api";

export default function InvoicesTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");

  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    // Try to parse and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Handle date input with validation - allow typing intermediate formats
  const handleStartDateChange = (e) => {
    const value = e.target.value;
    // Allow empty, partial dates (e.g., "2025", "2025-01", "2025-01-01"), or full YYYY-MM-DD format
    if (value === "" || /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/.test(value)) {
      setStartDate(value);
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    // Allow empty, partial dates (e.g., "2025", "2025-01", "2025-01-01"), or full YYYY-MM-DD format
    if (value === "" || /^\d{0,4}(-\d{0,2}(-\d{0,2})?)?$/.test(value)) {
      setEndDate(value);
    }
  };

  const handleFetchInvoices = async () => {
    if (!startDate || !endDate) {
      setInvoiceError("Please select both start and end dates.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setInvoiceError("Start date cannot be after end date.");
      return;
    }

    setLoadingInvoices(true);
    setInvoiceError("");

    try {
      // Fetch invoices
      const invoicesResponse = await listInvoicesByDateRange(startDate, endDate);
      const invoicesData = invoicesResponse.data || [];
      
      // Transform backend data to frontend format
      const transformedInvoices = invoicesData.map((inv) => ({
        id: inv.orderId || inv.id,
        date: inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "",
        customerName: inv.userId || inv.customerName || "Unknown",
        totalAmount: inv.grandTotal ? Number(inv.grandTotal) : 0,
        status: inv.status || "UNKNOWN",
      }));

      setInvoices(transformedInvoices);
    } catch (err) {
      console.error("Error fetching invoices", err);
      setInvoiceError(
        err.response?.data?.message || "Could not load invoices."
      );
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await downloadInvoicePdf(invoiceId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error downloading invoice ${invoiceId}:`, err);
      alert(`Failed to download invoice ${invoiceId}. Please try again.`);
    }
  };

  const handleDownloadAllInvoices = async () => {
    if (invoices.length === 0) {
      alert("No invoices to download. Please fetch invoices first.");
      return;
    }

    try {
      // Download all invoices as PDFs with a small delay between each
      for (const inv of invoices) {
        try {
          await handleDownloadInvoice(inv.id);
          // Small delay to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Error downloading invoice ${inv.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Error downloading invoices", err);
      alert("Some invoices could not be downloaded. Please try again.");
    }
  };

  return (
    <div className="pm-tab" lang="en">
      <div className="pm-tab-header">
        <h1 className="pm-tab-title">Invoices</h1>
      </div>

      <p style={{ marginBottom: 24, color: "#666", fontSize: 14 }}>
        View all invoices in a date range, print or save them as PDF files.
      </p>

      {/* Date range controls */}
      <div className="pm-form">
        <div className="pm-form-grid-2">
          <div className="pm-form-field">
            <label className="pm-label" htmlFor="inv-start">From</label>
            <input
              id="inv-start"
              className="pm-input"
              type="text"
              value={startDate}
              onChange={handleStartDateChange}
              placeholder="YYYY-MM-DD (e.g., 2025-01-01)"
              pattern="\d{4}-\d{2}-\d{2}"
            />
            <span style={{ fontSize: 12, color: "#7a7a7a", marginTop: 4, display: 'block' }}>
              Format: YYYY-MM-DD (e.g., 2025-01-01)
            </span>
          </div>

          <div className="pm-form-field">
            <label className="pm-label" htmlFor="inv-end">To</label>
            <input
              id="inv-end"
              className="pm-input"
              type="text"
              value={endDate}
              onChange={handleEndDateChange}
              placeholder="YYYY-MM-DD (e.g., 2025-12-31)"
              pattern="\d{4}-\d{2}-\d{2}"
            />
            <span style={{ fontSize: 12, color: "#7a7a7a", marginTop: 4, display: 'block' }}>
              Format: YYYY-MM-DD (e.g., 2025-12-31)
            </span>
          </div>
        </div>

        <div className="pm-tab-actions">
          <button
            type="button"
            className="pm-btn pm-btn-primary"
            onClick={handleFetchInvoices}
            disabled={loadingInvoices}
          >
            {loadingInvoices ? "Loading..." : "View Invoices"}
          </button>

          {invoices.length > 0 && (
            <button
              type="button"
              className="pm-btn"
              onClick={handleDownloadAllInvoices}
            >
              Download All as PDF
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {invoiceError && (
        <div className="pm-alert pm-alert-error" style={{ marginTop: 16 }}>
          {invoiceError}
        </div>
      )}

      {/* Invoice list */}
      {!loadingInvoices && !invoiceError && invoices.length > 0 && (
        <>
          <div style={{ marginTop: 24, marginBottom: 12, fontSize: 14, color: "#555" }}>
            Found <strong>{invoices.length}</strong> invoice{invoices.length !== 1 ? "s" : ""} in this date range.
          </div>

          <table className="pm-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th style={{ textAlign: "right" }}>Total Amount</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="pm-td-mono">{inv.id}</td>
                  <td>{inv.date || "—"}</td>
                  <td>{inv.customerName || "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    ${Number(inv.totalAmount ?? inv.total ?? inv.totalPrice ?? 0).toFixed(2)}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        textTransform: "uppercase",
                        background: inv.status === "PAID" || inv.status === "DELIVERED" ? "#ecfdf5" : "#fef2f2",
                        color: inv.status === "PAID" || inv.status === "DELIVERED" ? "#065f46" : "#9f1239",
                      }}
                    >
                      {inv.status || "UNKNOWN"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="pm-btn"
                      style={{ padding: "4px 12px", fontSize: 12 }}
                      onClick={() => handleDownloadInvoice(inv.id)}
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!loadingInvoices &&
        !invoiceError &&
        invoices.length === 0 &&
        startDate &&
        endDate && (
          <p className="pm-empty" style={{ marginTop: 24 }}>
            No invoices found for this date range.
          </p>
        )}

      {!startDate || !endDate ? (
        <p className="pm-empty" style={{ marginTop: 24 }}>
          Please select a date range to view invoices.
        </p>
      ) : null}
    </div>
  );
}

