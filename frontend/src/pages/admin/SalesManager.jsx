// src/pages/admin/SalesManager.jsx

// BU SAYFA EKSİK!!! -> backend yazıldıktan sonra fakeFetchInvoices düzeltilecek, print invoice kısmı düzeltilecek, indirimli ürün ui'ı yapılıp eklenecek

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  meRequest,
  logoutRequest,
  listProducts,
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

// 🔸 TEMP: fake invoice fetch so UI works immediately.
// Replace this later with a real backend call.
async function fakeFetchInvoices(startDate, endDate) {
  // Just a tiny demo dataset so you can see the chart + summary.
  // Replace this with: const { data } = await listInvoicesByDateRange(...)
  return [
    {
      id: "inv-1001",
      date: startDate,
      customerName: "Demo Customer A",
      totalAmount: 120,
      totalCost: 60, // if missing, we’ll default to 50%
    },
    {
      id: "inv-1002",
      date: endDate,
      customerName: "Demo Customer B",
      totalAmount: 200,
      // no totalCost -> we’ll use 50% of sale (100)
    },
  ];
}

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

  const handleApplyDiscount = () => {
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

    const payload = {
      discountPercent: d,
      productIds: Array.from(selectedIds),
      notifyWishlist,
    };

    // FRONTEND-ONLY for now: just log + show confirmation
    // Later you can call your backend here (e.g. adminApplyDiscounts(payload))
    console.log("[SalesManager] Apply discount payload:", payload);

    setStatusKind("success");
    setStatusMessage(
      notifyWishlist
        ? "Discount campaign created. Wishlist users for these products will be notified."
        : "Discount campaign created (wishlist notifications disabled)."
    );
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
    setInvoiceError("");

    try {
      // 🔸 replace fakeFetchInvoices with real backend call later
      const data = await fakeFetchInvoices(startDate, endDate);

      setInvoices(data || []);
    } catch (err) {
      console.error("Error fetching invoices", err);
      setInvoiceError("Could not load invoices.");
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handlePrintInvoices = () => {
    // Browser print dialog – user can choose "Save as PDF"
    window.print();
  };

  // revenue / cost / profit summary
  const revenueSummary = useMemo(() => {
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

      // If backend provides a totalCost, use it. Otherwise default cost = 50% of sale price
      const explicitCost = Number(inv.totalCost ?? NaN);
      if (!Number.isNaN(explicitCost) && explicitCost > 0) {
        totalCost += explicitCost;
      } else {
        totalCost += invoiceTotal * 0.5;
      }
    });

    const profit = totalRevenue - totalCost;

    return { totalRevenue, totalCost, profit };
  }, [invoices]);

  // simple chart data: revenue per date
  const revenueChartPoints = useMemo(() => {
    if (!invoices.length) return [];

    const byDate = {};
    invoices.forEach((inv) => {
      const rawDate = inv.date || inv.createdAt || "";
      const day = rawDate.slice(0, 10); // YYYY-MM-DD
      const invoiceTotal = Number(
        inv.totalAmount ?? inv.total ?? inv.totalPrice ?? 0
      );
      if (!day) return;
      byDate[day] = (byDate[day] || 0) + invoiceTotal;
    });

    const entries = Object.entries(byDate).sort(([d1], [d2]) =>
      d1.localeCompare(d2)
    );
    if (!entries.length) return [];

    const maxVal = Math.max(...entries.map(([, v]) => v));

    return entries.map(([date, value]) => ({
      date,
      value,
      height: maxVal ? (value / maxVal) * 100 : 0,
    }));
  }, [invoices]);

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
    <div className="category-page">
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="inv-end">To</label>
                <input
                  id="inv-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
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

                {/* chart */}
                {revenueChartPoints.length > 0 && (
                  <div
                    style={{
                      marginTop: 4,
                      marginBottom: 20,
                      borderTop: "1px solid #e5e5e5",
                      paddingTop: 12,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        color: "#555",
                        marginBottom: 8,
                      }}
                    >
                      Revenue chart (per day)
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 12,
                        minHeight: 140,
                      }}
                    >
                      {revenueChartPoints.map((pt) => (
                        <div
                          key={pt.date}
                          style={{
                            flex: 1,
                            minWidth: 48,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            fontSize: 11,
                          }}
                        >
                          <div
                            style={{
                              height: 100,
                              display: "flex",
                              alignItems: "flex-end",
                              width: "100%",
                            }}
                          >
                            <div
                              style={{
                                width: "60%",
                                height: `${pt.height}%`,
                                margin: "0 auto",
                                borderRadius: 4,
                                backgroundColor: "#3d211c",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              marginTop: 4,
                              color: "#555",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {pt.date.slice(5)} {/* MM-DD */}
                          </span>
                          <span style={{ color: "#777" }}>
                            ${pt.value.toFixed(0)}
                          </span>
                        </div>
                      ))}
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
      </main>

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