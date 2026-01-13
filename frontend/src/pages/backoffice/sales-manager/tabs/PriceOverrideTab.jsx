// frontend/src/pages/backoffice/sales-manager/tabs/PriceOverrideTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listProducts, pmUpdateProduct } from "../../../../lib/api";

export default function PriceOverrideTab() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [editedPrices, setEditedPrices] = useState(() => ({})); // { [id]: "123.45" }

  const [statusMessage, setStatusMessage] = useState(null);
  const [statusKind, setStatusKind] = useState("success"); // "success" | "error"
  const [saving, setSaving] = useState(false);

  // Load products (same pattern as DiscountsTab)
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
        console.error("Error loading products for price override", err);
        setProductError("Could not load products.");
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  // Enrich products with a numeric base price for display
  const enrichedProducts = useMemo(() => {
    return (products || []).map((p) => {
      const base = Number(
        p.basePrice ??
          (p.variants && p.variants[0] && p.variants[0].price) ??
          0
      );

      return {
        ...p,
        _basePrice: base,
      };
    });
  }, [products]);

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

  const handlePriceChange = (id, value) => {
    setEditedPrices((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const resetRowPrice = (id) => {
    setEditedPrices((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSavePrices = async () => {
    if (saving) return;

    // Build list of products that actually changed
    const updates = [];
    for (const p of filteredProducts) {
      const raw = editedPrices[p.id];
      if (raw == null || raw === "") continue;

      const newPrice = Number(raw);
      if (!Number.isFinite(newPrice) || newPrice < 0) {
        setStatusKind("error");
        setStatusMessage(
          `Invalid price "${raw}" for product "${p.name}". Please enter a non-negative number.`
        );
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }

      // Skip if no real change
      if (Math.abs(newPrice - p._basePrice) < 0.0001) continue;

      updates.push({ product: p, newPrice });
    }

    if (updates.length === 0) {
      setStatusKind("error");
      setStatusMessage("There are no price changes to save.");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);

      // Update all in parallel
      await Promise.all(
        updates.map(({ product, newPrice }) =>
          // If backend needs full object, adjust payload here.
          pmUpdateProduct(product.id, { basePrice: newPrice })
        )
      );

      setStatusKind("success");
      setStatusMessage(`Updated prices for ${updates.length} product(s).`);
      setTimeout(() => setStatusMessage(null), 4000);

      // Reload products to reflect new prices from backend
      setLoadingProducts(true);
      setProductError("");

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

      // Clear edited state
      setEditedPrices({});
    } catch (err) {
      console.error("Error updating prices", err);
      setStatusKind("error");
      setStatusMessage(
        err?.response?.data?.message ||
          "Failed to update prices. Please try again."
      );
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSaving(false);
      setLoadingProducts(false);
    }
  };

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h1 className="pm-tab-title">Manual Price Overrides</h1>
      </div>

      <p style={{ marginBottom: 24, color: "#666", fontSize: 14 }}>
        Search for products and set their base price directly. Changes are
        applied immediately when you save.
      </p>

      {/* Status message */}
      {statusMessage && (
        <div
          className={`pm-alert ${
            statusKind === "error" ? "pm-alert-error" : "pm-alert-success"
          }`}
          style={{ marginBottom: 16 }}
        >
          {statusMessage}
        </div>
      )}

      {/* Controls */}
      <div className="pm-form">
        <div className="pm-form-field">
          <label className="pm-label" htmlFor="price-search">
            Filter products
          </label>
          <input
            id="price-search"
            className="pm-input"
            type="text"
            placeholder="Search by name, description, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div
          className="pm-tab-actions"
          style={{ justifyContent: "flex-end", alignItems: "center" }}
        >
          <button
            type="button"
            className="pm-btn pm-btn-primary"
            onClick={handleSavePrices}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save price changes"}
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
          </div>

          <table className="pm-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th style={{ textAlign: "right" }}>Current Base Price</th>
                <th style={{ textAlign: "right", width: "180px" }}>
                  New Base Price
                </th>
                <th style={{ width: "80px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="pm-empty">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const current = p._basePrice || 0;
                  const edited = editedPrices[p.id];
                  const hasChange =
                    edited != null &&
                    edited !== "" &&
                    Number(edited) !== current;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div>
                          <strong>{p.name}</strong>
                          {p.description && (
                            <div
                              style={{
                                fontSize: 12,
                                color: "#666",
                                marginTop: 4,
                              }}
                            >
                              {p.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{p.category || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        ${current.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="pm-input"
                          style={{ textAlign: "right" }}
                          value={edited ?? ""}
                          placeholder={current.toFixed(2)}
                          onChange={(e) =>
                            handlePriceChange(p.id, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        {edited && (
                          <button
                            type="button"
                            className="pm-btn"
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                            }}
                            onClick={() => resetRowPrice(p.id)}
                          >
                            Reset
                          </button>
                        )}
                        {hasChange && (
                          <span
                            style={{
                              display: "inline-block",
                              marginLeft: 4,
                              fontSize: 11,
                              color: "#3d211c",
                              fontWeight: 600,
                            }}
                          >
                            Changed
                          </span>
                        )}
                      </td>
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