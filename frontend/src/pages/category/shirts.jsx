import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import searchIcon from "../../assets/search.png";
import bagIcon from "../../assets/bag.png";
import strPant from "../../assets/str_pant.jpg";
import jogger from "../../assets/jogger.jpg";
import beltedPant from "../../assets/beltedpnt.jpg";
import navyPant from "../../assets/navypant.jpg";
import brownPant from "../../assets/brownpant.jpg";
import woolPant from "../../assets/woolpnt.jpg";

const PRODUCTS = [
  {
    id: "pnt-01",
    name: "MINIMALIST STRAIGHT-LEG PANTS",
    price: "$90.00",
    image: strPant,
    color: "grey",
    size: ["S", "M", "L"],
  },
  {
    id: "pnt-02",
    name: "SPORTLITE JOGGERS",
    price: "$70.00",
    image: jogger,
    color: "beige",
    size: ["S", "M", "L", "XL"],
  },
  {
    id: "pnt-03",
    name: "SLEEK MOTION TROUSERS",
    price: "$65.00",
    image: beltedPant,
    color: "black",
    size: ["S", "M", "L"],
  },
  {
    id: "pnt-04",
    name: "NIGHTFALL STREET PANTS",
    price: "$60.00",
    image: navyPant,
    color: "navy",
    size: ["M", "L", "XL"],
  },
  {
    id: "pnt-05",
    name: "CONTOUR FIT PANTS",
    price: "$62.50",
    image: brownPant,
    color: "brown",
    size: ["S", "M", "L", "XL"],
  },
  {
    id: "pnt-06",
    name: "CLOUDSOFT LOUNGE PANTS",
    price: "$50.00",
    image: woolPant,
    color: "cream",
    size: ["M", "L", "XL"],
  },
];

const COLORS = [
  { id: "color-grey", label: "GREY" },
  { id: "color-beige", label: "BEIGE" },
  { id: "color-black", label: "BLACK" },
  { id: "color-navy", label: "NAVY" },
  { id: "color-brown", label: "BROWN" },
  { id: "color-cream", label: "CREAM" },
];

const SIZES = ["XS", "S", "M", "L", "XL"];

export default function Shirts() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(() => new Set());
  const [selectedSizes, setSelectedSizes] = useState(() => new Map());
  const [cartItems, setCartItems] = useState(() => new Map());
  const [priceRange, setPriceRange] = useState({ min: 50, max: 90 });
  const [notification, setNotification] = useState(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const price = parseFloat(product.price.replace("$", ""));
      return price >= priceRange.min && price <= priceRange.max;
    });
  }, [priceRange]);

  const scheduleMessageClear = () => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
      toastTimeoutRef.current = null;
    }, 2400);
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setNotification("Removed from favorites.");
      } else {
        next.add(id);
        setNotification("Added to favorites.");
      }
      scheduleMessageClear();
      return next;
    });
  };

  const handleSizeSelect = (productId, size) => {
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      const currentSize = next.get(productId);
      if (currentSize === size) {
        next.delete(productId);
      } else {
        next.set(productId, size);
      }
      return next;
    });
  };

  const getCartKey = (productId, size) => `${productId}-${size}`;

  const getCartQuantity = (productId, size) => {
    const key = getCartKey(productId, size);
    return cartItems.get(key) || 0;
  };

  const getTotalCartQuantity = (productId) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return 0;
    return product.size.reduce((total, size) => {
      return total + getCartQuantity(productId, size);
    }, 0);
  };

  const updateCartQuantity = (productId, size, delta) => {
    setCartItems((prev) => {
      const next = new Map(prev);
      const key = getCartKey(productId, size);
      const current = next.get(key) || 0;
      const newQuantity = Math.max(0, current + delta);
      if (newQuantity === 0) {
        next.delete(key);
      } else {
        next.set(key, newQuantity);
      }
      return next;
    });
  };

  const handleAddToCart = (productId, name, availableSizes) => {
    const selectedSize = selectedSizes.get(productId);
    if (!selectedSize) {
      setNotification("Please select a size.");
      scheduleMessageClear();
      return;
    }
    if (!availableSizes.includes(selectedSize)) {
      setNotification("Selected size is not available for this product.");
      scheduleMessageClear();
      return;
    }
    updateCartQuantity(productId, selectedSize, 1);
    setNotification(`${name} (Size: ${selectedSize}) added to cart.`);
    scheduleMessageClear();
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  };

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
            className="category-nav-item category-nav-item--active"
          >
            SHIRTS
          </button>
          <button
            onClick={() => navigate("/category/pants")}
            className="category-nav-item"
          >
            PANTS
          </button>
          <button onClick={() => navigate("/shop-the-look")} className="category-nav-item">
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
          <img
            src={bagIcon}
            alt="Cart"
            className="category-icon"
            onClick={() => navigate("/cart")}
          />
        </div>
      </header>

      <main className="category-layout">
        <aside className="category-sidebar">
          <button className="category-clear">CLEAR FILTERS</button>

          <section className="category-filter">
            <h3 className="category-filter-title">SORT</h3>
            <button className="category-filter-option">Price: Low to High</button>
            <button className="category-filter-option">Price: High to Low</button>
            <button className="category-filter-option">New Arrivals</button>
          </section>

          <section className="category-filter">
            <h3 className="category-filter-title">COLOR</h3>
            <div className="category-filter-pills">
              {COLORS.map((color) => (
                <button key={color.id} className="category-pill">
                  {color.label}
                </button>
              ))}
            </div>
          </section>

          <section className="category-filter">
            <h3 className="category-filter-title">SIZE</h3>
            <div className="category-filter-pills">
              {SIZES.map((size) => (
                <button key={size} className="category-pill">
                  {size}
                </button>
              ))}
            </div>
          </section>

          <section className="category-filter">
            <h3 className="category-filter-title">PRICE</h3>
            <div className="price-filter-container">
              <div className="price-slider-wrapper">
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={priceRange.min}
                  onChange={(e) => {
                    const newMin = Math.min(Number(e.target.value), priceRange.max - 1);
                    setPriceRange((prev) => ({ ...prev, min: newMin }));
                  }}
                  className="price-slider price-slider--min"
                />
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={priceRange.max}
                  onChange={(e) => {
                    const newMax = Math.max(Number(e.target.value), priceRange.min + 1);
                    setPriceRange((prev) => ({ ...prev, max: newMax }));
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
                    <span>{product.color.toUpperCase()}</span>
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
                  <div className="product-add-wrapper">
                    <button
                      className="product-add-icon"
                      onClick={() => {
                        const selectedSize = selectedSizes.get(product.id);
                        if (selectedSize) {
                          const currentQty = getCartQuantity(product.id, selectedSize);
                          if (currentQty > 0) {
                            updateCartQuantity(product.id, selectedSize, -1);
                          }
                        }
                      }}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <div className="product-add-quantity">
                      {getTotalCartQuantity(product.id) || 0}
                    </div>
                    <button
                      className="product-add-icon product-add-cart-icon"
                      onClick={() => {
                        const selectedSize = selectedSizes.get(product.id);
                        if (selectedSize) {
                          updateCartQuantity(product.id, selectedSize, 1);
                        } else {
                          handleAddToCart(product.id, product.name, product.size);
                        }
                      }}
                      aria-label="Add to cart"
                    >
                      <img src={bagIcon} alt="cart" className="cart-icon-img" />
                    </button>
                  </div>
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
