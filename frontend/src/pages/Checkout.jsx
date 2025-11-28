// src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  checkout,
  getAccountDetails,
  getBasket,
  meRequest,
  processPayment,
  logoutRequest,
} from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

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
  const { openCart } = useCartDrawer();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const CART_STORAGE_KEY = "tidl_cart_id";
  const [cartId, setCartId] = useState(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(CART_STORAGE_KEY) || null;
  });
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

        // Get cartId from localStorage if not set
        const currentCartId = cartId || localStorage.getItem(CART_STORAGE_KEY);
        const basketRes = await getBasket({ userId: userRes.data.id, cartId: currentCartId });
        setBasket(basketRes.data);

        if (basketRes.data.orderId) {
          localStorage.setItem(CART_STORAGE_KEY, basketRes.data.orderId);
          if (!cartId) {
            setCartId(basketRes.data.orderId);
          }
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
  }, [navigate]);

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

  const go = (path) => () => navigate(path);
  const handleLogout = async () => {
    try { await logoutRequest(); } catch {}
    setUser(null);
    navigate("/home");
  };

  // Set English validation messages
  const handleInvalid = (e) => {
    e.target.setCustomValidity("Please fill in this field.");
  };

  const handleInput = (e) => {
    e.target.setCustomValidity("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!basket.items.length) {
      alert("Cart is empty.");
      return;
    }
    setProcessing(true);
    try {
      const currentCartId = cartId || localStorage.getItem(CART_STORAGE_KEY);
      const checkoutRes = await checkout(currentCartId, shipping, billing, paymentDetails);
      const orderId = checkoutRes.data.orderId || checkoutRes.data.order?.id || checkoutRes.data.id;
      await processPayment(orderId, { ...paymentDetails, paymentMethodId: "new" });
      localStorage.removeItem(CART_STORAGE_KEY);
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
      <div className="category-page">
        <div style={{ padding: "2rem", textAlign: "center" }}>Loading checkout...</div>
      </div>
    );
  }

  return (
    <div className="category-page">
      <header className="category-topbar">
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
            className="category-nav-item"
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

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem", paddingTop: "5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "1.5rem", letterSpacing: "0.05em" }}>CHECKOUT</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "3rem" }}>
            <div>
              <section style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", letterSpacing: "0.03em" }}>Shipping Address</h2>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <input
                    placeholder="Full Name *"
                    value={shipping.fullName}
                    onChange={(e) => handleAddressChange(setShipping)("fullName", e.target.value)}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    required
                    style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                  />
                  <input
                    placeholder="Address Line 1 *"
                    value={shipping.line1}
                    onChange={(e) => handleAddressChange(setShipping)("line1", e.target.value)}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    required
                    style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                  />
                  <input
                    placeholder="City *"
                    value={shipping.city}
                    onChange={(e) => handleAddressChange(setShipping)("city", e.target.value)}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    required
                    style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      placeholder="State *"
                      value={shipping.state}
                      onChange={(e) => handleAddressChange(setShipping)("state", e.target.value)}
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      required
                      style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit", flex: 1 }}
                    />
                    <input
                      placeholder="ZIP Code *"
                      value={shipping.zipCode}
                      onChange={(e) => handleAddressChange(setShipping)("zipCode", e.target.value)}
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      required
                      style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit", flex: 1 }}
                    />
                  </div>
                  <input
                    placeholder="Country *"
                    value={shipping.country}
                    onChange={(e) => handleAddressChange(setShipping)("country", e.target.value)}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    required
                    style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                  />
                  <input
                    placeholder="Phone Number *"
                    value={shipping.phoneNumber}
                    onChange={(e) => handleAddressChange(setShipping)("phoneNumber", e.target.value)}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    required
                    style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                  />
                </div>
              </section>
              <section style={{ marginBottom: "2.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "14px" }}>
                  <input
                    type="checkbox"
                    checked={useSameAddress}
                    onChange={(e) => setUseSameAddress(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  Billing address same as shipping
                </label>
                {!useSameAddress && (
                  <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                    <input
                      placeholder="Billing Full Name *"
                      value={billing.fullName}
                      onChange={(e) => handleAddressChange(setBilling)("fullName", e.target.value)}
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      required
                      style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                    />
                    <input
                      placeholder="Billing Address *"
                      value={billing.line1}
                      onChange={(e) => handleAddressChange(setBilling)("line1", e.target.value)}
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      required
                      style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                    />
                    <input
                      placeholder="Billing City *"
                      value={billing.city}
                      onChange={(e) => handleAddressChange(setBilling)("city", e.target.value)}
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      required
                      style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                    />
                  </div>
                )}
              </section>
              <section>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", letterSpacing: "0.03em" }}>Payment</h2>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <input
                    placeholder="Card Number *"
                    value={paymentDetails.cardNumber}
                    onChange={(e) => handlePaymentChange("cardNumber", e.target.value)}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    required
                    style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <input
                      placeholder="Expiry (MM/YY) *"
                      value={paymentDetails.expiryDate}
                      onChange={(e) => handlePaymentChange("expiryDate", e.target.value)}
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      required
                      style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit", flex: 1 }}
                    />
                    <input
                      placeholder="CVV *"
                      value={paymentDetails.cvv}
                      onChange={(e) => handlePaymentChange("cvv", e.target.value)}
                      onInvalid={handleInvalid}
                      onInput={handleInput}
                      required
                      style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit", flex: 1 }}
                    />
                  </div>
                  <input
                    placeholder="Cardholder Name *"
                    value={paymentDetails.holderName}
                    onChange={(e) => handlePaymentChange("holderName", e.target.value)}
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                    required
                    style={{ padding: "0.75rem", border: "1px solid #e5e5e5", fontSize: "14px", fontFamily: "inherit" }}
                  />
                </div>
              </section>
            </div>
            <div>
              <div style={{ border: "1px solid #e5e5e5", padding: "2rem", background: "#fff" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.5rem", letterSpacing: "0.03em" }}>Order Summary</h2>
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

