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
