// src/pages/ProductDetail.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import {
  fetchProduct,
  listProducts,
  meRequest,
  addToBasket,
  logoutRequest,
  getReviewsForProduct,   
  createReview,    
} from "../lib/api";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

const CART_STORAGE_KEY = "tidl_cart_id";

export default function ProductDetail() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { openCart } = useCartDrawer();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [user, setUser] = useState(null);

  const [product, setProduct] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [related, setRelated] = useState([]);
  const [relatedError, setRelatedError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");

  const [userRating, setUserRating] = useState(0); // 1–5
  const [userComment, setUserComment] = useState("");
  const [reviewFormError, setReviewFormError] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const reviewListRef = useRef(null);

const scrollReviews = (direction) => {
  if (!reviewListRef.current) return;
  const amount = 280; // pixels to scroll per click (card width + gap)
  reviewListRef.current.scrollBy({
    left: direction === "left" ? -amount : amount,
    behavior: "smooth",
  });
};

  const [notification, setNotification] = useState(null);
  const toastTimeoutRef = useRef(null);


  const go = (path) => () => navigate(path);

  // ---------- load logged-in user ----------
  useEffect(() => {
    meRequest()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

    // cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
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
    const selectedSizeStock =
        selectedSize && product && product._sizeStock
          ? product._sizeStock[selectedSize] ?? 0
          : 0;
    const isSelectedSizeOutOfStock =
        !!selectedSize && selectedSizeStock <= 0;


    const handleLogout = async () => {
        try { await logoutRequest(); } catch {}
        setUser(null); // back to guest
      };
    

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

  // ===== fetch reviews for this product =====
  useEffect(() => {
    if (!productId) return;

    setReviewsLoading(true);
    setReviewsError("");

    getReviewsForProduct(productId)
      .then((res) => {
        setReviews(res.data || []);
      })
      .catch((err) => {
        console.error("getReviewsForProduct error", err);
        setReviewsError("Could not load reviews.");
      })
      .finally(() => setReviewsLoading(false));
  }, [productId]);  

  const scheduleMessageClear = () => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
      toastTimeoutRef.current = null;
    }, 2400);
  };

// ---------- REAL ADD TO CART ----------
const handleAddToCart = async () => {
  if (!product) return;

  // must pick a size
  if (!selectedSize) {
    setNotification("Please select a size.");
    scheduleMessageClear();
    return;
  }
  // check stock for selected size
  const sizeStockMap = product._sizeStock || {};
  const stockForSelected = sizeStockMap[selectedSize] ?? 0;
  if (stockForSelected <= 0) {
    setNotification("This size is out of stock.");
    scheduleMessageClear();
    return;
  }

  const skuMap = product._sizeToSku || {};
  const skuForSize = skuMap[selectedSize] || uiSku;

  if (!skuForSize) {
    setNotification("Selected size is not available.");
    scheduleMessageClear();
    return;
  }

  // If user is logged in, don't use cartId from localStorage
  // This ensures logged-in users only see their own cart, not guest cart
  const cartId =
    user?.id
      ? undefined // Logged-in users don't use cartId
      : typeof window !== "undefined"
      ? window.localStorage.getItem(CART_STORAGE_KEY) || undefined
      : undefined;

  try {
    const { data } = await addToBasket({
      userId: user?.id,      // 👈 guest safe (undefined OK)
      cartId,
      productId: product.id,
      sku: skuForSize,
      quantity,
    });

    // Save cartId only for guests (not for logged-in users)
    if (data.orderId && !user?.id && typeof window !== "undefined") {
      window.localStorage.setItem(CART_STORAGE_KEY, data.orderId);
    }

    // SUCCESS MESSAGE (your preferred style)
    setNotification(`${product.name} (Size: ${selectedSize}) added to basket.`);
    scheduleMessageClear();

    // optional: auto-open sliding cart drawer
    // openCart();

  } catch (err) {
    console.error("addToBasket error", err);
    setNotification("Could not add item to basket.");
    scheduleMessageClear();
  }
};


const renderStars = (value) => {
  const rounded = Math.round(value || 0);
  return (
    <span className="product-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="product-star">
          {i <= rounded ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
};

const averageRating =
  reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : null;  

const handleSubmitReview = async (e) => {
  e.preventDefault();
  if (!product) return;

  if (!user) {
    navigate("/login");
    return;
  }

  if (!userRating || userRating < 1 || userRating > 5) {
    setReviewFormError("Please select a rating between 1 and 5.");
    return;
  }

  setSubmittingReview(true);
  setReviewFormError("");

  try {
    await createReview({
      productId: product.id,
      rating: userRating,
      comment: userComment.trim() || null,
    });

    // clear form
    setUserRating(0);
    setUserComment("");

    // refresh reviews so user sees the updated rating/comment state
    const res = await getReviewsForProduct(product.id);
    setReviews(res.data || []);
  } catch (err) {
    console.error("createReview error", err);
    const msg =
      err?.response?.data?.message || "Could not submit your review.";
    setReviewFormError(msg);
  } finally {
    setSubmittingReview(false);
  }
};

  return (
  <div className="home-page">
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
        <button
          onClick={() => navigate("/shop-the-look")}
          className="category-nav-item"
        >
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
            onClick={() => setShowProfileMenu((p) => !p)}
            style={{ marginRight: "0.5rem" }}
          >
            <span />
            <span />
            <span />
            {showProfileMenu && (
              <div className="details-menu">
                <button
                  className="details-menu-item"
                  onClick={go("/profile")}
                >
                  Details
                </button>
                <button
                  className="details-menu-item"
                  onClick={handleLogout}
                >
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
              { selectedSize && (
                <p
                  className="product-stock-info"
                  style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}
                >
                  Stock: {selectedSizeStock}
                </p>
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
                disabled={!selectedSize || isSelectedSizeOutOfStock}
              >
                {isSelectedSizeOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
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

            {/* REVIEWS & RATINGS */}
            <section className="product-reviews">
              <h2 className="product-reviews-title">REVIEWS</h2>

              {/* Average rating */}
              {averageRating && (
                <div className="product-reviews-summary">
                  <div className="product-reviews-stars">
                    {renderStars(averageRating)}
                  </div>
                  <span className="product-reviews-average">
                    {averageRating.toFixed(1)} / 5
                  </span>
                  <span className="product-reviews-count">
                    ({reviews.length} rating{reviews.length === 1 ? "" : "s"})
                  </span>
                </div>
              )}

              {/* Loading / error for reviews */}
              {reviewsLoading && (
                <p className="product-reviews-message">Loading reviews…</p>
              )}
              {!reviewsLoading && reviewsError && (
                <p className="product-reviews-error">{reviewsError}</p>
              )}

              {/* Review form (only for logged-in users) */}
              <div className="product-review-form-wrapper">
                {user ? (
                  <form className="product-review-form" onSubmit={handleSubmitReview}>
                    <h3 className="product-review-form-title">
                      Write a review
                    </h3>

                    <div className="product-review-rating-input">
                      <span className="product-option-label">Your rating</span>
                      <div className="product-review-stars-input">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={
                              "product-review-star-button" +
                              (userRating >= star ? " active" : "")
                            }
                            onClick={() => setUserRating(star)}
                            aria-label={`${star} star${star === 1 ? "" : "s"}`}
                          >
                            {userRating >= star ? "★" : "☆"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="product-review-comment-input">
                      <label className="product-option-label">
                        Comment (optional)
                      </label>
                      <textarea
                        className="product-review-textarea"
                        rows={3}
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                        placeholder="Tell us what you liked or disliked…"
                      />
                    </div>

                    {reviewFormError && (
                      <p className="product-reviews-error">{reviewFormError}</p>
                    )}

                    <button
                      type="submit"
                      className="product-review-submit"
                      disabled={submittingReview}
                    >
                      {submittingReview ? "Submitting…" : "Submit review"}
                    </button>
                    <p className="product-review-note">
                      Comments will appear after moderation. Your rating is counted immediately.
                    </p>
                  </form>
                ) : (
                  <p className="product-reviews-message">
                    Please sign in to leave a rating and comment.
                  </p>
                )}
              </div>

              {/* Existing reviews list */}
              {!reviewsLoading && reviews.length > 0 && (
                <div className="product-review-list">
                  {reviews.map((r) => (
                    <div key={r.id} className="product-review-item">
                      <div className="product-review-item-header">
                        {renderStars(r.rating)}
                      </div>

                      {/* APPROVED → show real comment */}
                      {r.commentStatus === "APPROVED" && r.comment && (
                        <p className="product-review-comment">{r.comment}</p>
                      )}

                      {/* PENDING → waiting message */}
                      {r.commentStatus === "PENDING" && (
                        <p
                          className="product-review-comment pending-comment"
                          style={{ opacity: 0.6, fontStyle: "italic" }}
                        >
                          This comment will appear after moderation.
                        </p>
                      )}

                      {/* REJECTED → declined message */}
                      {r.commentStatus === "REJECTED" && (
                        <p
                          className="product-review-comment declined-comment"
                          style={{ opacity: 0.6, fontStyle: "italic" }}
                        >
                          This comment is declined.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
                
             

              {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                <p className="product-reviews-message">
                  There are no reviews for this product yet.
                </p>
              )}
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
                    p.mainImageUrl ||
                    (p.imageUrls && p.imageUrls[0]) ||
                    "";

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

    {notification && (
      <div className="category-toast" role="status">
        {notification}
      </div>
    )}
  </div>
);
}