// src/pages/Cart.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  meRequest,
  getBasket,
  updateBasketItem,
  removeBasketItem,
} from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";

const CART_STORAGE_KEY = "tidl_cart_id";

export default function Cart() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [basket, setBasket] = useState(null);
  const [loadingBasket, setLoadingBasket] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // checkout form state
  const [contactEmail, setContactEmail] = useState("");
  const [delivery, setDelivery] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    zipCode: "",
    phone: "",
  });

  // ---- helpers for cartId in localStorage ----
  const getStoredCartId = () => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(CART_STORAGE_KEY) || undefined;
  };

  const saveCartId = (orderId) => {
    if (!orderId) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, orderId);
  };

  // ---- 1) Check logged-in user ----
  useEffect(() => {
    const loadMe = async () => {
      try {
        const { data } = await meRequest();
        setUser(data);

        // prefill contact + address + phone from user profile
        setContactEmail(data.emailAddress || "");
        setDelivery((prev) => ({
          ...prev,
          address: data.homeAddress || "",
          phone: data.phoneNumber || "",
        }));
      } catch (err) {
        // not logged in or error
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    loadMe();
  }, []);

  // ---- 2) Load basket once auth is known & user exists ----
  useEffect(() => {
    if (!authChecked || !user) {
      setLoadingBasket(false);
      return;
    }

    const fetchBasket = async () => {
      setLoadingBasket(true);
      setErrorMsg("");
      try {
        const cartId = getStoredCartId();
        const { data } = await getBasket({
          userId: user.id,
          cartId,
        });
        setBasket(data);
        if (data.orderId) {
          saveCartId(data.orderId);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Could not load your basket. Please try again.");
      } finally {
        setLoadingBasket(false);
      }
    };

    fetchBasket();
  }, [authChecked, user]);

  const formatMoney = (val) => {
    if (val == null) return "$0.00";
    const num = Number(val);
    if (Number.isNaN(num)) return "$0.00";
    return `$${num.toFixed(2)}`;
  };

  // ---- basket item handlers ----
  const handleQtyChange = async (item, newQty) => {
    if (!user) return;
    if (newQty < 0) return;

    const key = `${item.productId}-${item.sku}`;
    setSavingKey(key);
    setErrorMsg("");

    try {
      const cartId = basket?.orderId || getStoredCartId();

      const { data } = await updateBasketItem({
        userId: user.id,
        cartId,
        productId: item.productId,
        sku: item.sku,
        quantity: newQty,
      });

      setBasket(data);
      if (data.orderId) saveCartId(data.orderId);
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not update item. Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!user) return;

    const key = `${item.productId}-${item.sku}`;
    setSavingKey(key);
    setErrorMsg("");

    try {
      const cartId = basket?.orderId || getStoredCartId();

      const { data } = await removeBasketItem({
        userId: user.id,
        cartId,
        productId: item.productId,
        sku: item.sku,
      });

      setBasket(data);
      if (data.orderId) saveCartId(data.orderId);
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not remove item. Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleLogout = async () => {
    try {
      // if you later add a real logout endpoint, call it here
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
      navigate("/login");
    }
  };

  const handleDeliveryChange = (field, value) => {
    setDelivery((prev) => ({ ...prev, [field]: value }));
  };

  const handleGoToPayment = () => {
  
    if (!basket || !basket.items || basket.items.length === 0) {
      setErrorMsg("Your basket is empty.");
      return;
    }

    // later you'll send address + phone to backend here.
    navigate("/payment"); // or whatever route your payment page is
  };

  const requireLoginView = authChecked && !user;

  return (
    <div className="category-page cart-page">
      {/* TOP BAR */}
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
                  <button
                    className="details-menu-item"
                    onClick={() => navigate("/profile")}
                  >
                    Details
                  </button>
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
            onClick={() => navigate("/cart")}
          />
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="cart-layout">
        {/* LEFT SIDE */}
        <section className="cart-main">
          <h1 className="cart-title">Shopping bag</h1>

          {requireLoginView ? (
            <>
              <p className="cart-muted">
                You need to sign in to view and checkout your basket.
              </p>
              <button
                className="cart-pay-button"
                onClick={() => navigate("/login")}
              >
                SIGN IN
              </button>
            </>
          ) : (
            <>
              {loadingBasket && <p className="cart-muted">Loading your basket…</p>}
              {errorMsg && <p className="cart-error">{errorMsg}</p>}

              {!loadingBasket &&
                basket &&
                (!basket.items || basket.items.length === 0) && (
                  <p className="cart-muted">
                    Your basket is empty.{" "}
                    <button
                      onClick={() => navigate("/home")}
                      className="cart-link-button"
                    >
                      Continue shopping
                    </button>
                  </p>
                )}

              {!loadingBasket &&
                basket &&
                basket.items &&
                basket.items.length > 0 && (
                  <div className="cart-items">
                    {basket.items.map((item) => {
                      const key = `${item.productId}-${item.sku}`;
                      const busy = savingKey === key;

                      return (
                        <div className="cart-item" key={key}>
                          <div className="cart-item-main">
                            <div className="cart-item-info">
                              <div className="cart-item-name-row">
                                <h2 className="cart-item-name">{item.name}</h2>
                                <button
                                  className="cart-remove-button"
                                  onClick={() => handleRemoveItem(item)}
                                  disabled={busy}
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="cart-item-meta">SKU: {item.sku}</p>
                            </div>
                          </div>

                          <div className="cart-item-right">
                            <div className="cart-qty-control">
                              <button
                                className="cart-qty-btn"
                                onClick={() =>
                                  handleQtyChange(item, item.quantity - 1)
                                }
                                disabled={busy || item.quantity <= 1}
                              >
                                –
                              </button>
                              <span className="cart-qty-value">
                                {item.quantity}
                              </span>
                              <button
                                className="cart-qty-btn"
                                onClick={() =>
                                  handleQtyChange(item, item.quantity + 1)
                                }
                                disabled={busy}
                              >
                                +
                              </button>
                            </div>

                            <div className="cart-item-prices">
                              <span className="cart-unit-price">
                                {formatMoney(item.unitPrice)}
                              </span>
                              <span className="cart-line-total">
                                {formatMoney(item.lineTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              
            </>
          )}
        </section>

        {/* RIGHT SIDE – summary */}
        <aside className="cart-summary">
          <div className="cart-summary-card">
            <h2 className="cart-summary-title">Order summary</h2>

            {basket &&
              basket.items &&
              basket.items.length > 0 &&
              !requireLoginView && (
                <ul className="cart-summary-items">
                  {basket.items.map((item) => (
                    <li key={`${item.productId}-${item.sku}`}>
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>{formatMoney(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              )}

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>
                {basket ? formatMoney(basket.subtotal) : "$0.00"}
              </span>
            </div>
            <div className="cart-summary-row cart-summary-row-muted">
              <span>Shipping</span>
              <span>Calculated at next step</span>
            </div>

            <div className="cart-summary-total">
              <span>Total</span>
              <span className="cart-summary-total-amount">
                {basket ? formatMoney(basket.subtotal) : "$0.00"}
              </span>
            </div>

            <button
              className="cart-pay-button"
              onClick={handleGoToPayment}
              disabled={
                requireLoginView ||
                !delivery.phone.trim() ||
                !basket ||
                !basket.items ||
                basket.items.length === 0
              }
            >
              {requireLoginView ? "SIGN IN TO CONTINUE" : "PAY NOW"}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
