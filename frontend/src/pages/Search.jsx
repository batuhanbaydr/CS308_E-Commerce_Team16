// src/pages/Search.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { meRequest, logoutRequest, listProducts } from "../lib/api";
import searchIcon from "../assets/search.png";
import bagIcon from "../assets/bag.png";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

function normalize(x) {
  return String(x || "").trim().toLowerCase();
}

function buildSearchText(product) {
  const parts = [];

  // main fields
  parts.push(
    product.name,
    product.description,
    product.category,
    product.fabric,
    product.madeIn
  );

  // variants: color, size, etc.
  (product.variants || []).forEach((v) => {
    if (v.color) parts.push(v.color);
    if (v.size) parts.push(v.size);
    if (v.sku) parts.push(v.sku);
  });

  // join everything and normalize once
  return normalize(parts.join(" "));
}

export default function Search() {
  const navigate = useNavigate();
  const { openCart } = useCartDrawer();
  const [searchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const paramQuery = searchParams.get("q") || "";

  // this is the text in the "WHAT ARE YOU LOOKING FOR?" bar
  const [searchText, setSearchText] = useState(paramQuery);

  const [sortBy, setSortBy] = useState("relevance"); // relevance | popularity | priceAsc | priceDesc
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // keep input in sync if URL param changes (e.g. coming from overlay)
  useEffect(() => {
    setSearchText(paramQuery);
  }, [paramQuery]);

  // load current user
  useEffect(() => {
    (async () => {
      try {
        const { data } = await meRequest();
        setUser(data);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  const go = (path) => () => navigate(path);

  // load ALL products once
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await listProducts(); // should return ALL products
        setAllProducts(res.data || []);
      } catch (err) {
        console.error("search load error", err);
        setErrorMsg("Could not load products for search.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 🔁 DYNAMIC COLOR KEYWORDS built from variants (bonus: fuzzy-friendly)
  const COLOR_KEYWORDS = useMemo(() => {
    const set = new Set();

    (allProducts || []).forEach((p) => {
      (p.variants || []).forEach((v) => {
        const raw = String(v.color || "").trim().toLowerCase();
        if (!raw) return;

        // full color string, e.g. "light camel"
        set.add(raw);

        // bonus: also add individual words "light" and "camel"
        raw.split(/\s+/).forEach((tok) => {
          if (tok) set.add(tok);
        });
      });
    });

    return set;
  }, [allProducts]);

  // filter & sort products based on search text & sort option
  const results = useMemo(() => {
    const q = normalize(searchText);
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);

    let list = allProducts
      .map((p) => {
        const searchText = buildSearchText(p);

        const variantColors = (p.variants || [])
          .map((v) => normalize(v.color || ""))
          .filter(Boolean);

        const matchesAllTokens = tokens.every((tok) => {
          // if this token is a known color word, only match against colors
          if (COLOR_KEYWORDS.has(tok)) {
            // BONUS: fuzzy color match — "camel" matches "light camel"
            return variantColors.some((c) => c.includes(tok));
          }

          // otherwise: normal text search on all fields
          return searchText.includes(tok);
        });

        return matchesAllTokens ? p : null;
      })
      .filter(Boolean);

    // attach meta info for sorting
    list = list.map((p) => ({
      ...p,
      _popularity: Number(p.purchaseCount ?? p.totalPurchases ?? 0),
      _price: Number(
        p.basePrice ??
          (p.variants && p.variants[0] && p.variants[0].price) ??
          0
      ),
    }));

    if (sortBy === "popularity") {
      list.sort((a, b) => (b._popularity || 0) - (a._popularity || 0));
    } else if (sortBy === "priceAsc") {
      list.sort((a, b) => a._price - b._price);
    } else if (sortBy === "priceDesc") {
      list.sort((a, b) => b._price - a._price);
    }

    return list;
  }, [allProducts, searchText, sortBy, COLOR_KEYWORDS]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {}
    setUser(null);
    navigate("/home");
  };

  const handleHeaderSearchClick = () => {
    // optional: go back to home so user can use overlay again
    navigate("/home");
  };

  const handleSearchBarSubmit = (e) => {
    e.preventDefault();
    // keep URL in sync with current search text
    const trimmed = searchText.trim();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const filterLabel = (() => {
    switch (sortBy) {
      case "popularity":
        return "Popularity";
      case "priceAsc":
        return "Price: Low to High";
      case "priceDesc":
        return "Price: High to Low";
      default:
        return "Relevance";
    }
  })();

  return (
    <div className="category-page">
      {/* === SAME TOP BAR === */}
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
            onClick={handleHeaderSearchClick}
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

      {/* === BODY === */}
      <main className="search-simple-wrapper">
        {/* TOP SEARCH BAR = "WHAT ARE YOU LOOKING FOR?" */}
        <form
          className="search-simple-searchbar"
          onSubmit={handleSearchBarSubmit}
        >
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="WHAT ARE YOU LOOKING FOR?"
          />
        </form>

        {/* centered title */}
        <h2 className="search-simple-title">Search Results</h2>

        {/* filter row */}
        <div className="search-simple-filter-row">
          <div className="search-simple-filter-left">
            <span className="search-simple-filter-label">Filter by:</span>
            <div className="search-simple-filter-dropdown">
              <button
                type="button"
                className="search-simple-filter-button"
                onClick={() => setShowFilterMenu((v) => !v)}
              >
                {filterLabel}
                <span className="search-simple-filter-caret">▾</span>
              </button>

              {showFilterMenu && (
                <div className="search-simple-filter-menu">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("relevance");
                      setShowFilterMenu(false);
                    }}
                  >
                    Relevance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("popularity");
                      setShowFilterMenu(false);
                    }}
                  >
                    Popularity
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("priceAsc");
                      setShowFilterMenu(false);
                    }}
                  >
                    Price: Low to High
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("priceDesc");
                      setShowFilterMenu(false);
                    }}
                  >
                    Price: High to Low
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="search-simple-count">
            {searchText.trim()
              ? `${results.length} result${
                  results.length === 1 ? "" : "s"
                } found for “${searchText.trim()}”`
              : "Start typing to search all products"}
          </div>
        </div>

        {/* results grid */}
        {loading && <p>Loading products…</p>}
        {!loading && errorMsg && <p>{errorMsg}</p>}

        {!loading && !errorMsg && (
          <section className="search-results-grid">
            {results.map((p) => {
              const priceNumber = Number(
                p.basePrice ??
                  (p.variants && p.variants[0] && p.variants[0].price) ??
                  0
              );
              const displayPrice = `$${priceNumber.toFixed(2)}`;
              const primaryImage =
                p.mainImageUrl || (p.imageUrls || [])[0] || "";

              let totalStock = 0;
              (p.variants || []).forEach((v) => {
                const n =
                  typeof v.stock === "number"
                    ? v.stock
                    : Number(v.stock || 0);
                totalStock += n;
              });
              const outOfStock = totalStock <= 0;

              const goDetail = () => navigate(`/product/${p.id}`);

              return (
                <article
                  key={p.id}
                  className="search-result-card"
                  onClick={goDetail}
                >
                  <div className="search-result-image-wrap">
                    {primaryImage && <img src={primaryImage} alt={p.name} />}
                    {outOfStock && (
                      <span className="search-result-oos-badge">
                        OUT OF STOCK
                      </span>
                    )}
                  </div>
                  <div className="search-result-info">
                    <h3>{p.name}</h3>
                    <p className="search-result-price">{displayPrice}</p>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
