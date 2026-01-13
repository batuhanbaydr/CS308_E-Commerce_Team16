// src/pages/category/CategoryPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  meRequest,
  listProducts,
  addToBasket,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  listCategoriesPublic,
} from "../../lib/api";
import CategoryTopbar from "../../components/CategoryTopbar.jsx";

const SIZES = ["XS", "S", "M", "L", "XL"];
const CART_KEY = "tidl_cart_id";

const COLOR_KEYWORDS = new Set([
  "white",
  "cream",
  "navy",
  "pink",
  "brown",
  "grey",
  "black",
  "blue",
]);

function normalize(str) {
  return String(str || "").trim().toLowerCase();
}

function buildSearchText(product) {
  const parts = [];
  parts.push(
    product.name,
    product.description,
    product.category,
    product.fabric,
    product.madeIn
  );

  (product.variants || []).forEach((v) => {
    if (v.color) parts.push(v.color);
    if (v.size) parts.push(v.size);
    if (v.sku) parts.push(v.sku);
  });

  return normalize(parts.join(" "));
}

function slugify(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoryPage() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const [user, setUser] = useState(null);

  // categories (used to resolve slug -> real category name)
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  const [wishlistIds, setWishlistIds] = useState(() => new Set());

  const [selectedSizes, setSelectedSizes] = useState(() => new Map());
  const [cartItems, setCartItems] = useState(() => new Map());

  const [colorFilters, setColorFilters] = useState(() => new Set());
  const [sizeFilters, setSizeFilters] = useState(() => new Set());

  const [notification, setNotification] = useState(null);
  const toastTimeoutRef = useRef(null);

  const [hoveredProductId, setHoveredProductId] = useState(null);
  const [sortOption, setSortOption] = useState(null);

  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 100 });
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });

  const [searchTerm, setSearchTerm] = useState("");

  const scheduleMessageClear = () => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
      toastTimeoutRef.current = null;
    }, 2400);
  };

  // ✅ load categories once (for slug -> name)
  useEffect(() => {
    (async () => {
      setCatLoading(true);
      try {
        const res = await listCategoriesPublic();
        const arr = Array.isArray(res?.data) ? res.data : [];
        setCategories(arr);
      } catch {
        setCategories([]);
      } finally {
        setCatLoading(false);
      }
    })();
  }, []);

  // ✅ resolve current category by slug (backend "name")
  const currentCategory = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    return list.find((c) => slugify(c?.name) === slug) || null;
  }, [categories, slug]);

  const currentCategoryName = currentCategory?.name || "";
  const currentCategoryLabel = currentCategoryName
    ? String(currentCategoryName).toUpperCase()
    : String(slug || "").toUpperCase();

  // ✅ load user (needed for wishlist + cart)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch {
        setUser(null);
      }
    })();

    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ✅ load wishlist when user changes
  useEffect(() => {
    if (!user) {
      setWishlistIds(new Set());
      return;
    }

    (async () => {
      try {
        const { data } = await getWishlist();
        const ids = Array.isArray(data?.productIds) ? data.productIds : [];
        setWishlistIds(new Set(ids.map(String)));
      } catch (err) {
        console.error("Failed to load wishlist", err);
      }
    })();
  }, [user]);

  // ✅ load products for the category
  useEffect(() => {
    if (catLoading) return;

    if (!currentCategoryName) {
      setProducts([]);
      setLoadingProducts(false);
      setProductError("Category not found.");
      return;
    }

    setLoadingProducts(true);
    setProductError("");

    listProducts(currentCategoryName)
      .then((res) => {
        const data = res.data || [];
        setProducts(data);

        if (data.length > 0) {
          const prices = data.map((p) =>
            Number(
              p.basePrice ??
                (p.variants && p.variants[0] && p.variants[0].price) ??
                0
            )
          );
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          setPriceBounds({ min, max });
          setPriceRange({ min, max });
        } else {
          setPriceBounds({ min: 0, max: 100 });
          setPriceRange({ min: 0, max: 100 });
        }
      })
      .catch((err) => {
        console.error("Error loading products", err);
        setProductError("Could not load products.");
      })
      .finally(() => setLoadingProducts(false));
  }, [catLoading, currentCategoryName]);

  // dynamic color pills from variants
  const colorOptions = useMemo(() => {
    const seen = new Set();
    (products || []).forEach((p) => {
      (p.variants || []).forEach((v) => {
        const raw = (v.color || "").trim();
        if (!raw) return;
        seen.add(raw);
      });
    });

    return Array.from(seen)
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({
        id: `color-${c.toLowerCase().replace(/\s+/g, "-")}`,
        label: c.toUpperCase(),
        value: c.toLowerCase(),
      }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const withMeta = products.map((p) => {
      const price = Number(
        p.basePrice ??
          (p.variants && p.variants[0] && p.variants[0].price) ??
          0
      );

      const color =
        (p.variants && p.variants[0] && p.variants[0].color) || "";

      const sizeStock = {};
      const sizeToSku = {};
      (p.variants || []).forEach((v) => {
        const sizeKey = v.size && v.size.trim();
        if (!sizeKey) return;
        const stock =
          typeof v.stock === "number" ? v.stock : Number(v.stock || 0);
        sizeStock[sizeKey] = (sizeStock[sizeKey] || 0) + stock;
        if (v.sku) sizeToSku[sizeKey] = v.sku;
      });

      const allSizes = Object.keys(sizeStock);
      const sizesInStock = allSizes.filter((s) => sizeStock[s] > 0);

      const avg =
        typeof p.averageRating === "number"
          ? p.averageRating
          : Number(p.averageRating ?? 0);

      const count =
        typeof p.ratingCount === "number"
          ? p.ratingCount
          : Number(p.ratingCount ?? 0);

      const safeAvg = Number.isFinite(avg) ? avg : 0;
      const safeCount = Number.isFinite(count) ? count : 0;

      const searchText = buildSearchText(p);
      const variantColors = (p.variants || [])
        .map((v) => normalize(v.color || ""))
        .filter(Boolean);

      return {
        ...p,
        _price: price,
        _color: color,
        _sizesAll: allSizes,
        _sizesInStock: sizesInStock,
        _sizeStock: sizeStock,
        _sizeToSku: sizeToSku,
        _rating: safeAvg,
        _ratingCount: safeCount,
        _searchText: searchText,
        _variantColors: variantColors,
      };
    });

    // FILTERS
    let list = withMeta.filter((p) => {
      const priceOk = p._price >= priceRange.min && p._price <= priceRange.max;

      const colorOk =
        colorFilters.size === 0 ||
        colorFilters.has(String(p._color).toLowerCase());

      const sizeOk =
        sizeFilters.size === 0 ||
        p._sizesInStock.some((s) => sizeFilters.has(s));

      return priceOk && colorOk && sizeOk;
    });

    // SEARCH
    const q = normalize(searchTerm);
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter((p) =>
        tokens.every((tok) => {
          if (COLOR_KEYWORDS.has(tok)) {
            return p._variantColors.some((c) => c.includes(tok));
          }
          return p._searchText.includes(tok);
        })
      );
    }

    // SORT
    if (sortOption === "priceAsc") {
      list = [...list].sort((a, b) => a._price - b._price);
    } else if (sortOption === "priceDesc") {
      list = [...list].sort((a, b) => b._price - a._price);
    } else if (sortOption === "popularity") {
      list = [...list].sort((a, b) => {
        const ar = a._rating ?? 0;
        const br = b._rating ?? 0;
        if (br !== ar) return br - ar;
        const ac = a._ratingCount ?? 0;
        const bc = b._ratingCount ?? 0;
        if (bc !== ac) return bc - ac;
        return 0;
      });
    }

    return list;
  }, [products, priceRange, colorFilters, sizeFilters, sortOption, searchTerm]);

  const toggleFavorite = async (productId) => {
    const pid = String(productId);

    if (!user) {
      setNotification("Please sign in to use wishlist.");
      scheduleMessageClear();
      return;
    }

    const isAlreadyWishlisted = wishlistIds.has(pid);

    try {
      if (isAlreadyWishlisted) {
        await removeWishlistItem(pid);
        setWishlistIds((prev) => {
          const next = new Set([...prev].map(String));
          next.delete(pid);
          return next;
        });
        setNotification("Removed from wishlist.");
      } else {
        await addWishlistItem(pid);
        setWishlistIds((prev) => {
          const next = new Set([...prev].map(String));
          next.add(pid);
          return next;
        });
        setNotification("Added to wishlist.");
      }
    } catch (err) {
      console.error("Wishlist toggle failed", err);
      setNotification("Could not update wishlist.");
    }

    scheduleMessageClear();
  };

  const handleSizeSelect = (productId, size) => {
    setSelectedSizes((prev) => {
      const next = new Map(prev);
      const currentSize = next.get(productId);
      if (currentSize === size) next.delete(productId);
      else next.set(productId, size);
      return next;
    });
  };

  const getCartKey = (productId, size) => `${productId}-${size}`;
  const getCartQuantity = (productId, size) =>
    cartItems.get(getCartKey(productId, size)) || 0;

  const updateCartQuantity = (productId, size, delta) => {
    setCartItems((prev) => {
      const next = new Map(prev);
      const key = getCartKey(productId, size);
      const current = next.get(key) || 0;
      const q = Math.max(0, current + delta);
      if (q === 0) next.delete(key);
      else next.set(key, q);
      return next;
    });
  };

  const handleAddToCart = async (product) => {
    const sizeStock = product._sizeStock || {};
    const totalStock = Object.values(sizeStock).reduce(
      (sum, v) => sum + (typeof v === "number" ? v : Number(v || 0)),
      0
    );
    if (totalStock <= 0) {
      setNotification("This product is out of stock.");
      scheduleMessageClear();
      return;
    }

    const selectedSize = selectedSizes.get(product.id);
    if (!selectedSize) {
      setNotification("Please select a size.");
      scheduleMessageClear();
      return;
    }

    const sku = product._sizeToSku?.[selectedSize];
    if (!sku) {
      setNotification("SKU missing for selected size.");
      scheduleMessageClear();
      return;
    }

    const existingCartId =
      user?.id
        ? undefined
        : typeof window !== "undefined"
        ? window.localStorage.getItem(CART_KEY) || undefined
        : undefined;

    try {
      const { data } = await addToBasket({
        userId: user?.id,
        cartId: existingCartId,
        productId: product.id,
        sku,
        quantity: 1,
      });

      if (data.orderId && !user?.id && typeof window !== "undefined") {
        window.localStorage.setItem(CART_KEY, data.orderId);
      }

      updateCartQuantity(product.id, selectedSize, 1);

      setNotification(`${product.name} (Size: ${selectedSize}) added to basket.`);
      scheduleMessageClear();

      setSelectedSizes((prev) => {
        const next = new Map(prev);
        next.delete(product.id);
        return next;
      });
    } catch (err) {
      console.error("addToBasket error", err);
      setNotification("Could not add item to basket.");
      scheduleMessageClear();
    }
  };

  return (
    <div className="category-page">
      {/* ✅ Dynamic topbar */}
      <CategoryTopbar />

      <main className="category-layout">
        <aside className="category-sidebar">
          <input
            id="category-sidebar-search"
            type="text"
            className="category-search-input"
            placeholder={`Search in ${currentCategoryLabel}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            className="category-clear"
            onClick={() => {
              setColorFilters(new Set());
              setSizeFilters(new Set());
              setPriceRange({ ...priceBounds });
              setSortOption(null);
              setSearchTerm("");
            }}
            type="button"
          >
            CLEAR FILTERS
          </button>

          {/* SORT */}
          <section className="category-filter">
            <h3 className="category-filter-title">SORT</h3>

            <button
              className={`category-filter-option${
                sortOption === "priceAsc" ? " category-filter-option--active" : ""
              }`}
              onClick={() =>
                setSortOption((prev) => (prev === "priceAsc" ? null : "priceAsc"))
              }
              type="button"
            >
              Price: Low to High
            </button>

            <button
              className={`category-filter-option${
                sortOption === "priceDesc" ? " category-filter-option--active" : ""
              }`}
              onClick={() =>
                setSortOption((prev) => (prev === "priceDesc" ? null : "priceDesc"))
              }
              type="button"
            >
              Price: High to Low
            </button>

            <button
              className={`category-filter-option${
                sortOption === "popularity" ? " category-filter-option--active" : ""
              }`}
              onClick={() =>
                setSortOption((prev) => (prev === "popularity" ? null : "popularity"))
              }
              type="button"
            >
              Popularity
            </button>

            <button
              className="category-filter-option"
              onClick={() => setSortOption(null)}
              type="button"
            >
              New Arrivals
            </button>
          </section>

          {/* COLOR */}
          <section className="category-filter">
            <h3 className="category-filter-title">COLOR</h3>
            <div className="category-filter-pills">
              {colorOptions.map((c) => {
                const active = colorFilters.has(c.value);
                return (
                  <button
                    key={c.id}
                    className={`category-pill${active ? " category-pill--active" : ""}`}
                    onClick={() => {
                      setColorFilters((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.value)) next.delete(c.value);
                        else next.add(c.value);
                        return next;
                      });
                    }}
                    aria-pressed={active}
                    type="button"
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* SIZE */}
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
                        if (next.has(s)) next.delete(s);
                        else next.add(s);
                        return next;
                      });
                    }}
                    aria-pressed={active}
                    type="button"
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </section>

          {/* PRICE */}
          <section className="category-filter">
            <h3 className="category-filter-title">PRICE</h3>
            <div className="price-filter-container">
              <div className="price-slider-wrapper">
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={priceRange.min}
                  onChange={(e) => {
                    const newMin = Math.min(
                      Number(e.target.value),
                      priceRange.max - 1
                    );
                    setPriceRange((p) => ({ ...p, min: newMin }));
                  }}
                  className="price-slider price-slider--min"
                />
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={priceRange.max}
                  onChange={(e) => {
                    const newMax = Math.max(
                      Number(e.target.value),
                      priceRange.min + 1
                    );
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
          {loadingProducts && <p>Loading products…</p>}
          {!loadingProducts && productError && <p>{productError}</p>}

          {!loadingProducts &&
            !productError &&
            filteredProducts.map((product) => {
              const pid = String(product.id);
              const isFavorite = wishlistIds.has(pid);

              const allSizes =
                product._sizesAll ||
                Array.from(
                  new Set(
                    (product.variants || [])
                      .map((v) => v.size && v.size.trim())
                      .filter(Boolean)
                  )
                );

              const sizeStock = product._sizeStock || {};
              
              // Get current (discounted) price
              const priceNumber =
                product._price ??
                Number(
                  product.basePrice ??
                    (product.variants?.[0]?.price ?? 0)
                );
              
              // Get original price
              const originalPriceNumber = Number(
                product.originalBasePrice ??
                  (product.variants?.[0]?.originalPrice ?? 0)
              );

              const hasDiscount = originalPriceNumber > 0 && originalPriceNumber > priceNumber;
              
              const displayPrice = `$${priceNumber.toFixed(2)}`;
              const displayOriginalPrice = originalPriceNumber > 0 ? `$${originalPriceNumber.toFixed(2)}` : null;
              
              const discountPercent = product.discountPercent || 
                (hasDiscount && originalPriceNumber > 0
                  ? Math.round(((originalPriceNumber - priceNumber) / originalPriceNumber) * 100)
                  : null);

              const totalStock = Object.values(sizeStock).reduce(
                (sum, v) => sum + (typeof v === "number" ? v : Number(v || 0)),
                0
              );
              const productOutOfStock = totalStock <= 0;

              const primaryImage =
                product.mainImageUrl || (product.imageUrls || [])[0] || "";
              const secondaryImage =
                product.imageUrls && product.imageUrls.length > 1
                  ? product.imageUrls[1]
                  : primaryImage;

              const isHovered = hoveredProductId === product.id;
              const displayImage = isHovered ? secondaryImage : primaryImage;

              const colorText = product.variants?.[0]?.color || "-";

              const goDetail = () => navigate(`/product/${product.id}`);

              return (
                <article key={product.id} className="product-card">
                  <div
                    className="product-media"
                    onMouseEnter={() => setHoveredProductId(product.id)}
                    onMouseLeave={() => setHoveredProductId(null)}
                  >
                    <img
                      src={displayImage}
                      alt={product.name}
                      loading="lazy"
                      onClick={goDetail}
                      style={{ cursor: "pointer" }}
                    />

                    <button
                      className={`favorite-button${
                        isFavorite ? " favorite-button--active" : ""
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite(pid);
                      }}
                      aria-label="Add to favorites"
                      type="button"
                    >
                      {isFavorite ? "♥" : "♡"}
                    </button>

                    {productOutOfStock && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 8,
                          left: 8,
                          background: "rgba(0,0,0,0.7)",
                          color: "#fff",
                          padding: "4px 8px",
                          fontSize: 11,
                          letterSpacing: "0.08em",
                        }}
                      >
                        OUT OF STOCK
                      </div>
                    )}
                  </div>

                  <div className="product-info">
                    <h3
                      className="product-name"
                      onClick={goDetail}
                      style={{ cursor: "pointer" }}
                    >
                      {product.name}
                    </h3>

                    <p className="product-meta">
                      <span>COLOR: {String(colorText).toUpperCase()}</span>
                    </p>

                    <div className="product-price" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {hasDiscount && displayOriginalPrice && (
                        <span
                          style={{
                            textDecoration: "line-through",
                            color: "#999",
                            fontSize: "0.875rem",
                          }}
                        >
                          {displayOriginalPrice}
                        </span>
                      )}
                      <span
                        style={{
                          color: hasDiscount ? "#d32f2f" : "inherit",
                          fontWeight: hasDiscount ? "bold" : "normal",
                        }}
                      >
                        {displayPrice}
                      </span>
                      {hasDiscount && discountPercent && (
                        <span
                          style={{
                            backgroundColor: "#d32f2f",
                            color: "white",
                            padding: "2px 6px",
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            borderRadius: "3px",
                          }}
                        >
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    <div className="product-size-selector">
                      <p className="size-selector-label">SIZE</p>
                      <div className="size-selector-buttons">
                        {allSizes.map((size) => {
                          const stockForSize = sizeStock[size] ?? 0;
                          const isOutOfStock = stockForSize <= 0;

                          const isSelected =
                            selectedSizes.get(product.id) === size;
                          const cartQuantity = getCartQuantity(product.id, size);
                          const isInCart = cartQuantity > 0;

                          return (
                            <button
                              key={size}
                              className={
                                "size-selector-button" +
                                (isSelected
                                  ? " size-selector-button--selected"
                                  : "") +
                                (isInCart ? " size-selector-button--in-cart" : "") +
                                (isOutOfStock ? " size-selector-button--oos" : "")
                              }
                              onClick={() =>
                                !isOutOfStock &&
                                handleSizeSelect(product.id, size)
                              }
                              aria-label={`Select size ${size}`}
                              disabled={isOutOfStock}
                              type="button"
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      className="product-add-to-basket"
                      onClick={() =>
                        !productOutOfStock && handleAddToCart(product)
                      }
                      disabled={productOutOfStock}
                      type="button"
                      style={{
                        marginTop: "0.5rem",
                        width: "50%",
                        padding: "0.375rem 0.5rem",
                        backgroundColor: productOutOfStock ? "#bbbbbb" : "#3d211c",
                        color: "white",
                        border: "1px solid #3d211c",
                        borderRadius: "4px",
                        cursor: productOutOfStock ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      {productOutOfStock ? "Out of stock" : "Add to basket"}
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
