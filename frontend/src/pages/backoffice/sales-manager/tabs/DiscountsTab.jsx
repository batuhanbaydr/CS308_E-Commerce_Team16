import React, { useEffect, useMemo, useState } from "react";
import { listProducts, applyDiscount } from "../../../../lib/api";

export default function DiscountsTab() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  const [discountPercent, setDiscountPercent] = useState(10);
  const [notifyWishlist, setNotifyWishlist] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [statusMessage, setStatusMessage] = useState(null);
  const [statusKind, setStatusKind] = useState("success"); // "success" | "error"

  // Load products
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      setProductError("");

      try {
        const [sweatRes, shirtRes, pantsRes] = await Promise.all([
          listProducts("Sweatshirt"),
          listProducts("Shirt"),
          listProducts("Pant"),
        ]);

        const merged = [
          ...(sweatRes?.data || []),
          ...(shirtRes?.data || []),
          ...(pantsRes?.data || []),
        ];

        setProducts(merged);
      } catch (err) {
        console.error("Error loading products for sales manager", err);
        setProductError("Could not load products.");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  // Build enriched product list for display (base + discounted price)
  const enrichedProducts = useMemo(() => {
    const d = Math.max(0, Math.min(Number(discountPercent) || 0, 90));
    const factor = 1 - d / 100;

    return (products || []).map((p) => {
      const base = Number(
        p.basePrice ??
          (p.variants && p.variants[0] && p.variants[0].price) ??
          0
      );
      const discounted = base > 0 ? base * factor : base;

      return {
        ...p,
        _basePrice: base,
        _discountedPrice: discounted,
      };
    });
  }, [products, discountPercent]);

  const filteredProducts = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return enrichedProducts;

    return enrichedProducts.filter((p) => {
      const haystack = [
        p.name,
        p.description,
        p.category,
        p.model,
        p.serialNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [enrichedProducts, searchTerm]);

  // Selection + apply discount
  const toggleProduct = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  };

  const handleApplyDiscount = async () => {
    const d = Number(discountPercent);
    if (!d || d <= 0 || d > 90) {
      setStatusKind("error");
      setStatusMessage("Please enter a discount between 1 and 90.");
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }
    if (selectedIds.size === 0) {
      setStatusKind("error");
      setStatusMessage("Select at least one product.");
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }

    try {
      setStatusMessage(null);
      const { data } = await applyDiscount(
        d,
        Array.from(selectedIds),
        notifyWishlist
      );

      setStatusKind("success");
      const message = notifyWishlist
        ? `Discount applied to ${data.updatedProducts} products. ${data.notifiedUsers} wishlist users notified.`
        : `Discount applied to ${data.updatedProducts} products.`;
      setStatusMessage(message);
      setTimeout(() => setStatusMessage(null), 5000);

      // Clear selection and reload products to show updated prices
      setSelectedIds(new Set());
      const [sweatRes, shirtRes, pantsRes] = await Promise.all([
        listProducts("Sweatshirt"),
        listProducts("Shirt"),
        listProducts("Pant"),
      ]);
      const merged = [
        ...(sweatRes?.data || []),
        ...(shirtRes?.data || []),
        ...(pantsRes?.data || []),
      ];
      setProducts(merged);
    } catch (err) {
      console.error("Error applying discount", err);
      setStatusKind("error");
      setStatusMessage(
        err.response?.data?.message || "Failed to apply discount. Please try again."
      );
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h1 className="pm-tab-title">Discount Campaign</h1>
      </div>

      <p style={{ marginBottom: 24, color: "#666", fontSize: 14 }}>
        Choose the items and a percentage discount. New prices are previewed before applying.
      </p>

      {/* Status message */}
      {statusMessage && (
        <div
          className={`pm-alert ${statusKind === "error" ? "pm-alert-error" : "pm-alert-success"}`}
          style={{ marginBottom: 16 }}
        >
          {statusMessage}
        </div>
      )}

      {/* Controls */}
      <div className="pm-form">
        <div className="pm-form-field">
          <label className="pm-label" htmlFor="discount-percent">
            Discount rate (%)
          </label>
          <input
            id="discount-percent"
            className="pm-input"
            type="number"
            min={0}
            max={90}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
          />
          <span style={{ fontSize: 12, color: "#7a7a7a" }}>
            Recommended: between 5% and 50%.
          </span>
        </div>

        <div className="pm-form-field">
          <label className="pm-label" htmlFor="sales-search">
            Filter products
          </label>
          <input
            id="sales-search"
            className="pm-input"
            type="text"
            placeholder="Search by name, description, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div
          className="pm-tab-actions"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "#5a5a5a",
            }}
          >
            <input
              type="checkbox"
              checked={notifyWishlist}
              onChange={(e) => setNotifyWishlist(e.target.checked)}
            />
            Notify users who have these products in their wishlist
          </label>

          <button
            type="button"
            className="pm-btn pm-btn-primary"
            onClick={handleApplyDiscount}
          >
            Apply discount to selected
          </button>
        </div>
      </div>

      {/* Product list */}
      {loadingProducts && <p className="pm-empty">Loading products…</p>}
      {!loadingProducts && productError && (
        <div className="pm-alert pm-alert-error">{productError}</div>
      )}

      {!loadingProducts && !productError && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 24,
              marginBottom: 12,
              fontSize: 13,
              color: "#555",
            }}
          >
            <span>
              Showing <strong>{filteredProducts.length}</strong> products
            </span>
            <button
              type="button"
              className="pm-btn"
              style={{
                padding: "4px 10px",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
              onClick={handleSelectAll}
            >
              {selectedIds.size === filteredProducts.length &&
              filteredProducts.length > 0
                ? "Clear selection"
                : "Select all in view"}
            </button>
          </div>

          <table className="pm-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>Select</th>
                <th>Product Name</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Base Price</th>
                {discountPercent > 0 && (
                  <th style={{ textAlign: "right" }}>Discounted Price</th>
                )}
                {discountPercent > 0 && (
                  <th style={{ textAlign: "right" }}>Discount</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={discountPercent > 0 ? 6 : 4} className="pm-empty">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const checked = selectedIds.has(p.id);
                  return (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                        />
                      </td>
                      <td>
                        <div>
                          <strong>{p.name}</strong>
                          {p.description && (
                            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                              {p.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{p.category || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        ${p._basePrice.toFixed(2)}
                      </td>
                      {discountPercent > 0 && (
                        <td style={{ textAlign: "right", color: "#3d211c", fontWeight: 600 }}>
                          ${p._discountedPrice.toFixed(2)}
                        </td>
                      )}
                      {discountPercent > 0 && (
                        <td style={{ textAlign: "right" }}>
                          {Math.max(
                            0,
                            Math.min(Number(discountPercent) || 0, 90)
                          )}
                          %
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

