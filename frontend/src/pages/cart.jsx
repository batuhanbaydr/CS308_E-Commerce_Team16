// src/pages/Cart.jsx
import React, { useEffect, useState } from "react";
import {
  meRequest,
  getBasket,
  updateBasketItem,
  removeBasketItem,
} from "../lib/api";

const CART_STORAGE_KEY = "tidl_cart_id";

export default function Cart({ onClose }) {
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

  // load current user
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
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    loadMe();
  }, []);

  // load basket once auth is known & user exists
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
        if (data.orderId) saveCartId(data.orderId);
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

  const requireLoginView = authChecked && !user;

  // simple fake shipping like the example
  const estimatedShipping = 8.5;
  const subtotal = basket?.subtotal || 0;
  const estimatedTotal = subtotal + estimatedShipping;

  const handleGoToCheckout = () => {
    if (!basket || !basket.items || basket.items.length === 0) {
      setErrorMsg("Your basket is empty.");
      return;
    }
    // here you will navigate to /checkout from wherever you trigger payment,
    // BUT since this component doesn't know the router in drawer-mode,
    // we just close and let a "Checkout" button somewhere else handle routing.
    safeOnClose();
    // you can later change this to call a callback that also navigates
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
          {requireLoginView ? (
            <div className="cart-empty-state">
              <p>You need to sign in to view your basket.</p>
            </div>
          ) : (
            <>
              {loadingBasket && (
                <p className="cart-muted">Loading your basket…</p>
              )}
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

                      return (
                        <div className="cart-drawer-item" key={key}>
                          {/* If you have imageUrl, show it here */}
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
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
                                  {item.variantLabel || `SKU: ${item.sku}`}
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
                                 <div className="cart-drawer-item-bottom">
                                <div className="cart-qty-control">
                                    <button
                                    className="cart-qty-btn"
                                    onClick={() => handleQtyChange(item, item.quantity - 1)}
                                    disabled={busy || item.quantity <= 1}
                                    type="button"
                                    >
                                    –
                                    </button>
                                    <span className="cart-qty-value">{item.quantity}</span>
                                    <button
                                    className="cart-qty-btn"
                                    onClick={() => handleQtyChange(item, item.quantity + 1)}
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
                        </div>
                      );
                    })}
                  </div>
                )}
            </>
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
            disabled={
              requireLoginView ||
              !basket ||
              !basket.items ||
              basket.items.length === 0
            }
          >
            CHECKOUT
          </button>
        </footer>
      </aside>
    </div>
  );
}
