// src/components/CategoryTopbar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useCartDrawer } from "../context/CartDrawerContext.jsx";
import { meRequest, logoutRequest, listCategoriesPublic, getBasket } from "../lib/api";

import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

const getAdminRoute = (user) => {
  if (user?.roles?.includes("SALES_MANAGER") || user?.role === "SALES_MANAGER")
    return "/backoffice/sales-manager";
  if (user?.roles?.includes("PRODUCT_MANAGER") || user?.role === "PRODUCT_MANAGER")
    return "/backoffice/product-manager";
  if (user?.roles?.includes("SUPPORT_AGENT") || user?.role === "SUPPORT_AGENT")
    return "/backoffice/support-manager";
  return "/admin";
};

const CART_STORAGE_KEY = "tidl_cart_id";

function getStoredCartId() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(CART_STORAGE_KEY) || undefined;
}

function slugify(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getId(c) {
  return c?.id ?? c?._id ?? c?.categoryId ?? c?.name ?? "";
}

export default function CategoryTopbar({ activeSlug }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCart } = useCartDrawer();

  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [categories, setCategories] = useState([]);

  // badge
  const [cartCount, setCartCount] = useState(0);

  // load user (403 => guest)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch {
        setUser(null);
      }
    })();
  }, [location.pathname]);

  // load categories (public)
  useEffect(() => {
    (async () => {
      try {
        const res = await listCategoriesPublic();
        setCategories(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error("Topbar categories failed:", e?.response?.status, e);
        setCategories([]);
      }
    })();
  }, []);

  const navCategories = useMemo(() => {
    const arr = Array.isArray(categories) ? [...categories] : [];
    return arr
      .filter((c) => String(c?.name || "").trim())
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [categories]);

  // active tab
  const resolvedActiveSlug =
    activeSlug ||
    (location.pathname.startsWith("/category/")
      ? location.pathname.split("/category/")[1]?.split("/")[0]
      : "");

  const go = (path) => () => {
    setShowMenu(false);
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {}
    setUser(null);
    setShowMenu(false);
    navigate("/home", { replace: true });
  };

  // IMPORTANT: always compute count from basket.items quantities
  const computeCartCount = (basket) => {
    const items = basket?.items;
    if (!Array.isArray(items) || items.length === 0) return 0;

    // robust: supports quantity/qty/count; falls back to 1 per item if missing
    return items.reduce((sum, it) => {
      const qRaw = it?.quantity ?? it?.qty ?? it?.count;
      const q = Number(qRaw);
      return sum + (Number.isFinite(q) ? q : 1);
    }, 0);
  };

  const refreshCartCount = async () => {
    try {
      const userId = user?.id;
      const cartId = userId ? undefined : getStoredCartId();

      const res = await getBasket({ userId, cartId });
      const data = res?.data ?? res; // in case your api wrapper returns data directly
      setCartCount(computeCartCount(data));
    } catch (e) {
      setCartCount(0);
    }
  };

  // refresh on every route change too (fixes “stuck at 1” when no events fire)
  useEffect(() => {
    refreshCartCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?.id]);

  // listen for basket updates
  useEffect(() => {
    const onCartUpdated = () => refreshCartCount();
    window.addEventListener("tidl-cart-updated", onCartUpdated);
    window.addEventListener("storage", onCartUpdated);

    return () => {
      window.removeEventListener("tidl-cart-updated", onCartUpdated);
      window.removeEventListener("storage", onCartUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleOpenCart = async () => {
    // refresh right before opening so the badge is always synced
    await refreshCartCount();
    openCart();
  };

  return (
    <header className="category-topbar">
      <button className="category-brand" onClick={() => navigate("/home")} type="button">
        TIDL
      </button>

      <nav className="category-nav">
        {navCategories.map((c) => {
          const s = slugify(c.name);
          const active = s === resolvedActiveSlug;

          return (
            <button
              key={getId(c) || s}
              onClick={() => navigate(`/category/${s}`)}
              className={`category-nav-item${active ? " category-nav-item--active" : ""}`}
              type="button"
            >
              {String(c.name).toUpperCase()}
            </button>
          );
        })}
      </nav>

      <div className="category-actions">
        <img
          src={searchIcon}
          alt="Search"
          className="category-icon"
          onClick={() => navigate("/search")}
        />

        {user ? (
          <span className="login-topbar-link" style={{ cursor: "default", marginRight: "0.5rem" }}>
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
                <button className="details-menu-item" onClick={go("/profile")}>Details</button>
                <button className="details-menu-item" onClick={go("/wishlist")}>Wishlist</button>

                {hasAdminAccess(user) && (
                  <button className="details-menu-item" onClick={go(getAdminRoute(user))}>
                    Admin Panel
                  </button>
                )}

                <button className="details-menu-item" onClick={handleLogout}>Log-out</button>
              </div>
            )}
          </div>
        )}

        {/* Cart icon + badge */}
        <div
          className="category-cart-wrap"
          onClick={handleOpenCart}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleOpenCart();
          }}
          aria-label="Open cart"
        >
          <img src={bagIcon} alt="Cart" className="category-icon" />
          {cartCount > 0 && <span className="category-cart-badge">{cartCount}</span>}
        </div>
      </div>
    </header>
  );
}
