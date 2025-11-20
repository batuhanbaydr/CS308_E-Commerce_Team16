// src/pages/ProductDetail.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import {
  fetchProduct,
  listProducts,
  meRequest,
  addToBasket,
} from "../lib/api";

const CART_STORAGE_KEY = "tidl_cart_id";

export default function ProductDetail() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const [user, setUser] = useState(null);

  const [product, setProduct] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [related, setRelated] = useState([]);
  const [relatedError, setRelatedError] = useState("");

  const go = (path) => () => navigate(path);

  // ---------- load logged-in user ----------
  useEffect(() => {
    meRequest()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  // ===== derive UI-friendly fields from ProductEntity =====
  const galleryImages =
    product
      ? [product.mainImageUrl, ...(product.imageUrls || [])].filter(Boolean)
      : [];

  const mainImage =
    galleryImages.length > 0
      ? galleryImages[Math.min(selectedIndex, galleryImages.length - 1)]
      : "";

  const sizeStock = (product && product._sizeStock) || {};

  const uiSizes =
    product && Array.isArray(product._sizesAll) && product._sizesAll.length > 0
      ? product._sizesAll
      : product?.sizes || [];

  const uiColor =
    product?.variants?.[0]?.color || product?.color || "";

  const uiSku =
    product?.variants?.[0]?.sku || product?.sku || "";

  const rawPrice =
    product?.variants?.[0]?.price != null
      ? product.variants[0].price
      : product?.basePrice;

  const uiPrice = rawPrice != null ? Number(rawPrice) : null;

  const formattedPrice =
    uiPrice != null
      ? new Intl.NumberFormat("tr-TR", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
        }).format(uiPrice)
      : "";

  // ===== fetch product from backend =====
  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg("");

    fetchProduct(productId)
      .then((res) => {
        if (!active) return;
        const p = res.data;

        // build sizeStock + helper size lists + size -> sku map
        const sizeStockLocal = {};
        const sizeToSku = {};

        (p.variants || []).forEach((v) => {
          const sizeKey = v.size && v.size.trim();
          if (!sizeKey) return;

          const stockVal =
            typeof v.stock === "number" ? v.stock : Number(v.stock || 0);
          sizeStockLocal[sizeKey] = (sizeStockLocal[sizeKey] || 0) + stockVal;

          // first sku we see for that size
          if (!sizeToSku[sizeKey] && v.sku) {
            sizeToSku[sizeKey] = v.sku;
          }
        });

        const allSizes = Object.keys(sizeStockLocal);
        const inStockSizes = allSizes.filter((s) => sizeStockLocal[s] > 0);

        const enriched = {
          ...p,
          _sizeStock: sizeStockLocal,
          _sizesAll: allSizes,
          _sizesInStock: inStockSizes,
          _sizeToSku: sizeToSku,
        };

        console.log("ENRICHED PRODUCT", enriched);
        console.log("sizesAll", enriched._sizesAll);
        console.log("sizeStock", enriched._sizeStock);

        setProduct(enriched);
        setSelectedSize(inStockSizes[0] || allSizes[0] || null);
        setSelectedIndex(0);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("fetchProduct error", err);
        setErrorMsg(
          err?.response?.data?.message || "Could not load product details."
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  // auto-rotate gallery every 5s
  useEffect(() => {
    if (!galleryImages || galleryImages.length <= 1) return;

    const intervalId = setInterval(() => {
      setSelectedIndex((prev) => {
        const total = galleryImages.length;
        return (prev + 1) % total;
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [galleryImages.length]);

  // ===== fetch related products =====
  useEffect(() => {
    if (!product || !product.category) return;

    let active = true;
    setRelated([]);
    setRelatedError("");

    listProducts(product.category)
      .then((res) => {
        if (!active) return;
        const all = res.data || [];
        const candidates = all.filter((p) => p.id !== product.id).slice(0, 8);
        setRelated(candidates);
      })
      .catch((err) => {
        if (!active) return;
        console.error("related products error", err);
        setRelatedError("Could not load related products.");
      });

    return () => {
      active = false;
    };
  }, [product]);

  const decQty = () => setQuantity((q) => (q > 1 ? q - 1 : 1));
  const incQty = () => setQuantity((q) => q + 1);

  // ---------- REAL ADD TO CART ----------
  const handleAddToCart = async () => {
    if (!product) return;

    if (!user) {
      // require sign-in before adding
      navigate("/login");
      return;
    }

    if (!selectedSize) {
      alert("Please select a size.");
      return;
    }

    const skuMap = product._sizeToSku || {};
    const skuForSize = skuMap[selectedSize] || uiSku;

    if (!skuForSize) {
      alert("Selected size is not available.");
      return;
    }

    const cartId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(CART_STORAGE_KEY) || undefined
        : undefined;

    try {
      const { data } = await addToBasket({
        userId: user.id,
        cartId,
        productId: product.id,
        sku: skuForSize,
        quantity,
      });

      // store/refresh cartId for later calls (Cart page, more adds, etc.)
      if (data.orderId && typeof window !== "undefined") {
        window.localStorage.setItem(CART_STORAGE_KEY, data.orderId);
      }

      alert("Added to basket.");
      // optional: navigate("/cart");
    } catch (err) {
      console.error("addToBasket error", err);
      alert("Could not add to basket. Please try again.");
    }
  };

  return (
    <div className="home-page">
      {/* Top bar same style as Home */}
      <header className="home-topbar">
        <div className="home-left">
          <span className="home-brand" onClick={go("/home")}>
            TIDL
          </span>
        </div>

        <nav className="home-nav">
          <button className="home-nav-item" onClick={go("/category/sweatshirts")}>
            SWEATSHIRTS
          </button>
          <button className="home-nav-item" onClick={go("/category/shirts")}>
            SHIRTS
          </button>
          <button className="home-nav-item" onClick={go("/category/pants")}>
            PANTS
          </button>
          <button className="home-nav-item" onClick={go("/shop-the-look")}>
            SHOP THE LOOK
          </button>
        </nav>

        <div className="home-right">
          <img
            src={searchIcon}
            alt="search"
            className="home-icon"
            onClick={go("/search")}
          />
          <span className="home-signin" onClick={go("/login")}>
            SIGN IN
          </span>
          <img
            src={bagIcon}
            alt="bag"
            className="home-icon"
            onClick={go("/cart")}
          />
        </div>
      </header>

      <main className="product-page">
        {loading && <div className="product-loading">Loading product…</div>}

        {!loading && errorMsg && (
          <div className="product-error">{errorMsg}</div>
        )}

        {!loading && !errorMsg && product && (
          <>
            <section className="product-main">
              {/* Left: gallery */}
              <div className="product-gallery">
                <div className="product-main-image-wrapper">
                  {mainImage && (
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="product-main-image"
                    />
                  )}
                </div>

                <div className="product-thumbs">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`product-thumb-button ${
                        idx === selectedIndex ? "active" : ""
                      }`}
                      onClick={() => setSelectedIndex(idx)}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: info */}
              <div className="product-info">
                <h1 className="product-title">{product.name}</h1>
                {uiSku && <p className="product-sku">SKU: {uiSku}</p>}

                <p className="product-price">{formattedPrice}</p>

                {uiColor && (
                  <div className="product-option-group">
                    <span className="product-option-label">COLOR</span>
                    <div className="product-color-swatch">{uiColor}</div>
                  </div>
                )}

                {uiSizes && uiSizes.length > 0 && (
                  <div className="product-option-group">
                    <span className="product-option-label">SIZE</span>
                    <div className="product-size-row">
                      {uiSizes.map((size) => {
                        const stockForSize =
                          (product &&
                            product._sizeStock &&
                            product._sizeStock[size]) ?? 0;
                        const isOutOfStock = stockForSize <= 0;

                        return (
                          <button
                            key={size}
                            type="button"
                            className={
                              "product-size-pill" +
                              (size === selectedSize ? " active" : "") +
                              (isOutOfStock ? " product-size-pill--oos" : "")
                            }
                            onClick={() =>
                              !isOutOfStock && setSelectedSize(size)
                            }
                            disabled={isOutOfStock}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="product-option-group">
                  <span className="product-option-label">QUANTITY</span>
                  <div className="product-qty-row">
                    <button
                      type="button"
                      className="product-qty-btn"
                      onClick={decQty}
                    >
                      –
                    </button>
                    <span className="product-qty-value">{quantity}</span>
                    <button
                      type="button"
                      className="product-qty-btn"
                      onClick={incQty}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="product-add-to-cart"
                  onClick={handleAddToCart}
                >
                  ADD TO CART
                </button>

                <div className="product-description">
                  {product.description && <p>{product.description}</p>}
                  {product.fabric && (
                    <p>
                      <strong>Fabric:</strong> {product.fabric}
                    </p>
                  )}
                  {product.madeIn && (
                    <p>
                      <strong>Made in:</strong> {product.madeIn}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* YOU MAY ALSO LIKE... */}
            <section className="product-related">
              <h2 className="product-related-title">YOU MAY ALSO LIKE…</h2>
              {relatedError && (
                <p className="product-related-subtitle">{relatedError}</p>
              )}

              {!relatedError && related.length === 0 && (
                <p className="product-related-subtitle">
                  More items will appear here soon.
                </p>
              )}

              {related.length > 0 && (
                <div className="product-related-scroll">
                  {related.map((p) => {
                    const priceNumber = Number(
                      p.basePrice ??
                        (p.variants &&
                          p.variants[0] &&
                          p.variants[0].price) ??
                        0
                    );
                    const displayPrice = `$${priceNumber.toFixed(2)}`;
                    const img =
                      p.mainImageUrl || (p.imageUrls && p.imageUrls[0]) || "";

                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="product-related-card"
                        onClick={() => navigate(`/product/${p.id}`)}
                      >
                        {img && (
                          <div className="product-related-image-wrap">
                            <img
                              src={img}
                              alt={p.name}
                              className="product-related-image"
                            />
                          </div>
                        )}
                        <div className="product-related-info">
                          <div className="product-related-name">{p.name}</div>
                          <div className="product-related-price">
                            {displayPrice}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
