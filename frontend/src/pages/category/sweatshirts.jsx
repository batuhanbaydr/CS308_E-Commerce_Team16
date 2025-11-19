import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { meRequest, logoutRequest } from "../../lib/api";
import searchIcon from "../../assets/search.png";
import bagIcon from "../../assets/bag.png";
import sweatshirt1 from "../../assets/sweatshirt1.jpg";
import sweatshirt2 from "../../assets/sweatshirt2.jpg";
import sweatshirt3 from "../../assets/sweatshirt3.jpg";
import sweatshirt4 from "../../assets/sweatshirt4.jpg";
import sweatshirt5 from "../../assets/sweatshirt5.jpg";
import snoopysw from "../../assets/snoopysw.jpg";
import fadedsw from "../../assets/fadedsw.jpg";
import navySweat from "../../assets/navy-sweat.jpg";

const PRODUCTS = [
  { id: "swt-01", name: "WASHED EFFECT SNOOPY PEANUTS™ SWEATSHIRT", price: "$40.00", image: snoopysw,   color: "white", size: ["S", "M", "L"] },
  { id: "swt-02", name: "PLAIN KNIT SWEATSHIRT",                      price: "$50.00", image: navySweat,  color: "navy",  size: ["S", "L"] },
  { id: "swt-03", name: "FADED SLOGAN SWEATSHIRT",                    price: "$60.00", image: fadedsw,    color: "brown", size: ["S", "M", "L"] },
  { id: "swt-04", name: "BALLOON EMBROIDERED SLOGAN SWEATSHIRT",      price: "$70.00", image: sweatshirt4,color: "white", size: ["M", "L", "XL"] },
  { id: "swt-05", name: "BASIC PLUSH SWEATSHIRT",                     price: "$65.00", image: sweatshirt5,color: "pink",  size: ["S", "M", "L", "XL"] },
  { id: "swt-06", name: "BASIC CREW NECK SWEATSHIRT",                 price: "$55.00", image: sweatshirt3,color: "grey",  size: ["M", "L", "XL"] },
];

const COLORS = [
  { id: "color-white", label: "WHITE", value: "white" },
  { id: "color-navy",  label: "NAVY",  value: "navy" },
  { id: "color-pink",  label: "PINK",  value: "pink" },
  { id: "color-brown", label: "BROWN", value: "brown" },
  { id: "color-grey",  label: "GREY",  value: "grey" },
];

const SIZES = ["XS", "S", "M", "L", "XL"];

export default function Sweatshirts() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set());
  const [selectedSizes, setSelectedSizes] = useState(() => new Map());
  const [cartItems, setCartItems] = useState(() => new Map());
  const [priceRange, setPriceRange] = useState({ min: 40, max: 70 });

  // Çoklu filtreler
  const [colorFilters, setColorFilters] = useState(() => new Set());
  const [sizeFilters, setSizeFilters] = useState(() => new Set());

  const [notification, setNotification] = useState(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      try { const { data } = await meRequest(); setUser(data); }
      catch { setUser(null); }
    })();
    return () => { if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current); };
  }, []);

  const handleLogout = async () => { try { await logoutRequest(); } catch {} setUser(null); navigate("/home"); };
  const go = (path) => () => navigate(path);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const price = parseFloat(p.price.replace("$",""));
      const priceOk = price >= priceRange.min && price <= priceRange.max;
      const colorOk = colorFilters.size === 0 || colorFilters.has(String(p.color).toLowerCase());
      const sizeOk  = sizeFilters.size === 0  || p.size.some((s) => sizeFilters.has(s));
      return priceOk && colorOk && sizeOk;
    });
  }, [priceRange, colorFilters, sizeFilters]);

  const scheduleMessageClear = () => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => { setNotification(null); toastTimeoutRef.current = null; }, 2400);
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setNotification("Removed from favorites."); }
      else { next.add(id); setNotification("Added to favorites."); }
      scheduleMessageClear();
      return next;
    });
  };

  const handleSizeSelect = (productId, size) => {
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      const currentSize = next.get(productId);
      if (currentSize === size) next.delete(productId); else next.set(productId, size);
      return next;
    });
  };

  const getCartKey = (productId, size) => `${productId}-${size}`;
  const getCartQuantity = (productId, size) => cartItems.get(getCartKey(productId, size)) || 0;

  const updateCartQuantity = (productId, size, delta) => {
    setCartItems((prev) => {
      const next = new Map(prev);
      const key = getCartKey(productId, size);
      const current = next.get(key) || 0;
      const q = Math.max(0, current + delta);
      if (q === 0) next.delete(key); else next.set(key, q);
      return next;
    });
  };

  const handleAddToCart = (productId, name, availableSizes) => {
    const selectedSize = selectedSizes.get(productId);
    if (!selectedSize) { setNotification("Please select a size."); scheduleMessageClear(); return; }
    if (!availableSizes.includes(selectedSize)) { setNotification("Selected size is not available for this product."); scheduleMessageClear(); return; }
    updateCartQuantity(productId, selectedSize, 1);
    setNotification(`${name} (Size: ${selectedSize}) added to cart.`);
    scheduleMessageClear();
    setSelectedSizes((prev) => { const next = new Map(prev); next.delete(productId); return next; });
  };

  return (
    <div className="category-page">
      <header className="category-topbar">
        <button className="category-brand" onClick={() => navigate("/home")}>TIDL</button>
        <nav className="category-nav">
          <button onClick={() => navigate("/category/sweatshirts")} className="category-nav-item category-nav-item--active">SWEATSHIRTS</button>
          <button onClick={() => navigate("/category/shirts")} className="category-nav-item">SHIRTS</button>
          <button onClick={() => navigate("/category/pants")} className="category-nav-item">PANTS</button>
          <button onClick={() => navigate("/shop-the-look")} className="category-nav-item">SHOP THE LOOK</button>
        </nav>
        <div className="category-actions">
          <img src={searchIcon} alt="Search" className="category-icon" onClick={() => navigate("/search")} />
          {user ? (
            <span className="login-topbar-link" style={{ cursor:"default", marginRight:"0.5rem" }}>{`HEY! ${user.name}`}</span>
          ) : (
            <span className="home-signin" onClick={() => navigate("/login")} style={{ marginRight:"0.5rem", cursor:"pointer" }}>SIGN IN</span>
          )}
          {user && (
            <div className="home-menu" onClick={() => setShowMenu((p) => !p)} style={{ marginRight:"0.5rem" }}>
              <span /><span /><span />
              {showMenu && (
                <div className="details-menu">
                  <button className="details-menu-item" onClick={go("/profile")}>Details</button>
                  <button className="details-menu-item" onClick={handleLogout}>Log-out</button>
                </div>
              )}
            </div>
          )}
          <img src={bagIcon} alt="Cart" className="category-icon" onClick={() => navigate("/cart")} />
        </div>
      </header>

      <main className="category-layout">
        <aside className="category-sidebar">
          <button
            className="category-clear"
            onClick={() => {
              setColorFilters(new Set());
              setSizeFilters(new Set());
              setPriceRange({ min: 40, max: 70 });
            }}
          >
            CLEAR FILTERS
          </button>

          <section className="category-filter">
            <h3 className="category-filter-title">SORT</h3>
            <button className="category-filter-option">Price: Low to High</button>
            <button className="category-filter-option">Price: High to Low</button>
            <button className="category-filter-option">New Arrivals</button>
          </section>

          <section className="category-filter">
            <h3 className="category-filter-title">COLOR</h3>
            <div className="category-filter-pills">
              {COLORS.map((c) => {
                const active = colorFilters.has(c.value);
                return (
                  <button
                    key={c.id}
                    className={`category-pill${active ? " category-pill--active" : ""}`}
                    onClick={() => {
                      setColorFilters((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.value)) next.delete(c.value); else next.add(c.value);
                        return next;
                      });
                    }}
                    aria-pressed={active}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="category-filter">
            <h3 className="category-filter-title">SIZE</h3>
            <div className="category-filter-pills">
              {SIZES.map((s) => {
                const active = sizeFilters.has(s);
                return (
                  <button
                    key={s}
                    className={`category-pill${active ? " category-pill--active" : ""}`}
                    onClick={() => {
                      setSizeFilters((prev) => {
                        const next = new Set(prev);
                        if (next.has(s)) next.delete(s); else next.add(s);
                        return next;
                      });
                    }}
                    aria-pressed={active}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="category-filter">
            <h3 className="category-filter-title">PRICE</h3>
            <div className="price-filter-container">
              <div className="price-slider-wrapper">
                <input
                  type="range"
                  min="40"
                  max="70"
                  value={priceRange.min}
                  onChange={(e) => {
                    const newMin = Math.min(Number(e.target.value), priceRange.max - 1);
                    setPriceRange((p) => ({ ...p, min: newMin }));
                  }}
                  className="price-slider price-slider--min"
                />
                <input
                  type="range"
                  min="40"
                  max="70"
                  value={priceRange.max}
                  onChange={(e) => {
                    const newMax = Math.max(Number(e.target.value), priceRange.min + 1);
                    setPriceRange((p) => ({ ...p, max: newMax }));
                  }}
                  className="price-slider price-slider--max"
                />
              </div>
              <p className="category-price-range">
                ${priceRange.min.toFixed(2)} - ${priceRange.max.toFixed(2)}
              </p>
            </div>
          </section>
        </aside>

        <section className="category-products">
          {filteredProducts.map((product) => {
            const isFavorite = favorites.has(product.id);
            return (
              <article key={product.id} className="product-card">
                <div className="product-media">
                  <img src={product.image} alt={product.name} loading="lazy" />
                  <button
                    className={`favorite-button${isFavorite ? " favorite-button--active" : ""}`}
                    onClick={() => toggleFavorite(product.id)}
                    aria-label="Add to favorites"
                  >
                    {isFavorite ? "♥" : "♡"}
                  </button>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-meta">
                    <span>COLOR: {product.color.toUpperCase()}</span>
                  </p>
                  <p className="product-price">{product.price}</p>
                  <div className="product-size-selector">
                    <p className="size-selector-label">SIZE</p>
                    <div className="size-selector-buttons">
                      {product.size.map((size) => {
                        const isSelected = selectedSizes.get(product.id) === size;
                        const cartQuantity = getCartQuantity(product.id, size);
                        const isInCart = cartQuantity > 0;
                        return (
                          <button
                            key={size}
                            className={`size-selector-button${isSelected ? " size-selector-button--selected" : ""}${isInCart ? " size-selector-button--in-cart" : ""}`}
                            onClick={() => handleSizeSelect(product.id, size)}
                            aria-label={`Select size ${size}`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    className="product-add-to-basket"
                    onClick={() => {
                      handleAddToCart(product.id, product.name, product.size);
                    }}
                    style={{
                      marginTop: "0.5rem",
                      width: "50%",
                      padding: "0.375rem 0.5rem",
                      backgroundColor: "#3d211c",
                      color: "white",
                      border: "1px solid #3d211c",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                      fontSize: "0.75rem",
                      fontWeight: "500"
                    }}
                  >
                    Add to basket
                    <img src={bagIcon} alt="cart" style={{ width: "14px", height: "14px", filter: "brightness(0) invert(1)" }} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {notification && (
        <div className="category-toast" role="status">
          {notification}
        </div>
      )}
    </div>
  );
}