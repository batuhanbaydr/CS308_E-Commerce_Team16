// src/pages/backoffice/product-manager/tabs/ProductsTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmListProducts, pmCreateProduct } from "../../../../lib/api";

function getPriceNumber(p) {
  const raw = p?.basePrice ?? p?.price ?? p?.unitPrice ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function getActiveLabel(p) {
  if (typeof p?.active === "boolean") return p.active ? "Yes" : "No";
  if (p?.status) {
    const s = String(p.status).toUpperCase();
    if (s === "ACTIVE") return "Yes";
    if (s === "INACTIVE" || s === "ARCHIVED") return "No";
  }
  if (typeof p?.visible === "boolean") return p.visible ? "Yes" : "No";
  return "—";
}

function splitCsvToArray(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // add form
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  // Based on backend fields you showed
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category: "",
    basePrice: "", // keep as string; backend screenshot shows "35.00"
    mainImageUrl: "",
    imageUrlsCsv: "", // UI helper, will convert -> imageUrls[]
    fabric: "",
    madeIn: "",
    warrantyStatus: "",
    distributorInfo: "",
    variantsJson: `[
  { "sku": "SKU-RED-S", "color": "red", "size": "S", "stock": 10 },
  { "sku": "SKU-RED-M", "color": "red", "size": "M", "stock": 10 }
]`, // UI helper, will parse -> variants[]
  });

  const canSubmit = useMemo(() => {
    const nameOk = String(newProduct.name || "").trim().length > 0;
    const catOk = String(newProduct.category || "").trim().length > 0;
    const priceN = Number(newProduct.basePrice);
    const priceOk = Number.isFinite(priceN) && priceN >= 0;
    const mainImgOk = String(newProduct.mainImageUrl || "").trim().length > 0;
    return nameOk && catOk && priceOk && mainImgOk && !saving;
  }, [newProduct, saving]);

  async function loadProducts() {
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
    let mounted = true;

    (async () => {
      try {
        setErrMsg("");
        const res = await pmListProducts();
        if (!mounted) return;
        setProducts(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!mounted) return;
        setErrMsg(
          e?.response?.data?.message ||
            `Failed to load products (status ${e?.response?.status || "?"})`
        );
        setProducts([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const onChange = (key) => (e) => {
    const value = e?.target?.value;
    setNewProduct((prev) => ({ ...prev, [key]: value }));
  };

  const submitNewProduct = async (e) => {
    e.preventDefault();
    setSaveErr("");
    setSaveOk("");

    if (!canSubmit) return;

    // Parse arrays from UI helper fields
    let variants = [];
    try {
      const parsed = JSON.parse(newProduct.variantsJson || "[]");
      if (!Array.isArray(parsed)) {
        throw new Error("variants must be a JSON array");
      }
      variants = parsed;
    } catch (err) {
      setSaveErr(`Variants JSON invalid: ${err.message}`);
      return;
    }

    const imageUrls = splitCsvToArray(newProduct.imageUrlsCsv);

    // Build payload matching ProductEntity fields
    const payload = {
      name: String(newProduct.name).trim(),
      description: String(newProduct.description || "").trim(),
      category: String(newProduct.category).trim(),
      basePrice: String(newProduct.basePrice).trim(), // matches "35.00" style
      mainImageUrl: String(newProduct.mainImageUrl).trim(),
      imageUrls,
      variants,
      fabric: String(newProduct.fabric || "").trim(),
      madeIn: String(newProduct.madeIn || "").trim(),
      warrantyStatus: String(newProduct.warrantyStatus || "").trim(),
      distributorInfo: String(newProduct.distributorInfo || "").trim(),
    };

    setSaving(true);
    try {
      const res = await pmCreateProduct(payload);
      const created = res?.data;

      if (created) {
        setProducts((prev) => [created, ...prev]);
      } else {
        await loadProducts();
      }

      setSaveOk("Product created.");
      setShowAdd(false);

      // reset form
      setNewProduct((prev) => ({
        ...prev,
        name: "",
        description: "",
        category: "",
        basePrice: "",
        mainImageUrl: "",
        imageUrlsCsv: "",
        fabric: "",
        madeIn: "",
        warrantyStatus: "",
        distributorInfo: "",
      }));
    } catch (e2) {
      setSaveErr(
        e2?.response?.data?.message ||
          `Failed to create product (status ${e2?.response?.status || "?"})`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading products…</div>;
  if (errMsg) return <div>⚠️ {errMsg}</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <h2 style={{ margin: 0 }}>Products</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => loadProducts()}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setSaveErr("");
              setSaveOk("");
              setShowAdd((s) => !s);
            }}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {showAdd ? "Close" : "Add Product"}
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={submitNewProduct}
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #e5e5e5",
            borderRadius: 6,
            background: "#fafafa",
            display: "grid",
            gap: 10,
            maxWidth: 820,
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13 }}>Name *</label>
            <input
              value={newProduct.name}
              onChange={onChange("name")}
              placeholder='e.g. "COTTON MODAL RUCHED T-SHIRT"'
              style={{ padding: 8, border: "1px solid #ccc" }}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13 }}>Description</label>
            <textarea
              value={newProduct.description}
              onChange={onChange("description")}
              placeholder="Short product description..."
              rows={3}
              style={{ padding: 8, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13 }}>Category *</label>
              <input
                value={newProduct.category}
                onChange={onChange("category")}
                placeholder='e.g. "Shirt"'
                style={{ padding: 8, border: "1px solid #ccc" }}
                required
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13 }}>Base Price *</label>
              <input
                value={newProduct.basePrice}
                onChange={onChange("basePrice")}
                placeholder='e.g. "35.00"'
                inputMode="decimal"
                style={{ padding: 8, border: "1px solid #ccc" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13 }}>Main Image URL *</label>
            <input
              value={newProduct.mainImageUrl}
              onChange={onChange("mainImageUrl")}
              placeholder='/products/cotton-modal-ruched-tshirt-1.jpg'
              style={{ padding: 8, border: "1px solid #ccc" }}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13 }}>
              Image URLs (comma-separated)
            </label>
            <input
              value={newProduct.imageUrlsCsv}
              onChange={onChange("imageUrlsCsv")}
              placeholder="/products/a.jpg, /products/b.jpg, /products/c.jpg"
              style={{ padding: 8, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13 }}>Fabric</label>
              <input
                value={newProduct.fabric}
                onChange={onChange("fabric")}
                placeholder='e.g. "50% cotton, 45% modal, 5% elastane"'
                style={{ padding: 8, border: "1px solid #ccc" }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13 }}>Made In</label>
              <input
                value={newProduct.madeIn}
                onChange={onChange("madeIn")}
                placeholder='e.g. "India"'
                style={{ padding: 8, border: "1px solid #ccc" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13 }}>Warranty Status</label>
              <input
                value={newProduct.warrantyStatus}
                onChange={onChange("warrantyStatus")}
                placeholder='e.g. "24 months"'
                style={{ padding: 8, border: "1px solid #ccc" }}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13 }}>Distributor Info</label>
              <input
                value={newProduct.distributorInfo}
                onChange={onChange("distributorInfo")}
                placeholder='e.g. "TIDL Online Shopping"'
                style={{ padding: 8, border: "1px solid #ccc" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13 }}>
              Variants (JSON array) *
            </label>
            <textarea
              value={newProduct.variantsJson}
              onChange={onChange("variantsJson")}
              rows={10}
              style={{
                padding: 8,
                border: "1px solid #ccc",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
              }}
            />
            <div style={{ fontSize: 12, color: "#666" }}>
              Backend’in <code>PATCH /{`{id}`}/variants/{`{sku}`}/stock</code> endpoint’i olduğuna göre
              her variant içinde genelde <code>sku</code> alanı beklenir.
            </div>
          </div>

          {saveErr && <div style={{ color: "#b91c1c" }}>⚠️ {saveErr}</div>}
          {saveOk && <div style={{ color: "#065f46" }}>{saveOk}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: "10px 12px",
                border: "1px solid #111",
                background: canSubmit ? "#111" : "#999",
                color: "#fff",
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {!products.length ? (
        <div style={{ marginTop: 12 }}>No products found.</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 16,
          }}
        >
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Name</th>
              <th align="left">Price</th>
              <th align="left">Active</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const price = getPriceNumber(p);
              return (
                <tr key={p.id || p._id}>
                  <td>{p.id || p._id}</td>
                  <td>{p.name}</td>
                  <td>${price.toFixed(2)}</td>
                  <td>{getActiveLabel(p)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
