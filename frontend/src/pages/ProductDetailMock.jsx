// src/pages/ProductDetailMock.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import sweatshirt1 from "../assets/productdetail_sweatshirt_mockup_1.jpg";
import sweatshirt2 from "../assets/productdetail_sweatshirt_mockup_2.jpg";
import sweatshirt3 from "../assets/productdetail_sweatshirt_mockup_3.jpg";
import sweatshirt4 from "../assets/productdetail_sweatshirt_mockup_4.jpg";
import sweatshirt5 from "../assets/productdetail_sweatshirt_mockup_5.jpg";

const hasAdminAccess = (user) =>
  user?.roles?.includes("SALES_MANAGER") ||
  user?.roles?.includes("PRODUCT_MANAGER") ||
  user?.roles?.includes("SUPPORT_AGENT") ||
  user?.role === "SALES_MANAGER" ||
  user?.role === "PRODUCT_MANAGER" ||
  user?.role === "SUPPORT_AGENT";

const MOCK_PRODUCT = {
  id: "mock-cream-hoodie",
  name: "Cream Zip Hoodie",
  priceText: "$60.00",
  sku: "TIDL-HOODIE-CREAM-001",
  color: "Cream",
  sizes: ["XS", "S", "M", "L"],
  description:
    "Relaxed cream zip hoodie with dropped shoulders and soft fleece lining. Slightly cropped length with clean hem for an easy, everyday fit.",
  fabric: "95% cotton, 5% elastane",
  madeIn: "Turkey",
  images: [sweatshirt1, sweatshirt2, sweatshirt3, sweatshirt4, sweatshirt5],
  recommendations: [
    { id: "mock-1", name: "Hailie Long Sleeve Top", price: "$55", image: sweatshirt1 },
    { id: "mock-2", name: "Jennie Top",             price: "$55", image: sweatshirt2 },
    { id: "mock-3", name: "Tori Top",               price: "$55", image: sweatshirt3 },
    { id: "mock-4", name: "Jennie Striped Top",     price: "$55", image: sweatshirt5 },
    { id: "mock-5", name: "Relaxed Zip Hoodie",     price: "$55", image: sweatshirt4 },
    { id: "mock-6", name: "Boxy Cream Sweatshirt",  price: "$55", image: sweatshirt3 },
    { id: "mock-7", name: "Soft Fleece Hoodie",     price: "$55", image: sweatshirt2 },
    { id: "mock-8", name: "Everyday Cream Top",     price: "$55", image: sweatshirt1 },
  ],
};

export default function ProductDetailMock() {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState("S");
  const [quantity, setQuantity] = useState(1);

  const go = (path) => () => navigate(path);

  const handleAddToCart = () => {
    console.log("ADD TO CART (mock)", {
      productId: MOCK_PRODUCT.id,
      size: selectedSize,
      quantity,
    });
    alert("Added to cart (mock).");
  };

  const decQty = () => setQuantity((q) => (q > 1 ? q - 1 : 1));
  const incQty = () => setQuantity((q) => q + 1);

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

      {/* MAIN DETAIL LAYOUT */}
      <main className="product-page">
        <section className="product-main">
          {/* Left: big image + thumbnails */}
          <div className="product-gallery">
            <div className="product-main-image-wrapper">
              <img
                src={MOCK_PRODUCT.images[selectedIndex]}
                alt={MOCK_PRODUCT.name}
                className="product-main-image"
              />
            </div>

            <div className="product-thumbs">
              {MOCK_PRODUCT.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`product-thumb-button ${
                    idx === selectedIndex ? "active" : ""
                  }`}
                  onClick={() => setSelectedIndex(idx)}
                >
                  <img src={img} alt={`${MOCK_PRODUCT.name} ${idx + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Right: info panel */}
          <div className="product-info">
            <h1 className="product-title">{MOCK_PRODUCT.name}</h1>
            <p className="product-sku">SKU: {MOCK_PRODUCT.sku}</p>
            <p className="product-price">{MOCK_PRODUCT.priceText}</p>

            <div className="product-option-group">
              <span className="product-option-label">COLOR</span>
              <div className="product-color-swatch">{MOCK_PRODUCT.color}</div>
            </div>

            <div className="product-option-group">
              <span className="product-option-label">SIZE</span>
              <div className="product-size-row">
                {MOCK_PRODUCT.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`product-size-pill ${
                      size === selectedSize ? "active" : ""
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

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
              <p>{MOCK_PRODUCT.description}</p>
              <p>
                <strong>Fabric:</strong> {MOCK_PRODUCT.fabric}
              </p>
              <p>
                <strong>Made in:</strong> {MOCK_PRODUCT.madeIn}
              </p>
            </div>
          </div>
        </section>

        {/* "You may also like" */}
        <section className="product-related">
          <h2 className="product-related-title">YOU MAY ALSO LIKE…</h2>
          <div className="product-related-grid">
            {MOCK_PRODUCT.recommendations.map((item) => (
              <div key={item.id} className="product-related-card">
                <div className="product-related-image-wrapper">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="product-related-info">
                  <p className="product-related-name">{item.name}</p>
                  <p className="product-related-price">{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}