// src/pages/backoffice/product-manager/tabs/StockTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmListProducts, pmSetVariantStock } from "../../../../lib/api";

function getId(p) {
  const raw = p?.id ?? p?._id ?? "";
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.oid === "string") return raw.oid;
    if (typeof raw.toString === "function") return raw.toString();
  }
  return "";
}

function getVariants(p) {
  return Array.isArray(p?.variants) ? p.variants : [];
}

export default function StockTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [openId, setOpenId] = useState(""); // which product is expanded
  const [draft, setDraft] = useState({}); // key: `${productId}__${sku}` -> string
  const [savingKey, setSavingKey] = useState(""); // same key while saving
  const [actionErr, setActionErr] = useState("");

  async function load() {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await pmListProducts();
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErrMsg(
        e?.response?.data?.message ||
          `Failed to load products (status ${e?.response?.status || "?"})`
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openProduct = useMemo(() => {
    if (!openId) return null;
    return products.find((p) => getId(p) === openId) || null;
  }, [products, openId]);

  function keyFor(productId, sku) {
    return `${productId}__${sku}`;
  }

  function setDraftValue(productId, sku, val) {
    const k = keyFor(productId, sku);
    setDraft((prev) => ({ ...prev, [k]: val }));
  }

  function getDraftValue(productId, sku, fallbackNumber) {
    const k = keyFor(productId, sku);
    if (draft[k] === undefined) return String(fallbackNumber);
    return draft[k];
  }

  async function saveStock(productId, sku, currentStock) {
    setActionErr("");
    const k = keyFor(productId, sku);
    const raw = getDraftValue(productId, sku, currentStock);

    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      setActionErr("Stock must be a whole number (0 or more).");
      return;
    }

    setSavingKey(k);
    try {
      const res = await pmSetVariantStock(productId, sku, n);

      // backend returns updated product
      const updated = res?.data;
      if (updated) {
        setProducts((prev) => prev.map((p) => (getId(p) === productId ? updated : p)));
      } else {
        await load();
      }
    } catch (e) {
      setActionErr(
        e?.response?.data?.message ||
          `Failed to update stock (status ${e?.response?.status || "?"})`
      );
    } finally {
      setSavingKey("");
    }
  }

  if (loading) return <div>Loading stock…</div>;
  if (errMsg) return <div>⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Stock</h2>
        <div className="pm-tab-actions">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {actionErr && <div className="pm-alert pm-alert-error">⚠️ {actionErr}</div>}

      {!products.length ? (
        <div className="pm-empty">No products found.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">Product</th>
              <th align="left">Category</th>
              <th align="left">Variants</th>
              <th align="left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const id = getId(p);
              const vs = getVariants(p);
              const isOpen = openId === id;

              return (
                <React.Fragment key={id}>
                  {/* normal row */}
                  <tr>
                    <td>{p?.name}</td>
                    <td>{p?.category || "—"}</td>
                    <td>{vs.length}</td>
                    <td>
                      <button
                        type="button"
                        className="pm-btn pm-btn-secondary"
                        onClick={() => setOpenId((cur) => (cur === id ? "" : id))}
                      >
                        {isOpen ? "Close" : "Manage"}
                      </button>
                    </td>
                  </tr>

                  {/* expanded row RIGHT UNDER the selected product */}
                  {isOpen && (
                    <tr className="pm-expand-row">
                      <td colSpan={4}>
                        <div className="pm-card pm-expand-card">
                          <div className="pm-edit-top">
                            <div className="pm-edit-title">
                              Variants — {openProduct?.name || ""}
                            </div>
                          </div>

                          {vs.length === 0 ? (
                            <div className="pm-empty">No variants found for this product.</div>
                          ) : (
                            <table className="pm-table pm-variants-table">
                              <thead>
                                <tr>
                                  <th align="left">SKU</th>
                                  <th align="left">Color</th>
                                  <th align="left">Size</th>
                                  <th align="left">Stock</th>
                                  <th align="left">Save</th>
                                </tr>
                              </thead>

                              <tbody>
                                {vs.map((v) => {
                                  const sku = v?.sku ?? "";
                                  const stock =
                                    typeof v?.stock === "number"
                                      ? v.stock
                                      : Number(v?.stock ?? 0) || 0;

                                  const k = keyFor(id, sku);
                                  const val = getDraftValue(id, sku, stock);

                                  return (
                                    <tr key={k}>
                                      <td className="pm-td-mono">{sku || "—"}</td>
                                      <td>{v?.color || "—"}</td>
                                      <td>{v?.size || "—"}</td>
                                      <td style={{ maxWidth: 180 }}>
                                        <input
                                          className="pm-input"
                                          value={val}
                                          onChange={(e) =>
                                            setDraftValue(id, sku, e.target.value)
                                          }
                                          inputMode="numeric"
                                        />
                                      </td>
                                      <td>
                                        <button
                                          type="button"
                                          className="pm-btn pm-btn-primary"
                                          onClick={() => saveStock(id, sku, stock)}
                                          disabled={savingKey === k}
                                        >
                                          {savingKey === k ? "Saving…" : "Save"}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
