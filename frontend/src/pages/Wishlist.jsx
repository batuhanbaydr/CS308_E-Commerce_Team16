// src/pages/Wishlist.jsx
import React, { useEffect, useMemo, useState } from "react";
import { logoutRequest, meRequest } from "../lib/api";
import { useNavigate } from "react-router-dom";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";
import { getWishlist, removeWishlistItem, clearWishlist } from "../lib/api";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

function safeText(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function formatPrice(p) {
  const uiPrice = Number(p);
  if (!Number.isFinite(uiPrice)) return safeText(p);

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(uiPrice);
}


export default function Wishlist() {
  const navigate = useNavigate();
  const { openCart } = useCartDrawer();
  const [showMenu, setShowMenu] = useState(false);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState({ productIds: [], count: 0, products: [] });

  // If backend returns products, we use them. If not, we still show IDs.
  const hasProducts = useMemo(
    () => Array.isArray(wishlist.products) && wishlist.products.length > 0,
    [wishlist.products]
  );
    const go = (path) => () => navigate(path);
    const handleLogout = async () => {
      try { await logoutRequest(); } catch {}
      setUser(null); // back to guest
    };

    useEffect(() => {
      // If Login routed here with user in state, trust it
      if (location.state?.user) {
        setUser(location.state.user);
        return;
      }
      // Otherwise, *try* session lookup; if it fails, stay on Home as guest
      (async () => {
        try {
          const { data } = await meRequest();
          setUser(data);
        } catch {
          setUser(null); // guest mode
        }
      })();
    }, [location.state]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getWishlist();
      const data = res?.data || { productIds: [], count: 0, products: [] };
      setWishlist({
        productIds: Array.isArray(data.productIds) ? data.productIds : [],
        count: typeof data.count === "number" ? data.count : (data.productIds?.length || 0),
        products: Array.isArray(data.products) ? data.products : [],
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load wishlist";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onRemove(productId) {
    try {
      await removeWishlistItem(productId);
      // optimistic UI update
      setWishlist((prev) => {
        const nextIds = (prev.productIds || []).filter((id) => id !== productId);
        const nextProducts = (prev.products || []).filter((p) => String(p.id) !== String(productId));
        return {
          ...prev,
          productIds: nextIds,
          products: nextProducts,
          count: nextIds.length,
        };
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to remove item";
      setError(msg);
    }
  }

  async function onClearAll() {
    try {
      await clearWishlist();
      setWishlist({ productIds: [], count: 0, products: [] });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to clear wishlist";
      setError(msg);
    }
  }

  const empty = (wishlist.count || 0) === 0;

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
            {/* keep icon, but category-wide search stays on this page */}
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
            <img src={bagIcon} alt="Cart" className="category-icon" onClick={openCart} />
          </div>
        </header>
  

      <main className="profile-wrapper">
        <section className="profile-hero">
          <h1 className="profile-search-simple-title">Wishlist</h1>
         {!loading && empty && (
  <p className="profile-subheading">Your wishlist items will appear here.</p>
)}

        </section>

        <section className="wishlist-card">
          <header className="profile-card-header" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            <div>
              <h2 className="wishlist-section-title">PRODUCTS YOU SAVED</h2>
              <p>{loading ? "Loading…" : `${wishlist.count || 0} item(s)`}</p>
            </div>

    
          </header>

          <div className="profile-card-body">
            {error ? (
              <p style={{ color: "#b00020", marginBottom: 12 }}>{error}</p>
            ) : null}

            {loading ? (
              <p style={{ color: "#666" }}>Loading your wishlist…</p>
            ) 
            : hasProducts ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {wishlist.products.map((p) => {
                  const id = String(p.id);
                  const title = safeText(p.name) || `Product ${id}`;
                  const img = p.mainImageUrl || p.imageUrl || p.image || "";
                  const price = p.basePrice ?? p.price ?? "";

                  return (
                    <div
                      key={id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "white",
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/product/${id}`)}
                        onKeyDown={(e) => e.key === "Enter" && navigate(`/product/${id}`)}
                        style={{
                        position: "relative",
                        cursor: "pointer",
                        background: "#f6f6f6",
                        height: 240,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      

                      >
                      <button
                      className="favorite-button favorite-button--active"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation(); // don’t navigate to product
                        onRemove(id); // your existing remove function
                      }}
                      aria-label="Remove from wishlist"
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        zIndex: 2,
                      }}
                    >
                      ♥
                    </button>

                        {img ? (
                          
                          <img
                            src={img}
                            alt={title}
                            style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            background: "#f6f6f6",
                          }}

                          />
                        ) : (
                          <div style={{ color: "#888" }}>No image</div>
                        )}
                      </div>

                      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{title}</div>
                          <div style={{ whiteSpace: "nowrap" }}>{formatPrice(price)}</div>
                        </div>

                        
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // fallback: backend returned only IDs (products list empty)
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {wishlist.productIds.map((id) => (
                  <div
                    key={id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      background: "white",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Product: {id}</div>
                    <button
                      onClick={() => onRemove(id)}
                      style={{
                        border: "1px solid #ddd",
                        background: "white",
                        padding: "8px 10px",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
