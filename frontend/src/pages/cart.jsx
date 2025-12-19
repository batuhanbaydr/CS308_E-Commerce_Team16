// src/pages/Cart.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  meRequest,
  getBasket,
  updateBasketItem,
  removeBasketItem,
} from "../lib/api";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

const CART_STORAGE_KEY = "tidl_cart_id";

export default function Cart({ onClose }) {
  const navigate = useNavigate();

  // fallback so we don't crash if someone renders <Cart /> without onClose
  const safeOnClose = onClose || (() => {});

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [basket, setBasket] = useState(null);
  const [loadingBasket, setLoadingBasket] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [contactEmail, setContactEmail] = useState("");
  const [delivery, setDelivery] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    zipCode: "",
    phone: "",
  });

  // helpers for cartId in localStorage
  const getStoredCartId = () => {
    if (typeof window === "undefined") return undefined;
    return window.localStorage.getItem(CART_STORAGE_KEY) || undefined;
  };

  const saveCartId = (orderId) => {
    if (!orderId) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CART_STORAGE_KEY, orderId);
  };

  const clearCartId = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CART_STORAGE_KEY);
  };

  // load current user (if logged in)
  useEffect(() => {
    const loadMe = async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
        setContactEmail(data.emailAddress || "");
        setDelivery((prev) => ({
          ...prev,
          address: data.homeAddress || "",
          phone: data.phoneNumber || "",
        }));
      } catch (err) {
        // not logged in
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    loadMe();
  }, []);

  // load basket once auth status is known
  useEffect(() => {
    if (!authChecked) return;

    const fetchBasket = async () => {
      setLoadingBasket(true);
      setErrorMsg("");
      try {
        // If user is logged in, clear any guest cartId from localStorage
        // This ensures logged-in users only see their own cart
        if (user?.id) {
          clearCartId();
        }

        const cartId = user?.id ? undefined : getStoredCartId(); // Only use cartId for guests
        const { data } = await getBasket({
          userId: user?.id, // can be undefined for guests
          cartId,
        });
        setBasket(data);
        // Only save cartId for guests (not for logged-in users)
        if (data.orderId && !user?.id) {
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

  // basket item handlers
  const handleQtyChange = async (item, newQty) => {
    if (newQty < 0) return;

    const key = `${item.productId}-${item.sku}`;
    setSavingKey(key);
    setErrorMsg("");

    try {
      // If user is logged in, don't use cartId from localStorage
      // This ensures logged-in users only see their own cart, not guest cart
      const cartId = user?.id
        ? undefined // Logged-in users don't use cartId
        : basket?.orderId || getStoredCartId();
      const { data } = await updateBasketItem({
        userId: user?.id, // optional
        cartId,
        productId: item.productId,
        sku: item.sku,
        quantity: newQty,
      });

      setBasket(data);
      // Save cartId only for guests (not for logged-in users)
      if (data.orderId && !user?.id) {
        saveCartId(data.orderId);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not update item. Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleRemoveItem = async (item) => {
    const key = `${item.productId}-${item.sku}`;
    setSavingKey(key);
    setErrorMsg("");

    try {
      // If user is logged in, don't use cartId from localStorage
      // This ensures logged-in users only see their own cart, not guest cart
      const cartId = user?.id
        ? undefined // Logged-in users don't use cartId
        : basket?.orderId || getStoredCartId();
      const { data } = await removeBasketItem({
        userId: user?.id, // optional
        cartId,
        productId: item.productId,
        sku: item.sku,
      });

      setBasket(data);
      // Save cartId only for guests (not for logged-in users)
      if (data.orderId && !user?.id) {
        saveCartId(data.orderId);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not remove item. Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  // simple fake shipping
  const estimatedShipping = 8.5;
  const subtotal = basket?.subtotal || 0;
  const estimatedTotal = subtotal + estimatedShipping;

  const handleGoToCheckout = () => {
    // block if basket is empty
    if (!basket || !basket.items || basket.items.length === 0) {
      setErrorMsg("Your basket is empty.");
      return;
    }

    // clear any previous error message
    setErrorMsg("");

    // close the cart drawer
    safeOnClose();

    // navigate to the checkout page
    navigate("/checkout");
  };

  const handleClose = () => {
    safeOnClose();
  };

  return (
    <div className="cart-overlay">
      {/* dim background */}
      <div
        className="cart-backdrop"
        onClick={handleClose}
        aria-label="Close cart"
      />

      <aside className="cart-drawer" aria-label="Shopping bag">
        <header className="cart-drawer-header">
          <span className="cart-drawer-title">SHOPPING BAG</span>
          <button
            className="cart-drawer-close"
            onClick={handleClose}
            type="button"
            aria-label="Close cart"
          >
            ×
          </button>
        </header>

        <div className="cart-drawer-body">
          {/* Optional note for guests */}
          {authChecked && !user && (
            <p className="cart-muted">
              You’re not signed in. Your basket is saved only on this device.
            </p>
          )}

          {loadingBasket && <p className="cart-muted">Loading your basket…</p>}
          {errorMsg && <p className="cart-error">{errorMsg}</p>}

          {!loadingBasket &&
            basket &&
            (!basket.items || basket.items.length === 0) && (
              <div className="cart-empty-state">
                <p>Your basket is empty.</p>
              </div>
            )}

          {!loadingBasket &&
            basket &&
            basket.items &&
            basket.items.length > 0 && (
              <div className="cart-drawer-items">
                {basket.items.map((item) => {
                  const key = `${item.productId}-${item.sku}`;
                  const busy = savingKey === key;

                  const imageSrc =
                    item.mainImageUrl ||
                    (item.imageUrls && item.imageUrls[0]) ||
                    null;

                  return (
                    <div className="cart-drawer-item" key={key}>
                      {imageSrc && (
                        <img
                          src={imageSrc}
                          alt={item.name}
                          className="cart-drawer-item-image"
                        />
                      )}

                      <div className="cart-drawer-item-main">
                        <div className="cart-drawer-item-header">
                          <div>
                            <div className="cart-drawer-item-name">
                              {item.name}
                            </div>
                            <div className="cart-drawer-item-meta">
                              {`SKU: ${item.sku}`}
                            </div>
                          </div>
                          <button
                            className="cart-drawer-remove"
                            onClick={() => handleRemoveItem(item)}
                            disabled={busy}
                            type="button"
                          >
                            🗑
                          </button>
                        </div>

                        <div className="cart-drawer-item-bottom">
                          <div className="cart-qty-control">
                            <button
                              className="cart-qty-btn"
                              onClick={() =>
                                handleQtyChange(item, item.quantity - 1)
                              }
                              disabled={busy || item.quantity <= 1}
                              type="button"
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
                              type="button"
                            >
                              +
                            </button>
                          </div>

                          <div className="cart-drawer-prices">
                            <span className="cart-line-total">
                              {formatMoney(item.lineTotal)}
                            </span>

                            {item.quantity > 1 && (
                              <span className="cart-unit-caption">
                                {formatMoney(item.unitPrice)} each
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        <footer className="cart-drawer-footer">
          <div className="cart-drawer-summary">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="cart-summary-row cart-summary-row-muted">
              <span>Estimated Shipping</span>
              <span>{formatMoney(estimatedShipping)}</span>
            </div>
            <div className="cart-summary-row cart-summary-row-total">
              <span>Estimated Total</span>
              <span>{formatMoney(estimatedTotal)}</span>
            </div>
          </div>

          <button
            className="cart-checkout-button"
            type="button"
            onClick={handleGoToCheckout}
            disabled={!basket || !basket.items || basket.items.length === 0}
          >
            CHECKOUT
          </button>
        </footer>
      </aside>
    </div>
  );
}
