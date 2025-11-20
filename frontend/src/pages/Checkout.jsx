// src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkout,
  getAccountDetails,
  getBasket,
  meRequest,
  processPayment,
} from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";

const EMPTY_ADDRESS = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "Turkey",
  phoneNumber: "",
};

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cartId, setCartId] = useState(() => localStorage.getItem("cartId"));
  const [basket, setBasket] = useState({ items: [], subtotal: 0 });
  const [shipping, setShipping] = useState(EMPTY_ADDRESS);
  const [billing, setBilling] = useState(EMPTY_ADDRESS);
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    holderName: "",
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await meRequest();
        setUser(userRes.data);

        const basketRes = await getBasket(userRes.data.id, cartId);
        setBasket(basketRes.data);

        if (basketRes.data.orderId) {
          localStorage.setItem("cartId", basketRes.data.orderId);
          setCartId(basketRes.data.orderId);
        }

        const accountRes = await getAccountDetails();
        setShipping((prev) => ({
          ...prev,
          fullName: userRes.data.name || prev.fullName,
          phoneNumber: accountRes.data.phoneNumber || prev.phoneNumber,
        }));
        setBilling((prev) => ({
          ...prev,
          fullName: userRes.data.name || prev.fullName,
          phoneNumber: accountRes.data.phoneNumber || prev.phoneNumber,
        }));
      } catch (err) {
        console.error("Checkout init failed:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cartId, navigate]);

  useEffect(() => {
    if (useSameAddress) {
      setBilling(shipping);
    }
  }, [shipping, useSameAddress]);

  const totals = useMemo(() => {
    const subtotal = basket.items.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || 0), 0);
    return {
      subtotal,
      shipping: 0,
      grandTotal: subtotal,
    };
  }, [basket]);

  const handleAddressChange = (setter) => (field, value) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (field, value) => {
    setPaymentDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!basket.items.length) {
      alert("Cart is empty.");
      return;
    }
    setProcessing(true);
    try {
      const checkoutRes = await checkout(cartId, shipping, billing, "new");
      const orderId = checkoutRes.data.orderId || checkoutRes.data.order?.id;
      await processPayment(orderId, { ...paymentDetails, paymentMethodId: "new" });
      localStorage.removeItem("cartId");
      navigate(`/invoice/${orderId}`);
    } catch (err) {
      console.error("Payment failed:", err);
      alert("Payment failed. Please check your details.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="home-page">
        <div style={{ padding: "2rem", textAlign: "center" }}>Loading checkout...</div>
      </div>
    );
  }

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

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem", paddingTop: "6rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "1rem" }}>CHECKOUT</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "2rem" }}>
            <div>
              <section style={{ marginBottom: "2rem" }}>
                <h2>Shipping Address</h2>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <input
                    placeholder="Full Name *"
                    value={shipping.fullName}
                    onChange={(e) => handleAddressChange(setShipping)("fullName", e.target.value)}
                    required
                    style={{ padding: "0.75rem" }}
                  />
                  <input
                    placeholder="Address Line 1 *"
                    value={shipping.line1}
                    onChange={(e) => handleAddressChange(setShipping)("line1", e.target.value)}
                    required
                    style={{ padding: "0.75rem" }}
                  />
                  <input
                    placeholder="City *"
                    value={shipping.city}
                    onChange={(e) => handleAddressChange(setShipping)("city", e.target.value)}
                    required
                    style={{ padding: "0.75rem" }}
                  />
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      placeholder="State *"
                      value={shipping.state}
                      onChange={(e) => handleAddressChange(setShipping)("state", e.target.value)}
                      required
                      style={{ padding: "0.75rem", flex: 1 }}
                    />
                    <input
                      placeholder="ZIP Code *"
                      value={shipping.zipCode}
                      onChange={(e) => handleAddressChange(setShipping)("zipCode", e.target.value)}
                      required
                      style={{ padding: "0.75rem", flex: 1 }}
                    />
                  </div>
                  <input
                    placeholder="Country *"
                    value={shipping.country}
                    onChange={(e) => handleAddressChange(setShipping)("country", e.target.value)}
                    required
                    style={{ padding: "0.75rem" }}
                  />
                  <input
                    placeholder="Phone Number *"
                    value={shipping.phoneNumber}
                    onChange={(e) => handleAddressChange(setShipping)("phoneNumber", e.target.value)}
                    required
                    style={{ padding: "0.75rem" }}
                  />
                </div>
              </section>
              <section style={{ marginBottom: "2rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={useSameAddress}
                    onChange={(e) => setUseSameAddress(e.target.checked)}
                  />
                  Billing address same as shipping
                </label>
                {!useSameAddress && (
                  <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                    <input
                      placeholder="Billing Full Name *"
                      value={billing.fullName}
                      onChange={(e) => handleAddressChange(setBilling)("fullName", e.target.value)}
                      required
                      style={{ padding: "0.75rem" }}
                    />
                    <input
                      placeholder="Billing Address *"
                      value={billing.line1}
                      onChange={(e) => handleAddressChange(setBilling)("line1", e.target.value)}
                      required
                      style={{ padding: "0.75rem" }}
                    />
                    <input
                      placeholder="Billing City *"
                      value={billing.city}
                      onChange={(e) => handleAddressChange(setBilling)("city", e.target.value)}
                      required
                      style={{ padding: "0.75rem" }}
                    />
                  </div>
                )}
              </section>
              <section>
                <h2>Payment</h2>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <input
                    placeholder="Card Number *"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => handlePaymentChange("cardNumber", e.target.value)}
                    required
                    style={{ padding: "0.75rem" }}
                  />
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      placeholder="Expiry (MM/YY) *"
                      value={paymentDetails.expiryDate}
                      onChange={(e) => handlePaymentChange("expiryDate", e.target.value)}
                      required
                      style={{ padding: "0.75rem", flex: 1 }}
                    />
                    <input
                      placeholder="CVV *"
                      value={paymentDetails.cvv}
                      onChange={(e) => handlePaymentChange("cvv", e.target.value)}
                      required
                      style={{ padding: "0.75rem", flex: 1 }}
                    />
                  </div>
                  <input
                    placeholder="Cardholder Name *"
                    value={paymentDetails.holderName}
                    onChange={(e) => handlePaymentChange("holderName", e.target.value)}
                    required
                    style={{ padding: "0.75rem" }}
                  />
                </div>
              </section>
            </div>
            <div>
              <div style={{ border: "1px solid #e5e5e5", padding: "2rem", background: "#fff" }}>
                <h2>Order Summary</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                  {basket.items.map((item) => (
                    <div
                      key={`${item.productId}-${item.sku}`}
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <span>${parseFloat(item.lineTotal || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: "1rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Subtotal</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Shipping</span>
                    <span>${totals.shipping.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: "600",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span>Total</span>
                    <span>${totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={processing}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: processing ? "#ccc" : "#3d211c",
                    color: "#fff",
                    border: "none",
                    cursor: processing ? "not-allowed" : "pointer",
                    fontWeight: "600",
                  }}
                >
                  {processing ? "PROCESSING..." : "CONFIRM PAYMENT"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

