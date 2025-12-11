// src/pages/Invoice.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { meRequest, getOrderDetail, logoutRequest } from "../lib/api";
import { useCartDrawer } from "../context/CartDrawerContext";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";

export default function Invoice() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { openCart } = useCartDrawer();

  const [user, setUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutRequest();
      setUser(null);
      setShowMenu(false);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await meRequest();
        setUser(userRes.data);

        const orderRes = await getOrderDetail(orderId);
        setOrder(orderRes.data);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        alert("Failed to load invoice. Please try again.");
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchData();
    }
  }, [orderId, navigate]);

  const go = (path) => () => navigate(path);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="home-page">
        <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="home-page">
        <div style={{ padding: "2rem", textAlign: "center" }}>Invoice not found.</div>
      </div>
    );
  }

  const items = order.items || [];
  const totals = order.totals || {};
  const shippingAddress = order.shippingAddress;
  const billingAddress = order.billingAddress;

  return (
    <div className="home-page">
      <header className="category-topbar no-print">
        <button className="category-brand" onClick={() => navigate("/home")}>
          TIDL
        </button>
        <nav className="category-nav">
          <button
            onClick={() => navigate("/category/sweatshirts")}
            className="category-nav-item"
          >
            SWEATSHIRTS
          </button>
          <button
            onClick={() => navigate("/category/shirts")}
            className="category-nav-item"
          >
            SHIRTS
          </button>
          <button
            onClick={() => navigate("/category/pants")}
            className="category-nav-item category-nav-item--active"
          >
            PANTS
          </button>
          <button
            onClick={() => navigate("/shop-the-look")}
            className="category-nav-item"
          >
            SHOP THE LOOK
          </button>
        </nav>
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
                  <button className="details-menu-item" onClick={go("/profile")}>
                    Details
                  </button>
                  <button className="details-menu-item" onClick={go("/wishlist")}>
                    Wishlist  
                  </button>
                  <button className="details-menu-item" onClick={handleLogout}>
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

      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem" }}>
        {/* Invoice Header */}
        <div style={{ marginBottom: "3rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "600", marginBottom: "0.5rem", letterSpacing: "0.1em" }}>
            INVOICE
          </h1>
          <p style={{ color: "#666", fontSize: "0.875rem" }}>
            Order #{order.id}
          </p>
          <p style={{ color: "#666", fontSize: "0.875rem" }}>
            {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Order Status */}
        <div style={{ 
          padding: "1rem", 
          background: "#f5f5f5", 
          marginBottom: "2rem",
          textAlign: "center"
        }}>
          <p style={{ margin: 0, fontWeight: "500" }}>
            Status: <span style={{ textTransform: "uppercase" }}>{order.status}</span>
          </p>
        </div>

        {/* Company Info & Order Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "3rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>TIDL</h3>
            <p style={{ fontSize: "0.875rem", color: "#666", margin: 0 }}>
              Online Store
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "0.875rem", color: "#666", margin: "0.25rem 0" }}>
              <strong>Order ID:</strong> {order.id}
            </p>
            <p style={{ fontSize: "0.875rem", color: "#666", margin: "0.25rem 0" }}>
              <strong>Date:</strong> {formatDate(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Shipping Address */}
        {shippingAddress && (
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem" }}>
              SHIPPING ADDRESS
            </h3>
            <div style={{ fontSize: "0.875rem", color: "#666", lineHeight: "1.6" }}>
              <p style={{ margin: "0.25rem 0", fontWeight: "500" }}>{shippingAddress.fullName}</p>
              <p style={{ margin: "0.25rem 0" }}>{shippingAddress.line1}</p>
              {shippingAddress.line2 && <p style={{ margin: "0.25rem 0" }}>{shippingAddress.line2}</p>}
              <p style={{ margin: "0.25rem 0" }}>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
              </p>
              <p style={{ margin: "0.25rem 0" }}>{shippingAddress.country}</p>
              {shippingAddress.phoneNumber && (
                <p style={{ margin: "0.25rem 0" }}>Phone: {shippingAddress.phoneNumber}</p>
              )}
            </div>
          </div>
        )}

        {/* Billing Address */}
        {billingAddress && (
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem" }}>
              BILLING ADDRESS
            </h3>
            <div style={{ fontSize: "0.875rem", color: "#666", lineHeight: "1.6" }}>
              <p style={{ margin: "0.25rem 0", fontWeight: "500" }}>{billingAddress.fullName}</p>
              <p style={{ margin: "0.25rem 0" }}>{billingAddress.line1}</p>
              {billingAddress.line2 && <p style={{ margin: "0.25rem 0" }}>{billingAddress.line2}</p>}
              <p style={{ margin: "0.25rem 0" }}>
                {billingAddress.city}, {billingAddress.state} {billingAddress.zipCode}
              </p>
              <p style={{ margin: "0.25rem 0" }}>{billingAddress.country}</p>
              {billingAddress.phoneNumber && (
                <p style={{ margin: "0.25rem 0" }}>Phone: {billingAddress.phoneNumber}</p>
              )}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>
            ORDER ITEMS
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e5e5" }}>
                <th style={{ textAlign: "left", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600" }}>
                  Item
                </th>
                <th style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600" }}>
                  Quantity
                </th>
                <th style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600" }}>
                  Unit Price
                </th>
                <th style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    <div>
                      <div style={{ fontWeight: "500" }}>{item.name}</div>
                      <div style={{ color: "#666", fontSize: "0.75rem" }}>SKU: {item.sku}</div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", padding: "0.75rem", fontSize: "0.875rem" }}>
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem" }}>
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td style={{ textAlign: "right", padding: "0.75rem", fontSize: "0.875rem", fontWeight: "500" }}>
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ marginLeft: "auto", width: "300px", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.tax && totals.tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              <span>Tax:</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
          )}
          {totals.shipping && totals.shipping > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              <span>Shipping:</span>
              <span>{formatCurrency(totals.shipping)}</span>
            </div>
          )}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            paddingTop: "1rem",
            borderTop: "2px solid #e5e5e5",
            fontSize: "1.1rem",
            fontWeight: "600"
          }}>
            <span>Total:</span>
            <span>{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>

        {/* Payment Method */}
        {order.paymentMethodRef && (
          <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f5f5f5" }}>
            <p style={{ fontSize: "0.875rem", margin: 0 }}>
              <strong>Payment Method:</strong> {order.paymentMethodRef}
            </p>
          </div>
        )}

        {/* Thank You Message */}
        <div style={{ textAlign: "center", padding: "2rem", borderTop: "1px solid #e5e5e5" }}>
          <p style={{ fontSize: "0.875rem", color: "#666", margin: 0 }}>
            Thank you for your purchase! A copy of this invoice has been sent to your email.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="invoice-actions" style={{ 
          display: "flex", 
          gap: "1rem", 
          justifyContent: "center", 
          marginTop: "2rem"
        }}>
          <button
            onClick={handlePrint}
            style={{
              padding: "0.75rem 2rem",
              background: "#3d211c",
              color: "white",
              border: "none",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            PRINT INVOICE
          </button>
          <button
            onClick={() => navigate("/home")}
            style={{
              padding: "0.75rem 2rem",
              background: "white",
              color: "#3d211c",
              border: "1px solid #3d211c",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            CONTINUE SHOPPING
          </button>
        </div>
      </main>

      <style>{`
        @page {
          margin: 0;
          size: A4;
        }
        @media print {
          header,
          .no-print,
          .no-print *,
          header.category-topbar,
          .category-topbar,
          .category-topbar *,
          button,
          .category-actions,
          .category-actions *,
          nav,
          nav *,
          .category-nav,
          .category-nav *,
          .category-icon,
          .login-topbar-link,
          .home-signin,
          .home-menu,
          .details-menu,
          .invoice-actions,
          .invoice-actions * {
            display: none !important;
            visibility: hidden !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html {
            margin: 0 !important;
            padding: 0 !important;
          }
          main {
            padding: 1rem !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

