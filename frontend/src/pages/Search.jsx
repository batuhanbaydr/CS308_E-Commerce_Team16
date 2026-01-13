// src/pages/Search.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listProducts } from "../lib/api";
import CategoryTopbar from "../components/CategoryTopbar.jsx";

function normalize(x) {
  return String(x || "").trim().toLowerCase();
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

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const paramQuery = searchParams.get("q") || "";
  const [searchText, setSearchText] = useState(paramQuery);

  const [sortBy, setSortBy] = useState("relevance"); // relevance | popularity | priceAsc | priceDesc
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // keep input in sync if URL param changes
  useEffect(() => {
    setSearchText(paramQuery);
  }, [paramQuery]);

  // load ALL products once
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await listProducts(); // returns ALL products
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

  // 🔁 DYNAMIC COLOR KEYWORDS built from variants
  const COLOR_KEYWORDS = useMemo(() => {
    const set = new Set();

    (allProducts || []).forEach((p) => {
      (p.variants || []).forEach((v) => {
        const raw = String(v.color || "").trim().toLowerCase();
        if (!raw) return;

        set.add(raw);
        raw.split(/\s+/).forEach((tok) => tok && set.add(tok));
      });
    });

    return set;
  }, [allProducts]);

  const results = useMemo(() => {
    const q = normalize(searchText);
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);

    let list = allProducts
      .map((p) => {
        const fullText = buildSearchText(p);

        const variantColors = (p.variants || [])
          .map((v) => normalize(v.color || ""))
          .filter(Boolean);

        const matchesAllTokens = tokens.every((tok) => {
          if (COLOR_KEYWORDS.has(tok)) {
            return variantColors.some((c) => c.includes(tok));
          }
          return fullText.includes(tok);
        });

        return matchesAllTokens ? p : null;
      })
      .filter(Boolean);

    list = list.map((p) => {
      const avg =
        typeof p.averageRating === "number"
          ? p.averageRating
          : Number(p.averageRating ?? 0);

      const count =
        typeof p.ratingCount === "number"
          ? p.ratingCount
          : Number(p.ratingCount ?? 0);

      return {
        ...p,
        _price: Number(
          p.basePrice ??
            (p.variants && p.variants[0] && p.variants[0].price) ??
            0
        ),
        _rating: Number.isFinite(avg) ? avg : 0,
        _ratingCount: Number.isFinite(count) ? count : 0,
      };
    });

    if (sortBy === "popularity") {
      list.sort((a, b) => {
        if ((b._rating ?? 0) !== (a._rating ?? 0)) return (b._rating ?? 0) - (a._rating ?? 0);
        if ((b._ratingCount ?? 0) !== (a._ratingCount ?? 0))
          return (b._ratingCount ?? 0) - (a._ratingCount ?? 0);
        return 0;
      });
    } else if (sortBy === "priceAsc") {
      list.sort((a, b) => a._price - b._price);
    } else if (sortBy === "priceDesc") {
      list.sort((a, b) => b._price - a._price);
    }

    return list;
  }, [allProducts, searchText, sortBy, COLOR_KEYWORDS]);

  const handleSearchBarSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const filterLabel = (() => {
    switch (sortBy) {
      case "popularity":
        return "Popularity (by Top Rated)";
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
      {/* ✅ dynamic shared topbar */}
      <CategoryTopbar />

      <main className="search-simple-wrapper">
        <form className="search-simple-searchbar" onSubmit={handleSearchBarSubmit}>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="WHAT ARE YOU LOOKING FOR?"
          />
        </form>

        <h2 className="search-simple-title">Search Results</h2>

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
                    Popularity (by Top Rated)
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
              ? `${results.length} result${results.length === 1 ? "" : "s"} found for “${searchText.trim()}”`
              : "Start typing to search all products"}
          </div>
        </div>

        {loading && <p>Loading products…</p>}
        {!loading && errorMsg && <p>{errorMsg}</p>}

        {!loading && !errorMsg && (
          <section className="search-results-grid">
            {results.map((p) => {
              // Get current (discounted) price
              const priceNumber = Number(
                p.basePrice ??
                  (p.variants && p.variants[0] && p.variants[0].price) ??
                  0
              );
              
              // Get original price
              const originalPriceNumber = Number(
                p.originalBasePrice ??
                  (p.variants && p.variants[0] && p.variants[0].originalPrice) ??
                  0
              );

              const hasDiscount = originalPriceNumber > 0 && originalPriceNumber > priceNumber;
              
              const displayPrice = `$${priceNumber.toFixed(2)}`;
              const displayOriginalPrice = originalPriceNumber > 0 ? `$${originalPriceNumber.toFixed(2)}` : null;
              
              const discountPercent = p.discountPercent || 
                (hasDiscount && originalPriceNumber > 0
                  ? Math.round(((originalPriceNumber - priceNumber) / originalPriceNumber) * 100)
                  : null);
              
              const primaryImage = p.mainImageUrl || (p.imageUrls || [])[0] || "";

              let totalStock = 0;
              (p.variants || []).forEach((v) => {
                const n = typeof v.stock === "number" ? v.stock : Number(v.stock || 0);
                totalStock += n;
              });
              const outOfStock = totalStock <= 0;

              return (
                <article
                  key={p.id}
                  className="search-result-card"
                  onClick={() => navigate(`/product/${p.id}`)}
                >
                  <div className="search-result-image-wrap">
                    {primaryImage && <img src={primaryImage} alt={p.name} />}
                    {outOfStock && (
                      <span className="search-result-oos-badge">OUT OF STOCK</span>
                    )}
                  </div>
                  <div className="search-result-info">
                    <h3>{p.name}</h3>
                    <div className="search-result-price" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
