// src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAccountDetails,
  getBasket,
  meRequest,
  checkout,
  logoutRequest,
} from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";
import CategoryTopbar from "../components/CategoryTopbar.jsx";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

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

const CART_STORAGE_KEY = "tidl_cart_id";

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [cartId, setCartId] = useState(() =>
      localStorage.getItem(CART_STORAGE_KEY)
  );
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
  const { openCart } = useCartDrawer();
  const [showMenu, setShowMenu] = useState(false);
  const go = (path) => () => navigate(path);

  // ⭐ Profilde kaydedilmiş adresler
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch (err) {
      console.log("logout error (ignored):", err);
    }
    navigate("/login");
  };

  // ------------------------------------------------------------------
  //   INIT: user + basket + account + saved addresses
  // ------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const userRes = await meRequest();
        const userData = userRes.data;
        setUser(userData);

        // Basket
        const basketRes = await getBasket({ userId: userData.id, cartId });
        setBasket(basketRes.data);

        if (basketRes.data.orderId) {
          localStorage.setItem(CART_STORAGE_KEY, basketRes.data.orderId);
          setCartId(basketRes.data.orderId);
        }

        const accountRes = await getAccountDetails();
        const phoneFromAccount = accountRes.data?.phoneNumber || "";

        // ⭐ Profilden kaydedilen adresleri localStorage'dan oku
        let addresses = [];
        try {
          const raw = localStorage.getItem(`addresses_${userData.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              addresses = parsed;
            }
          }
        } catch (err) {
          console.error("Error loading saved addresses from localStorage:", err);
        }

        setSavedAddresses(addresses);

        if (addresses.length > 0 && !useNewAddress) {
          // Varsayılan: ilk adres seçili + shipping formu dolu
          const a = addresses[0];
          setSelectedAddressId(a.id);
          setShipping((prev) => ({
            ...prev,
            fullName: userData.name || prev.fullName,
            phoneNumber: phoneFromAccount || prev.phoneNumber,
            line1: a.line1 || "",
            city: a.city || "",
            state: a.district || "",
            zipCode: a.zipCode || "",
            country: "Turkey",
          }));
        } else {
          // Adres yoksa en azından isim + telefon dolu olsun
          setShipping((prev) => ({
            ...prev,
            fullName: userData.name || prev.fullName,
            phoneNumber: phoneFromAccount || prev.phoneNumber,
          }));
        }

        setBilling((prev) => ({
          ...prev,
          fullName: userData.name || prev.fullName,
          phoneNumber: phoneFromAccount || prev.phoneNumber,
        }));
      } catch (err) {
        console.error("Checkout init failed:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [cartId, navigate, useNewAddress]);

  // Shipping değişince "same as shipping" ise billing'i sync et
  useEffect(() => {
    if (useSameAddress) {
      setBilling(shipping);
    }
  }, [shipping, useSameAddress]);

  // simple fake shipping (same as cart.jsx)
  const estimatedShipping = 8.5;

  const totals = useMemo(() => {
    const subtotal = basket.items.reduce(
        (sum, item) => sum + (parseFloat(item.lineTotal) || 0),
        0
    );
    return {
      subtotal,
      shipping: estimatedShipping,
      grandTotal: subtotal + estimatedShipping,
    };
  }, [basket]);

  const handleAddressChange = (setter) => (field, value) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (field, value) => {
    setPaymentDetails((prev) => ({ ...prev, [field]: value }));
  };

  // ------------------------------------------------------------------
  //   Saved address seçilince shipping formunu doldur
  // ------------------------------------------------------------------
  const handleSelectSavedAddress = (address) => {
    setUseNewAddress(false);
    setSelectedAddressId(address.id);

    setShipping((prev) => ({
      ...prev,
      fullName: user?.name || prev.fullName,
      line1: address.line1 || "",
      city: address.city || "",
      state: address.district || "",
      zipCode: address.zipCode || "",
      country: "Turkey",
    }));
  };

  const handleUseNewAddress = () => {
    setUseNewAddress(true);
    setSelectedAddressId(null);
    // Formu sıfırla ama ismi koru
    setShipping((prev) => ({
      ...EMPTY_ADDRESS,
      fullName: user?.name || "",
      phoneNumber: prev.phoneNumber,
    }));
  };

  // ------------------------------------------------------------------
  //   Submit
  // ------------------------------------------------------------------
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!basket.items.length) {
      alert("Cart is empty.");
      return;
    }
    setProcessing(true);
    try {
      const checkoutRes = await checkout(
          cartId,
          shipping,
          billing,
          paymentDetails,
          useSameAddress
      );
      // Backend returns OrderDetailDTO with id field (MongoDB unique ID)
      const orderId = checkoutRes.data.id || checkoutRes.data.orderId;
      if (!orderId) {
        throw new Error("Order ID not received from server");
      }
      localStorage.removeItem(CART_STORAGE_KEY);
      navigate(`/invoice/${orderId}`);
    } catch (err) {
      console.error("Checkout failed:", err);
      const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          "Checkout failed. Please check your details.";
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
        <div className="category-page">
          <div style={{ padding: "2rem", textAlign: "center" }}>
            Loading checkout...
          </div>
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

                      {/* 🔐 Only for SALES_MANAGER / PRODUCT_MANAGER / SUPPORT_AGENT */}
                      {hasAdminAccess(user) && (
                        <button
                          className="details-menu-item"
                          onClick={go("/admin")}
                        >
                          Admin Panel
                        </button>
                      )}

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

        <main className="profile-wrapper">
          <section className="profile-hero">
            <h1 className="profile-heading">CHECKOUT</h1>
            <p className="profile-subheading">
              Complete your order by filling in your shipping and payment details.
            </p>
          </section>

          <form onSubmit={handleSubmit}>
            <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 400px",
                  gap: "2rem",
                }}
            >
              {/* LEFT: shipping + billing + payment */}
              <div>
                {/* SHIPPING ADDRESS */}
                <section className="profile-card" style={{ marginBottom: "2rem" }}>
                  <header className="profile-card-header">
                    <h2>Shipping Address</h2>
                  </header>
                  <div className="profile-card-body">
                    {savedAddresses.length > 0 && (
                        <div style={{ marginBottom: "1.5rem" }}>
                          <label
                              style={{
                                display: "block",
                                marginBottom: "0.75rem",
                                fontWeight: "500",
                              }}
                          >
                            Select a saved address or enter a new one:
                          </label>
                          <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                                marginBottom: "1rem",
                              }}
                          >
                            {savedAddresses.map((address) => (
                                <label
                                    key={address.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      padding: "0.75rem",
                                      border:
                                          selectedAddressId === address.id &&
                                          !useNewAddress
                                              ? "2px solid #3d211c"
                                              : "1px solid #e5e5e5",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      backgroundColor:
                                          selectedAddressId === address.id &&
                                          !useNewAddress
                                              ? "#f9f9f9"
                                              : "#fff",
                                    }}
                                >
                                  <input
                                      type="radio"
                                      name="shippingAddress"
                                      checked={
                                          selectedAddressId === address.id &&
                                          !useNewAddress
                                      }
                                      onChange={() => handleSelectSavedAddress(address)}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <strong>{address.label}</strong>
                                    <p
                                        style={{
                                          margin: "0.25rem 0 0 0",
                                          color: "#666",
                                          fontSize: "0.9rem",
                                        }}
                                    >
                                      {address.line1}
                                      <br />
                                      {(address.zipCode || address.city) && (
                                          <>
                                            {address.zipCode && `${address.zipCode} `}
                                            {address.city}
                                          </>
                                      )}
                                      {address.district && (
                                          <>
                                            <br />
                                            {address.district}
                                          </>
                                      )}
                                    </p>
                                  </div>
                                </label>
                            ))}

                            <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  padding: "0.75rem",
                                  border: useNewAddress
                                      ? "2px solid #3d211c"
                                      : "1px solid #e5e5e5",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  backgroundColor: useNewAddress
                                      ? "#f9f9f9"
                                      : "#fff",
                                }}
                            >
                              <input
                                  type="radio"
                                  name="shippingAddress"
                                  checked={useNewAddress}
                                  onChange={handleUseNewAddress}
                              />
                              <strong>Use a new address</strong>
                            </label>
                          </div>
                        </div>
                    )}

                    {/* Shipping form */}
                    <form className="profile-form">
                      <label className="profile-field">
                      <span>
                        Full Name{" "}
                        <span style={{ color: "#d32f2f" }}>*</span>
                      </span>
                        <input
                            type="text"
                            value={shipping.fullName}
                            onChange={(e) =>
                                handleAddressChange(setShipping)(
                                    "fullName",
                                    e.target.value
                                )
                            }
                            required
                        />
                      </label>
                      <label className="profile-field">
                      <span>
                        Address Line 1{" "}
                        <span style={{ color: "#d32f2f" }}>*</span>
                      </span>
                        <input
                            type="text"
                            value={shipping.line1}
                            onChange={(e) =>
                                handleAddressChange(setShipping)(
                                    "line1",
                                    e.target.value
                                )
                            }
                            required
                        />
                      </label>
                      <label className="profile-field">
                      <span>
                        City <span style={{ color: "#d32f2f" }}>*</span>
                      </span>
                        <input
                            type="text"
                            value={shipping.city}
                            onChange={(e) =>
                                handleAddressChange(setShipping)(
                                    "city",
                                    e.target.value
                                )
                            }
                            required
                        />
                      </label>
                      <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "1rem",
                          }}
                      >
                        <label className="profile-field">
                        <span>
                          District{" "}
                          <span style={{ color: "#d32f2f" }}>*</span>
                        </span>
                          <input
                              type="text"
                              value={shipping.state}
                              onChange={(e) =>
                                  handleAddressChange(setShipping)(
                                      "state",
                                      e.target.value
                                  )
                              }
                              required
                          />
                        </label>
                        <label className="profile-field">
                        <span>
                          ZIP Code{" "}
                          <span style={{ color: "#d32f2f" }}>*</span>
                        </span>
                          <input
                              type="text"
                              value={shipping.zipCode}
                              onChange={(e) =>
                                  handleAddressChange(setShipping)(
                                      "zipCode",
                                      e.target.value
                                  )
                              }
                              required
                          />
                        </label>
                      </div>
                      <label className="profile-field">
                      <span>
                        Country{" "}
                        <span style={{ color: "#d32f2f" }}>*</span>
                      </span>
                        <input
                            type="text"
                            value={shipping.country}
                            onChange={(e) =>
                                handleAddressChange(setShipping)(
                                    "country",
                                    e.target.value
                                )
                            }
                            required
                        />
                      </label>
                      <label className="profile-field">
                      <span>
                        Phone Number{" "}
                        <span style={{ color: "#d32f2f" }}>*</span>
                      </span>
                        <input
                            type="tel"
                            value={shipping.phoneNumber}
                            onChange={(e) =>
                                handleAddressChange(setShipping)(
                                    "phoneNumber",
                                    e.target.value
                                )
                            }
                            required
                        />
                      </label>
                    </form>
                  </div>
                </section>

                {/* BILLING ADDRESS */}
                <section className="profile-card" style={{ marginBottom: "2rem" }}>
                  <header className="profile-card-header">
                    <h2>Billing Address</h2>
                  </header>
                  <div className="profile-card-body">
                    <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "1rem",
                        }}
                    >
                      <input
                          type="checkbox"
                          checked={useSameAddress}
                          onChange={(e) => setUseSameAddress(e.target.checked)}
                      />
                      Same as shipping address
                    </label>
                    {!useSameAddress && (
                        <form className="profile-form">
                          <label className="profile-field">
                        <span>
                          Full Name{" "}
                          <span style={{ color: "#d32f2f" }}>*</span>
                        </span>
                            <input
                                type="text"
                                value={billing.fullName}
                                onChange={(e) =>
                                    handleAddressChange(setBilling)(
                                        "fullName",
                                        e.target.value
                                    )
                                }
                                required
                            />
                          </label>
                          <label className="profile-field">
                        <span>
                          Address{" "}
                          <span style={{ color: "#d32f2f" }}>*</span>
                        </span>
                            <input
                                type="text"
                                value={billing.line1}
                                onChange={(e) =>
                                    handleAddressChange(setBilling)(
                                        "line1",
                                        e.target.value
                                    )
                                }
                                required
                            />
                          </label>
                          <label className="profile-field">
                        <span>
                          City <span style={{ color: "#d32f2f" }}>*</span>
                        </span>
                            <input
                                type="text"
                                value={billing.city}
                                onChange={(e) =>
                                    handleAddressChange(setBilling)(
                                        "city",
                                        e.target.value
                                    )
                                }
                                required
                            />
                          </label>
                        </form>
                    )}
                  </div>
                </section>

                {/* PAYMENT */}
                <section className="profile-card">
                  <header className="profile-card-header">
                    <h2>Payment</h2>
                  </header>
                  <div className="profile-card-body">
                    <form className="profile-form">
                      <label className="profile-field">
                      <span>
                        Card Number{" "}
                        <span style={{ color: "#d32f2f" }}>*</span>
                      </span>
                        <input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={paymentDetails.cardNumber}
                            onChange={(e) => {
                              // Only allow digits, max 16 characters
                              let value = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 16);

                              // Add space after every 4 digits
                              value = value.replace(/(.{4})/g, "$1 ").trim();

                              handlePaymentChange("cardNumber", value);
                            }}
                            required
                        />
                      </label>
                      <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "1rem",
                          }}
                      >
                        <label className="profile-field">
                        <span>
                          Expiry Date (MM/YY){" "}
                          <span style={{ color: "#d32f2f" }}>*</span>
                        </span>
                          <input
                              type="text"
                              placeholder="MM/YY"
                              value={paymentDetails.expiryDate}
                              onChange={(e) => {
                                // Only allow digits
                                let value = e.target.value.replace(/\D/g, "");

                                // Format as MM/YY (max 4 digits)
                                if (value.length > 2) {
                                  value =
                                      value.slice(0, 2) + "/" + value.slice(2, 4);
                                }

                                handlePaymentChange("expiryDate", value);
                              }}
                              maxLength={5}
                              required
                          />
                        </label>
                        <label className="profile-field">
                        <span>
                          CVV <span style={{ color: "#d32f2f" }}>*</span>
                        </span>
                          <input
                              type="text"
                              placeholder="CVV"
                              value={paymentDetails.cvv}
                              onChange={(e) => {
                                // Only allow digits, max 3 characters
                                const value = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 3);
                                handlePaymentChange("cvv", value);
                              }}
                              maxLength={3}
                              required
                          />
                        </label>
                      </div>
                      <label className="profile-field">
                      <span>
                        Cardholder Name{" "}
                        <span style={{ color: "#d32f2f" }}>*</span>
                      </span>
                        <input
                            type="text"
                            placeholder="Name on card"
                            value={paymentDetails.holderName}
                            onChange={(e) =>
                                handlePaymentChange("holderName", e.target.value)
                            }
                            required
                        />
                      </label>
                    </form>
                  </div>
                </section>
              </div>

              {/* RIGHT: order summary */}
              <div>
                <section
                    className="profile-card"
                    style={{ position: "sticky", top: "2rem" }}
                >
                  <header className="profile-card-header">
                    <h2>Order Summary</h2>
                  </header>
                  <div className="profile-card-body">
                    <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                          marginBottom: "1rem",
                        }}
                    >
                      {basket.items.length === 0 ? (
                          <p style={{ color: "#666" }}>Your cart is empty.</p>
                      ) : (
                          basket.items.map((item) => (
                              <div
                                  key={`${item.productId}-${item.sku}`}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                  }}
                              >
                          <span>
                            {item.name} x {item.quantity}
                          </span>
                                <span>
                            ${parseFloat(item.lineTotal || 0).toFixed(2)}
                          </span>
                              </div>
                          ))
                      )}
                    </div>
                    <div
                        style={{
                          borderTop: "1px solid #e5e5e5",
                          paddingTop: "1rem",
                          marginBottom: "1rem",
                        }}
                    >
                      <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.5rem",
                          }}
                      >
                        <span>Subtotal</span>
                        <span>${totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "0.5rem",
                          }}
                      >
                        <span>Estimated Shipping</span>
                        <span>${totals.shipping.toFixed(2)}</span>
                      </div>
                      <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: "600",
                            marginTop: "0.5rem",
                            paddingTop: "0.5rem",
                            borderTop: "1px solid #e5e5e5",
                          }}
                      >
                        <span>Estimated Total</span>
                        <span>${totals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                        type="submit"
                        disabled={processing || basket.items.length === 0}
                        className="profile-button"
                        style={{
                          width: "100%",
                          cursor:
                              processing || basket.items.length === 0
                                  ? "not-allowed"
                                  : "pointer",
                          opacity:
                              processing || basket.items.length === 0 ? 0.6 : 1,
                        }}
                    >
                      {processing ? "PROCESSING..." : "CONFIRM PAYMENT"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </form>
        </main>
      </div>
  );
}