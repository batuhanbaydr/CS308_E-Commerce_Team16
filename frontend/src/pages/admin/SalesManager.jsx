// src/pages/admin/SalesManager.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  meRequest,
  logoutRequest,
  listProducts,
  applyDiscount,
  listInvoicesByDateRange,
  getRevenueProfit,
  downloadInvoicePdf,
  listRefunds,
  decideRefund,
  markRefunded,
} from "../../lib/api";
import searchIcon from "../../assets/search.png";
import bagIcon from "../../assets/bag.png";
import { useCartDrawer } from "../../context/CartDrawerContext.jsx";

// same logic we used elsewhere
const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

const isSalesManager = (user) =>
  user?.roles?.includes("SALES_MANAGER") || user?.role === "SALES_MANAGER";

export default function SalesManager() {
  const navigate = useNavigate();
  const { openCart } = useCartDrawer();

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // ===== Discounts state =====
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  const [discountPercent, setDiscountPercent] = useState(10);
  const [notifyWishlist, setNotifyWishlist] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [statusMessage, setStatusMessage] = useState(null);
  const [statusKind, setStatusKind] = useState("success"); // "success" | "error"

  // ===== Invoices & revenue state =====
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [revenueData, setRevenueData] = useState(null);
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  // ===== Refunds state =====
  const [refunds, setRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundStatusFilter, setRefundStatusFilter] = useState(""); // "" = all, "REQUESTED", "APPROVED", etc.
  const [selectedRefundId, setSelectedRefundId] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionAction, setDecisionAction] = useState(null); // "approve" | "deny" | "markRefunded"

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

  // Handle date input with validation
  const handleStartDateChange = (e) => {
    const value = e.target.value;
    // Allow manual typing - accept YYYY-MM-DD format
    if (value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setStartDate(value);
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    // Allow manual typing - accept YYYY-MM-DD format
    if (value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setEndDate(value);
    }
  };

  // ===== user load =====
  useEffect(() => {
    (async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {}
    setUser(null);
    navigate("/home");
  };

  const go = (path) => () => navigate(path);

  // ===== header (same style as other pages, no category menu) =====
  const renderHeader = () => (
    <header className="category-topbar">
      <button className="category-brand" onClick={() => navigate("/home")}>
        TIDL
      </button>

      {/* no category nav for admin pages */}

      <div className="category-actions">
        <img
          src={searchIcon}
          alt="Search"
          className="category-icon"
          onClick={() => navigate("/search")}
        />

        {user ? (
          <span
            className="login-topbar-link"
            style={{ cursor: "default", marginRight: "0.5rem" }}
          >
            {`HEY! ${user.name}`}
          </span>
        ) : (
          <span
            className="home-signin"
            onClick={() => navigate("/login")}
            style={{ marginRight: "0.5rem", cursor: "pointer" }}
          >
            SIGN IN
          </span>
        )}

        {user && (
          <div
            className="home-menu"
            onClick={() => setShowMenu((p) => !p)}
            style={{ marginRight: "0.5rem" }}
          >
            <span />
            <span />
            <span />
            {showMenu && (
              <div className="details-menu">
                <button
                  className="details-menu-item"
                  onClick={go("/profile")}
                >
                  Details
                </button>

                <button
                  className="details-menu-item"
                  onClick={go("/wishlist")}
                >
                  Wishlist
                </button>

                {hasAdminAccess(user) && (
                  <button
                    className="details-menu-item"
                    onClick={go("/admin")}
                  >
                    Admin Panel
                  </button>
                )}

                <button
                  className="details-menu-item"
                  onClick={handleLogout}
                >
                  Log-out
                </button>
              </div>
            )}
          </div>
        )}

        <img
          src={bagIcon}
          alt="Cart"
          className="category-icon"
          onClick={openCart}
        />
      </div>
    </header>
  );

  // ===== product load for discount UI =====
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      setProductError("");

      try {
        // reuse existing API: fetch your 3 categories and merge
        const [sweatRes, shirtRes, pantsRes] = await Promise.all([
          listProducts("Sweatshirt"),
          listProducts("Shirt"),
          listProducts("Pant"),
        ]);

        const merged = [
          ...(sweatRes?.data || []),
          ...(shirtRes?.data || []),
          ...(pantsRes?.data || []),
        ];

        setProducts(merged);
      } catch (err) {
        console.error("Error loading products for sales manager", err);
        setProductError("Could not load products.");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  // build enriched product list for display (base + discounted price)
  const enrichedProducts = useMemo(() => {
    const d = Math.max(0, Math.min(Number(discountPercent) || 0, 90));
    const factor = 1 - d / 100;

    return (products || []).map((p) => {
      const base = Number(
        p.basePrice ??
          (p.variants && p.variants[0] && p.variants[0].price) ??
          0
      );
      const discounted = base > 0 ? base * factor : base;

      return {
        ...p,
        _basePrice: base,
        _discountedPrice: discounted,
      };
    });
  }, [products, discountPercent]);

  const filteredProducts = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return enrichedProducts;

    return enrichedProducts.filter((p) => {
      const haystack = [
        p.name,
        p.description,
        p.category,
        p.model,
        p.serialNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [enrichedProducts, searchTerm]);

  // ===== selection + apply discount =====
  const toggleProduct = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  };

  const handleApplyDiscount = async () => {
    const d = Number(discountPercent);
    if (!d || d <= 0 || d > 90) {
      setStatusKind("error");
      setStatusMessage("Please enter a discount between 1 and 90.");
      return;
    }
    if (selectedIds.size === 0) {
      setStatusKind("error");
      setStatusMessage("Select at least one product.");
      return;
    }

    try {
      setStatusMessage(null);
      const { data } = await applyDiscount(
        d,
        Array.from(selectedIds),
        notifyWishlist
      );

      setStatusKind("success");
      const message = notifyWishlist
        ? `Discount applied to ${data.updatedProducts} products. ${data.notifiedUsers} wishlist users notified.`
        : `Discount applied to ${data.updatedProducts} products.`;
      setStatusMessage(message);

      // Clear selection and reload products to show updated prices
      setSelectedIds(new Set());
      const [sweatRes, shirtRes, pantsRes] = await Promise.all([
        listProducts("Sweatshirt"),
        listProducts("Shirt"),
        listProducts("Pant"),
      ]);
      const merged = [
        ...(sweatRes?.data || []),
        ...(shirtRes?.data || []),
        ...(pantsRes?.data || []),
      ];
      setProducts(merged);
    } catch (err) {
      console.error("Error applying discount", err);
      setStatusKind("error");
      setStatusMessage(
        err.response?.data?.message || "Failed to apply discount. Please try again."
      );
    }
  };

  // ===== Invoices: fetch + summary + chart =====

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
    setLoadingRevenue(true);
    setInvoiceError("");

    try {
      // Fetch invoices
      const invoicesResponse = await listInvoicesByDateRange(startDate, endDate);
      const invoicesData = invoicesResponse.data || [];
      
      // Transform backend data to frontend format
      const transformedInvoices = invoicesData.map((inv) => ({
        id: inv.orderId,
        date: inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "",
        customerName: inv.userId || "Unknown",
        totalAmount: inv.grandTotal ? Number(inv.grandTotal) : 0,
        status: inv.status || "UNKNOWN",
      }));

      setInvoices(transformedInvoices);

      // Fetch revenue/profit data for charts
      const revenueResponse = await getRevenueProfit(startDate, endDate, "day");
      setRevenueData(revenueResponse.data);
    } catch (err) {
      console.error("Error fetching invoices", err);
      setInvoiceError(
        err.response?.data?.message || "Could not load invoices."
      );
    } finally {
      setLoadingInvoices(false);
      setLoadingRevenue(false);
    }
  };

  const handlePrintInvoices = async () => {
    if (invoices.length === 0) {
      setInvoiceError("No invoices to print. Please fetch invoices first.");
      return;
    }

    try {
      // Download all invoices as PDFs
      for (const inv of invoices) {
        try {
          const response = await downloadInvoicePdf(inv.id);
          const blob = new Blob([response.data], { type: "application/pdf" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `invoice-${inv.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (err) {
          console.error(`Error downloading invoice ${inv.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Error printing invoices", err);
      setInvoiceError("Could not download invoices.");
    }
  };

  // ===== Refunds: fetch + actions =====

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
    if (user && isSalesManager(user)) {
      handleFetchRefunds();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refundStatusFilter, user]);

  // revenue / cost / profit summary (from backend if available, otherwise calculate)
  const revenueSummary = useMemo(() => {
    if (revenueData) {
      return {
        totalRevenue: Number(revenueData.revenue || 0),
        totalCost: Number(revenueData.cost || 0),
        profit: Number(revenueData.profit || 0),
      };
    }

    if (!invoices.length) {
      return {
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
      };
    }

    let totalRevenue = 0;
    let totalCost = 0;

    invoices.forEach((inv) => {
      const invoiceTotal = Number(
        inv.totalAmount ?? inv.total ?? inv.totalPrice ?? 0
      );

      totalRevenue += invoiceTotal;
      // Default cost = 50% of sale price
      totalCost += invoiceTotal * 0.5;
    });

    const profit = totalRevenue - totalCost;

    return { totalRevenue, totalCost, profit };
  }, [invoices, revenueData]);

  // Chart data: use backend series if available, otherwise calculate from invoices
  const chartData = useMemo(() => {
    if (revenueData && revenueData.series && revenueData.series.length > 0) {
      return revenueData.series.map((point) => ({
        date: point.bucket,
        revenue: Number(point.revenue || 0),
        profit: Number(point.profit || 0),
      }));
    }

    if (!invoices.length) return [];

    const byDate = {};
    invoices.forEach((inv) => {
      const rawDate = inv.date || inv.createdAt || "";
      const day = rawDate.slice(0, 10); // YYYY-MM-DD
      const invoiceTotal = Number(
        inv.totalAmount ?? inv.total ?? inv.totalPrice ?? 0
      );
      if (!day) return;
      if (!byDate[day]) {
        byDate[day] = { revenue: 0, profit: 0 };
      }
      byDate[day].revenue += invoiceTotal;
      byDate[day].profit += invoiceTotal * 0.5; // 50% profit assumption
    });

    return Object.entries(byDate)
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        profit: data.revenue - data.profit,
      }));
  }, [invoices, revenueData]);

  // Box plot data: revenue distribution
  const boxPlotData = useMemo(() => {
    if (!chartData.length) return null;

    const revenues = chartData.map((d) => d.revenue).sort((a, b) => a - b);
    if (revenues.length === 0) return null;

    const q1Index = Math.floor(revenues.length * 0.25);
    const medianIndex = Math.floor(revenues.length * 0.5);
    const q3Index = Math.floor(revenues.length * 0.75);

    return {
      min: revenues[0],
      q1: revenues[q1Index],
      median: revenues[medianIndex],
      q3: revenues[q3Index],
      max: revenues[revenues.length - 1],
      mean: revenues.reduce((a, b) => a + b, 0) / revenues.length,
    };
  }, [chartData]);

  // Pie chart data: revenue breakdown
  const pieChartData = useMemo(() => {
    if (!revenueSummary || revenueSummary.totalRevenue === 0) return null;

    return [
      {
        label: "Revenue",
        value: revenueSummary.totalRevenue,
        color: "#3d211c",
      },
      {
        label: "Cost",
        value: revenueSummary.totalCost,
        color: "#b91c1c",
      },
      {
        label: "Profit",
        value: Math.max(0, revenueSummary.profit),
        color: "#166534",
      },
    ];
  }, [revenueSummary]);

  // ===== loading / guard states =====
  if (loadingUser) {
    return (
      <div className="category-page">
        {renderHeader()}
        <main className="profile-wrapper">
          <p className="product-loading">Loading your account…</p>
        </main>
      </div>
    );
  }

  if (!user || !isSalesManager(user)) {
    return (
      <div className="category-page">
        {renderHeader()}
        <main className="profile-wrapper">
          <div className="profile-main">
            <h1 className="profile-title">Sales Manager Panel</h1>
            <p className="profile-subtitle">
              This page is only available for Sales Managers.
            </p>
            <button
              className="profile-button"
              style={{ marginTop: "16px", maxWidth: 220 }}
              onClick={() => navigate("/admin")}
            >
              Back to Admin Area
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ===== main UI =====
  return (
    <div className="category-page" lang="en">
      {renderHeader()}

      <main className="profile-wrapper">
        {/* hero / intro (reuse profile typography) */}
        <section className="profile-hero">
          <p className="profile-eyebrow">Back office</p>
          <h1 className="profile-heading">Sales Manager</h1>
          <p className="profile-subheading">
            Set discounts and review revenue / profit between dates.
          </p>
        </section>

        {/* ======================= DISCOUNT CARD ======================= */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h2>Discount campaign</h2>
            <p>
              Choose the items and a percentage discount. New prices are
              previewed before applying.
            </p>
          </div>

          <div className="profile-card-body">
            {/* top controls */}
            <div className="profile-form">
              <div className="profile-field">
                <label htmlFor="discount-percent">
                  Discount rate (%)
                </label>
                <input
                  id="discount-percent"
                  type="number"
                  min={0}
                  max={90}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
                <span style={{ fontSize: 12, color: "#7a7a7a" }}>
                  Recommended: between 5% and 50%.
                </span>
              </div>

              <div className="profile-field">
                <label htmlFor="sales-search">
                  Filter products
                </label>
                <input
                  id="sales-search"
                  type="text"
                  placeholder="Search by name, description, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div
                className="profile-form-actions"
                style={{ justifyContent: "space-between" }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: "#5a5a5a",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={notifyWishlist}
                    onChange={(e) =>
                      setNotifyWishlist(e.target.checked)
                    }
                  />
                  Notify users who have these products in their wishlist
                </label>

                <button
                  type="button"
                  className="profile-button"
                  style={{ maxWidth: 260 }}
                  onClick={handleApplyDiscount}
                >
                  Apply discount to selected
                </button>
              </div>
            </div>

            {/* product list */}
            {loadingProducts && <p>Loading products…</p>}
            {!loadingProducts && productError && (
              <p style={{ color: "#b91c1c", fontSize: 13 }}>
                {productError}
              </p>
            )}

            {!loadingProducts && !productError && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 8,
                    marginBottom: 8,
                    fontSize: 13,
                    color: "#555",
                  }}
                >
                  <span>
                    Showing{" "}
                    <strong>{filteredProducts.length}</strong> products
                  </span>
                  <button
                    type="button"
                    className="profile-button"
                    style={{
                      padding: "4px 10px",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                    onClick={handleSelectAll}
                  >
                    {selectedIds.size === filteredProducts.length &&
                    filteredProducts.length > 0
                      ? "Clear selection"
                      : "Select all in view"}
                  </button>
                </div>

                <ul className="profile-list">
                  {filteredProducts.map((p) => {
                    const checked = selectedIds.has(p.id);
                    return (
                      <li key={p.id} className="profile-list-item">
                        <div className="profile-list-item-header">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProduct(p.id)}
                            />
                            <span>{p.name}</span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 4,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                color: "#555",
                              }}
                            >
                              Base:{" "}
                              <strong>
                                ${p._basePrice.toFixed(2)}
                              </strong>
                            </span>
                            {discountPercent > 0 && (
                              <span
                                style={{
                                  fontSize: 13,
                                  color: "#3d211c",
                                }}
                              >
                                New:{" "}
                                <strong>
                                  $
                                  {p._discountedPrice.toFixed(2)}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="profile-list-item-meta">
                          <span>
                            Category:{" "}
                            {p.category || "—"}
                          </span>
                          {discountPercent > 0 && (
                            <span>
                              Discount:{" "}
                              {Math.max(
                                0,
                                Math.min(
                                  Number(discountPercent) || 0,
                                  90
                                )
                              )}
                              %
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="profile-list-item-description">
                            {p.description}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </section>

        {/* ================== INVOICES & REVENUE CARD ================== */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h2>Invoices & revenue</h2>
            <p>
              View all invoices in a date range, print or save them as PDF, and
              see revenue, cost and profit.
            </p>
          </div>

          <div className="profile-card-body">
            {/* date range + actions */}
            <div className="profile-form">
              <div className="profile-field">
                <label htmlFor="inv-start">From</label>
                <input
                  id="inv-start"
                  type="date"
                  lang="en-US"
                  value={formatDateForInput(startDate)}
                  onChange={handleStartDateChange}
                  placeholder="YYYY-MM-DD"
                  pattern="\d{4}-\d{2}-\d{2}"
                  style={{ 
                    fontFamily: 'inherit',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
                <span style={{ fontSize: 12, color: "#7a7a7a", marginTop: 4, display: 'block' }}>
                  Format: YYYY-MM-DD (e.g., 2025-01-01) - You can type manually or use the calendar
                </span>
              </div>

              <div className="profile-field">
                <label htmlFor="inv-end">To</label>
                <input
                  id="inv-end"
                  type="date"
                  lang="en-US"
                  value={formatDateForInput(endDate)}
                  onChange={handleEndDateChange}
                  placeholder="YYYY-MM-DD"
                  pattern="\d{4}-\d{2}-\d{2}"
                  style={{ 
                    fontFamily: 'inherit',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%'
                  }}
                />
                <span style={{ fontSize: 12, color: "#7a7a7a", marginTop: 4, display: 'block' }}>
                  Format: YYYY-MM-DD (e.g., 2025-12-31) - You can type manually or use the calendar
                </span>
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-button"
                  style={{ maxWidth: 180 }}
                  onClick={handleFetchInvoices}
                >
                  View invoices
                </button>

                <button
                  type="button"
                  className="profile-button"
                  style={{ maxWidth: 180 }}
                  onClick={handlePrintInvoices}
                >
                  Print / Save as PDF
                </button>
              </div>
            </div>

            {loadingInvoices && <p>Loading invoices…</p>}
            {!loadingInvoices && invoiceError && (
              <p style={{ color: "#b91c1c", fontSize: 13 }}>
                {invoiceError}
              </p>
            )}

            {/* summary */}
            {!loadingInvoices && !invoiceError && invoices.length > 0 && (
              <>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    marginTop: 16,
                    marginBottom: 12,
                    fontSize: 14,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "#f5f3f2",
                    }}
                  >
                    <strong>Revenue:</strong>{" "}
                    ${revenueSummary.totalRevenue.toFixed(2)}
                  </div>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "#f5f3f2",
                    }}
                  >
                    <strong>Cost (estimated):</strong>{" "}
                    ${revenueSummary.totalCost.toFixed(2)}
                  </div>
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      background:
                        revenueSummary.profit >= 0
                          ? "#ecfdf3"
                          : "#fef2f2",
                      color:
                        revenueSummary.profit >= 0
                          ? "#166534"
                          : "#b91c1c",
                    }}
                  >
                    <strong>
                      {revenueSummary.profit >= 0 ? "Profit" : "Loss"}:
                    </strong>{" "}
                    ${revenueSummary.profit.toFixed(2)}
                  </div>
                </div>

                {/* Charts: Box Plot and Pie Chart */}
                {chartData.length > 0 && (
                  <div
                    style={{
                      marginTop: 4,
                      marginBottom: 20,
                      borderTop: "1px solid #e5e5e5",
                      paddingTop: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 24,
                        marginBottom: 20,
                      }}
                    >
                      {/* Box Plot */}
                      {boxPlotData && (
                        <div>
                          <p
                            style={{
                              fontSize: 13,
                              color: "#555",
                              marginBottom: 12,
                              fontWeight: 500,
                            }}
                          >
                            Revenue Distribution (Box Plot)
                          </p>
                          <div
                            style={{
                              position: "relative",
                              height: 200,
                              border: "1px solid #e5e5e5",
                              borderRadius: 6,
                              padding: 16,
                              background: "#fafafa",
                            }}
                          >
                            <svg
                              width="100%"
                              height="100%"
                              style={{ overflow: "visible" }}
                            >
                              {/* Y-axis */}
                              <line
                                x1="40"
                                y1="20"
                                x2="40"
                                y2="160"
                                stroke="#ccc"
                                strokeWidth="1"
                              />
                              {/* Box */}
                              <rect
                                x="60"
                                y={160 - (boxPlotData.q3 / boxPlotData.max) * 120}
                                width="80"
                                height={
                                  ((boxPlotData.q3 - boxPlotData.q1) /
                                    boxPlotData.max) *
                                  120
                                }
                                fill="#3d211c"
                                opacity="0.3"
                                stroke="#3d211c"
                                strokeWidth="2"
                              />
                              {/* Median line */}
                              <line
                                x1="60"
                                y1={160 - (boxPlotData.median / boxPlotData.max) * 120}
                                x2="140"
                                y2={160 - (boxPlotData.median / boxPlotData.max) * 120}
                                stroke="#3d211c"
                                strokeWidth="2"
                              />
                              {/* Whiskers */}
                              <line
                                x1="100"
                                y1={160 - (boxPlotData.min / boxPlotData.max) * 120}
                                x2="100"
                                y2={160 - (boxPlotData.q1 / boxPlotData.max) * 120}
                                stroke="#3d211c"
                                strokeWidth="2"
                              />
                              <line
                                x1="100"
                                y1={160 - (boxPlotData.q3 / boxPlotData.max) * 120}
                                x2="100"
                                y2={160 - (boxPlotData.max / boxPlotData.max) * 120}
                                stroke="#3d211c"
                                strokeWidth="2"
                              />
                              {/* Min/Max markers */}
                              <line
                                x1="90"
                                y1={160 - (boxPlotData.min / boxPlotData.max) * 120}
                                x2="110"
                                y2={160 - (boxPlotData.min / boxPlotData.max) * 120}
                                stroke="#3d211c"
                                strokeWidth="2"
                              />
                              <line
                                x1="90"
                                y1={160 - (boxPlotData.max / boxPlotData.max) * 120}
                                x2="110"
                                y2={160 - (boxPlotData.max / boxPlotData.max) * 120}
                                stroke="#3d211c"
                                strokeWidth="2"
                              />
                            </svg>
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: 11,
                                color: "#666",
                              }}
                            >
                              <div>
                                Min: ${boxPlotData.min.toFixed(2)} | Q1: $
                                {boxPlotData.q1.toFixed(2)} | Median: $
                                {boxPlotData.median.toFixed(2)}
                              </div>
                              <div>
                                Q3: ${boxPlotData.q3.toFixed(2)} | Max: $
                                {boxPlotData.max.toFixed(2)} | Mean: $
                                {boxPlotData.mean.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pie Chart */}
                      {pieChartData && (
                        <div>
                          <p
                            style={{
                              fontSize: 13,
                              color: "#555",
                              marginBottom: 12,
                              fontWeight: 500,
                            }}
                          >
                            Revenue Breakdown (Pie Chart)
                          </p>
                          <div
                            style={{
                              position: "relative",
                              height: 200,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg width="180" height="180" viewBox="0 0 200 200">
                              {(() => {
                                const total = pieChartData.reduce(
                                  (sum, item) => sum + item.value,
                                  0
                                );
                                let currentAngle = -90;
                                const radius = 70;
                                const centerX = 100;
                                const centerY = 100;

                                return pieChartData.map((item, index) => {
                                  const percentage =
                                    total > 0 ? (item.value / total) * 100 : 0;
                                  const angle = (percentage / 100) * 360;
                                  const startAngle = currentAngle;
                                  const endAngle = currentAngle + angle;

                                  const x1 =
                                    centerX +
                                    radius *
                                      Math.cos((startAngle * Math.PI) / 180);
                                  const y1 =
                                    centerY +
                                    radius *
                                      Math.sin((startAngle * Math.PI) / 180);
                                  const x2 =
                                    centerX +
                                    radius * Math.cos((endAngle * Math.PI) / 180);
                                  const y2 =
                                    centerY +
                                    radius * Math.sin((endAngle * Math.PI) / 180);

                                  const largeArcFlag = angle > 180 ? 1 : 0;

                                  const pathData = [
                                    `M ${centerX} ${centerY}`,
                                    `L ${x1} ${y1}`,
                                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                    "Z",
                                  ].join(" ");

                                  currentAngle += angle;

                                  return (
                                    <path
                                      key={index}
                                      d={pathData}
                                      fill={item.color}
                                      stroke="#fff"
                                      strokeWidth="2"
                                    />
                                  );
                                });
                              })()}
                            </svg>
                            <div
                              style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                fontSize: 11,
                              }}
                            >
                              {pieChartData.map((item, index) => (
                                <div
                                  key={index}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 12,
                                      height: 12,
                                      backgroundColor: item.color,
                                      borderRadius: 2,
                                    }}
                                  />
                                  <span style={{ color: "#666" }}>
                                    {item.label}: $
                                    {item.value.toFixed(2)} (
                                    {revenueSummary.totalRevenue > 0
                                      ? (
                                          (item.value /
                                            revenueSummary.totalRevenue) *
                                          100
                                        ).toFixed(1)
                                      : 0}
                                    %)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* invoice list */}
                <ul className="profile-list">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="profile-list-item">
                      <div className="profile-list-item-header">
                        <div>
                          <span>Invoice #{inv.id}</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 2,
                          }}
                        >
                          <span style={{ fontSize: 12, color: "#555" }}>
                            {inv.date || inv.createdAt || "—"}
                          </span>
                          <span>
                            <strong>
                              $
                              {Number(
                                inv.totalAmount ??
                                  inv.total ??
                                  inv.totalPrice ??
                                  0
                              ).toFixed(2)}
                            </strong>
                          </span>
                        </div>
                      </div>
                      <div className="profile-list-item-meta">
                        <span>
                          Customer:{" "}
                          {inv.customerName || inv.customerEmail || "—"}
                        </span>
                        {inv.status && (
                          <span>Status: {inv.status}</span>
                        )}
                      </div>
                      {inv.notes && (
                        <p className="profile-list-item-description">
                          {inv.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {!loadingInvoices &&
              !invoiceError &&
              invoices.length === 0 &&
              startDate &&
              endDate && (
                <p style={{ fontSize: 13, color: "#555", marginTop: 12 }}>
                  No invoices found for this date range.
                </p>
              )}
          </div>
        </section>

        {/* ================== REFUND MANAGEMENT CARD ================== */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h2>Refund Management</h2>
            <p>
              Review and process customer refund requests. Approve or deny requests, and mark refunds as completed when products are returned.
            </p>
          </div>

          <div className="profile-card-body">
            {/* Filter */}
            <div className="profile-form">
              <div className="profile-field">
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

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-button"
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
              <ul className="profile-list">
                {refunds.map((refund) => (
                  <li key={refund.id} className="profile-list-item">
                    <div className="profile-list-item-header">
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
                    <div className="profile-list-item-meta">
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
                      <p className="profile-list-item-description">
                        <strong>Customer Note:</strong> {refund.customerNote}
                      </p>
                    )}
                    {refund.managerNote && (
                      <p className="profile-list-item-description">
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
                            className="profile-button"
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
                            className="profile-button"
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
                          className="profile-button"
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
        </section>
      </main>

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
              <div className="profile-field" style={{ marginBottom: 16 }}>
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
                className="profile-button"
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
                className="profile-button"
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

      {statusMessage && (
        <div
          className="category-toast"
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