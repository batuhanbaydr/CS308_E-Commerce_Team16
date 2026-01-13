// src/components/CategoryTopbar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { meRequest, logoutRequest, listCategoriesPublic } from "../lib/api";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

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

  // active tab: prop OR infer from /category/:slug
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

  return (
    <header className="category-topbar">
      <button
        className="category-brand"
        onClick={() => navigate("/home")}
        type="button"
      >
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
              className={`category-nav-item${
                active ? " category-nav-item--active" : ""
              }`}
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

                {hasAdminAccess(user) && (
                  <button
                    className="details-menu-item"
                    onClick={go(getAdminRoute(user))}
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
  );
}
