// src/pages/Wishlist.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

export default function Wishlist() {
  const navigate = useNavigate();
  const { openCart } = useCartDrawer();

  return (
    <div className="category-page">
      {/* reuse the category-style topbar so it feels consistent */}
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
          <img
            src={bagIcon}
            alt="Cart"
            className="category-icon"
            onClick={openCart}
          />
        </div>
      </header>

      <main className="profile-wrapper">
        <section className="profile-hero">
          <h1 className="profile-heading">Wishlist</h1>
          <p className="profile-subheading">
            Items you save for later will appear here.
          </p>
        </section>

        <section className="profile-card">
          <header className="profile-card-header">
            <h2>Saved items</h2>
            <p>Coming soon – your wishlist will live here.</p>
          </header>
          <div className="profile-card-body">
            <p style={{ color: "#666" }}>
              You haven&apos;t added anything to your wishlist yet.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
