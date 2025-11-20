// src/pages/Invoice.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderDetail, meRequest } from "../lib/api";
import bagIcon from "../assets/bag.png";
import searchIcon from "../assets/search.png";

export default function Invoice() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const userRes = await meRequest();
        setUser(userRes.data);
        if (orderId) {
          const orderRes = await getOrderDetail(orderId);
          setOrder(orderRes.data);
        }
      } catch (err) {
        console.error("Invoice load error:", err);
        alert("Unable to fetch invoice. Redirecting to profile.");
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [orderId, navigate]);

  const formatCurrency = (value) => {
    const amount = parseFloat(value);
    if (Number.isNaN(amount)) {
      return "$0.00";
    }
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="home-page">
        <div style={{ padding: "2rem", textAlign: "center" }}>Loading invoice...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="home-page">
        <div style={{ padding: "2rem", textAlign: "center" }}>No invoice available.</div>
      </div>
    );
  }

  const { items = [], totals = {}, shippingAddress, billingAddress, status } = order;

  return (
    <div className="home-page">
      <header className="home-topbar">
        <div className="home-left">
          <span className="home-brand" onClick={() => navigate("/home")}>
            TIDL
          </span>
        </div>
        <nav className="home-nav">
          <button className="home-nav-item" onClick={() => navigate("/category/sweatshirts")}>
            SWEATSHIRTS
          </button>
          <button className="home-nav-item" onClick={() => navigate("/category/shirts")}>
            SHIRTS
          </button>
          <button className="home-nav-item" onClick={() => navigate("/category/pants")}>
            PANTS
          </button>
          <button className="home-nav-item" onClick={() => navigate("/shop-the-look")}>
            SHOP THE LOOK
          </button>
        </nav>
        <div className="home-right">
          <img src={searchIcon} alt="search" className="home-icon" onClick={() => navigate("/search")} />
          {user && (
            <span className="login-topbar-link" style={{ cursor: "default" }}>
              {`HEY! ${user.name}`}
            </span>
          )}
          <img src={bagIcon} alt="bag" className="home-icon" onClick={() => navigate("/cart")} />
        </div>
      </header>

      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem", paddingTop: "6rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, fontSize: "2.5rem", letterSpacing: "0.1em" }}>INVOICE</h1>
          <p style={{ margin: "0.25rem 0", color: "#888" }}>Order #{order.id}</p>
          <p style={{ margin: "0", color: "#888" }}>{formatDate(order.createdAt)}</p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ border: "1px solid #e5e5e5", padding: "1rem" }}>
            <strong>Status</strong>
            <p style={{ margin: "0.25rem 0" }}>{status}</p>
          </div>
          <div style={{ border: "1px solid #e5e5e5", padding: "1rem" }}>
            <strong>Shipping Address</strong>
            {shippingAddress ? (
              <address style={{ fontStyle: "normal", margin: "0.25rem 0" }}>
                <div>{shippingAddress.fullName}</div>
                <div>{shippingAddress.line1}</div>
                {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
                <div>
                  {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                </div>
                <div>{shippingAddress.country}</div>
                {shippingAddress.phoneNumber && <div>Phone: {shippingAddress.phoneNumber}</div>}
              </address>
            ) : (
              <p style={{ margin: 0, color: "#666" }}>No shipping address recorded.</p>
            )}
          </div>
          <div style={{ border: "1px solid #e5e5e5", padding: "1rem" }}>
            <strong>Billing Address</strong>
            {billingAddress ? (
              <address style={{ fontStyle: "normal", margin: "0.25rem 0" }}>
                <div>{billingAddress.fullName}</div>
                <div>{billingAddress.line1}</div>
                {billingAddress.line2 && <div>{billingAddress.line2}</div>}
                <div>
                  {billingAddress.city}, {billingAddress.state} {billingAddress.zipCode}
                </div>
                <div>{billingAddress.country}</div>
                {billingAddress.phoneNumber && <div>Phone: {billingAddress.phoneNumber}</div>}
              </address>
            ) : (
              <p style={{ margin: 0, color: "#666" }}>No billing address recorded.</p>
            )}
          </div>
        </div>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>ORDER ITEMS</h2>
          <div style={{ border: "1px solid #e5e5e5", borderRadius: "4px", overflow: "hidden" }}>
            {items.map((item, index) => (
              <div
                key={`${item.productId}-${item.sku}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "1rem",
                  borderBottom: index === items.length - 1 ? "none" : "1px solid #e5e5e5",
                  background: index % 2 === 0 ? "#fff" : "#fafafa",
                }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>SKU: {item.sku}</div>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>Qty: {item.quantity}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{formatCurrency(item.unitPrice)}</div>
                  <div style={{ fontWeight: "600" }}>{formatCurrency(item.lineTotal)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>TOTALS</h2>
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: "4px",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Shipping</span>
              <span>{formatCurrency(totals.shipping)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", fontSize: "1.1rem" }}>
              <span>Total</span>
              <span>{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        </section>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: "0.75rem 2rem",
              border: "none",
              background: "#3d211c",
              color: "white",
              cursor: "pointer",
              fontWeight: "500",
              letterSpacing: "0.1em",
            }}
          >
            PRINT INVOICE
          </button>
          <button
            type="button"
            onClick={() => navigate("/home")}
            style={{
              padding: "0.75rem 2rem",
              border: "1px solid #3d211c",
              background: "white",
              color: "#3d211c",
              cursor: "pointer",
              fontWeight: "500",
              letterSpacing: "0.1em",
            }}
          >
            CONTINUE SHOPPING
          </button>
        </div>
      </main>
    </div>
  );
}
// src/pages/Invoice.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { meRequest, getOrderDetail } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";

export default function Invoice() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [user, setUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <header className="home-topbar" style={{ printDisplay: "none" }}>
        <div className="home-left">
          <span className="home-brand" onClick={() => navigate("/home")}>TIDL</span>
        </div>

        <nav className="home-nav">
          <button className="home-nav-item" onClick={go("/category/sweatshirts")}>SWEATSHIRTS</button>
          <button className="home-nav-item" onClick={go("/category/shirts")}>SHIRTS</button>
          <button className="home-nav-item" onClick={go("/category/pants")}>PANTS</button>
          <button className="home-nav-item" onClick={go("/shop-the-look")}>SHOP THE LOOK</button>
        </nav>

        <div className="home-right">
          <img src={searchIcon} alt="search" className="home-icon" onClick={go("/search")} />
          {user && (
            <span className="login-topbar-link" style={{ cursor: "default" }}>
              {`HEY! ${user.name}`}
            </span>
          )}
          <img src={bagIcon} alt="bag" className="home-icon" onClick={go("/cart")} />
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
        <div style={{ 
          display: "flex", 
          gap: "1rem", 
          justifyContent: "center", 
          marginTop: "2rem",
          printDisplay: "none"
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
        @media print {
          .home-topbar,
          button {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}

