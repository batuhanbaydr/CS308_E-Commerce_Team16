import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  {
    id: "swt-01",
    name: "WASHED EFFECT SNOOPY PEANUTS™ SWEATSHIRT",
    price: "$40.00",
    image: snoopysw,
    color: "white",
    size: ["S", "M", "L"],
  },
  {
    id: "swt-02",
    name: "PLAIN KNIT SWEATSHIRT",
    price: "$50.00",
    image: navySweat,
    color: "navy",
    size: ["S", "L"],
  },
  {
    id: "swt-03",
    name: "FADED SLOGAN SWEATSHIRT",
    price: "$60.00",
    image: fadedsw,
    color: "brown",
    size: ["S", "M", "L"],
  },
  {
    id: "swt-04",
    name: "BALLOON EMBROIDERED SLOGAN SWEATSHIRT",
    price: "$70.00",
    image: sweatshirt4,
    color: "white",
    size: ["M", "L", "XL"],
  },
  {
    id: "swt-05",
    name: "BASIC PLUSH SWEATSHIRT",
    price: "$65.00",
    image: sweatshirt5,
    color: "pink",
    size: ["S", "M", "L", "XL"],
  },
  {
    id: "swt-06",
    name: "BASIC CREW NECK SWEATSHIRT",
    price: "$55.00",
    image: sweatshirt3,
    color: "grey",
    size: ["M", "L", "XL"],
  },
];

const COLORS = [
  { id: "color-white", label: "WHITE" },
  { id: "color-navy", label: "NAVY" },
  { id: "color-pink", label: "PINK" },
  { id: "color-black", label: "BLACK" },
  { id: "color-brown", label: "BROWN" },
  { id: "color-grey", label: "GREY" },
];

const SIZES = ["XS", "S", "M", "L", "XL"];

export default function Sweatshirts() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(() => new Set());
  const [selectedSizes, setSelectedSizes] = useState(() => new Map());
  const [cartItems, setCartItems] = useState(() => new Map());
  const [priceRange, setPriceRange] = useState({ min: 40, max: 70 });
  const [notification, setNotification] = useState(null);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const products = useMemo(() => PRODUCTS, []);

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
    const product = products.find((p) => p.id === productId);
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
            className="category-nav-item category-nav-item--active"
          >
            SWEATSHIRTS
          </button>
          <button onClick={() => navigate("/category/shirts")} className="category-nav-item">
            SHIRTS
          </button>
          <button onClick={() => navigate("/category/pants")} className="category-nav-item">
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
                  min="40"
                  max="70"
                  value={priceRange.min}
                  onChange={(e) => {
                    const newMin = Math.min(Number(e.target.value), priceRange.max - 1);
                    setPriceRange((prev) => ({ ...prev, min: newMin }));
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
          {products.map((product) => {
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
