// src/pages/admin/AdminHome.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { meRequest } from "../../lib/api";
import searchIcon from "../../assets/search.png";
import bagIcon from "../../assets/bag.png";
import { useCartDrawer } from "../../context/CartDrawerContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

export default function AdminHome() {
  const navigate = useNavigate();
  const { openCart } = useCartDrawer();
  const { logout } = useAuth();

  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    // IMPORTANT: use AuthContext logout so every page is consistent
    await logout();
    setShowMenu(false);
    navigate("/home", { replace: true });
  };

  const go = (path) => () => {
    setShowMenu(false);
    navigate(path);
  };

  const renderHeader = () => (
    <header className="category-topbar">
      <button className="category-brand" onClick={() => navigate("/home")}>
        TIDL
      </button>

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
                  <button className="details-menu-item" onClick={go("/admin")}>
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

  // ===== Loading state =====
  if (loadingUser) {
    return (
      <div className="category-page">
        {renderHeader()}
        <main className="profile-wrapper">
          <p className="product-loading">Loading your account…</p>
        </main>
      </div>
    );
  }

  // ===== No access state =====
  if (!user || !hasAdminAccess(user)) {
    return (
      <div className="category-page">
        {renderHeader()}
        <main className="profile-wrapper">
          <div className="profile-main">
            <h1 className="profile-title">Admin Area</h1>
            <p className="profile-subtitle">
              You don&apos;t have permission to access this area.
            </p>
            <button
              className="profile-button"
              style={{ marginTop: "1.5rem", maxWidth: 240 }}
              onClick={() => navigate("/home")}
            >
              Back to shopping
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ===== Main admin content =====
  return (
    <div className="category-page">
      {renderHeader()}

      <main className="profile-wrapper">
        <div className="profile-main">
          <h1 className="profile-title">Admin Area</h1>
          <p className="profile-subtitle">
            Choose a panel based on your role. You&apos;re signed in as{" "}
            <strong>{user.role}</strong>.
          </p>
        </div>

        <section className="profile-card">
          <div className="profile-card-header">
            <h2>Admin panels</h2>
          </div>

          <div className="profile-card-body">
            <div className="profile-card-grid admin-panels-grid">
              <button
                type="button"
                className="admin-panel-card"
                onClick={() => navigate("/backoffice/sales")}
              >
                <span className="admin-panel-title">Sales Manager</span>
                <span className="admin-panel-subtitle">
                  Set discounts and trigger wishlist notifications.
                </span>
              </button>

              <button
                type="button"
                className="admin-panel-card"
                onClick={() => navigate("/backoffice/product-manager/products")}
              >
                <span className="admin-panel-title">Product Manager</span>
                <span className="admin-panel-subtitle">
                  Manage products, categories, stock and delivery status.
                </span>
              </button>

              <button
                type="button"
                className="admin-panel-card"
                onClick={() => navigate("/backoffice/support")}
              >
                <span className="admin-panel-title">Support Agent</span>
                <span className="admin-panel-subtitle">
                  View customer issues, respond to requests, and track tickets.
                </span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
