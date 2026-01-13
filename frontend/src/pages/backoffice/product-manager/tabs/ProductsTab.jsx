// src/pages/backoffice/product-manager/tabs/ProductsTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  pmListProducts,
  pmCreateProduct,
  pmUpdateProduct,
  pmDeleteProduct,
} from "../../../../lib/api";

/* -------------------- helpers -------------------- */

function getId(p) {
  return p?.id ?? p?._id ?? "";
}

function getPriceNumber(p) {
  const raw = p?.basePrice ?? p?.price ?? p?.unitPrice ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function splitCsvToArray(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function arrayToCsv(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.filter(Boolean).join(", ");
}

function safeParseJsonArray(text, fallback = []) {
  try {
    const parsed = JSON.parse(text || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toInt(val, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function makeEmptyVariant() {
  return { sku: "", color: "", size: "", stock: 0 };
}

function normalizeVariant(v) {
  return {
    sku: String(v?.sku ?? "").trim(),
    color: String(v?.color ?? "").trim(),
    size: String(v?.size ?? "").trim(),
    stock: Math.max(0, toInt(v?.stock ?? 0, 0)),
  };
}

function normalizeVariants(input) {
  if (!Array.isArray(input)) return [makeEmptyVariant()];
  const cleaned = input.map(normalizeVariant);
  return cleaned.length ? cleaned : [makeEmptyVariant()];
}

/**
 * Simple: require each variant row to have color+size+stock>=0.
 * SKU optional (some backends auto-generate); keep optional unless you want strict.
 */
function validateVariants(variants) {
  const list = normalizeVariants(variants);

  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (!v.color) return { ok: false, msg: `Variant #${i + 1}: color is required.` };
    if (!v.size) return { ok: false, msg: `Variant #${i + 1}: size is required.` };
    if (!Number.isFinite(Number(v.stock)) || v.stock < 0)
      return { ok: false, msg: `Variant #${i + 1}: stock must be >= 0.` };
  }

  // optional: prevent duplicates (same color+size)
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const key = `${list[i].color.toLowerCase()}::${list[i].size.toLowerCase()}`;
    if (seen.has(key)) {
      return {
        ok: false,
        msg: `Duplicate variant detected: "${list[i].color}" + "${list[i].size}".`,
      };
    }
    seen.add(key);
  }

  return { ok: true, msg: "" };
}

/* -------------------- Variants Editor UI -------------------- */

function VariantsEditor({
  variants,
  setVariants,
  errorText,
  title = "Variants",
  compact = false,
}) {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("[]");

  const onChangeVariant = (idx, key) => (e) => {
    const value = e.target.value;
    setVariants((prev) => {
      const next = normalizeVariants(prev).slice();
      const cur = next[idx] ?? makeEmptyVariant();

      if (key === "stock") {
        next[idx] = { ...cur, stock: Math.max(0, toInt(value, 0)) };
      } else {
        next[idx] = { ...cur, [key]: value };
      }
      return next;
    });
  };

  const addRow = () => {
    setVariants((prev) => [...normalizeVariants(prev), makeEmptyVariant()]);
  };

  const removeRow = (idx) => {
    setVariants((prev) => {
      const next = normalizeVariants(prev).filter((_, i) => i !== idx);
      return next.length ? next : [makeEmptyVariant()];
    });
  };

  const importJson = () => {
    const parsed = safeParseJsonArray(importText, null);
    if (!parsed) return; // keep silent; user will see invalid JSON by not changing
    setVariants(normalizeVariants(parsed));
    setShowImport(false);
  };

  const exportJson = useMemo(() => {
    try {
      return JSON.stringify(normalizeVariants(variants), null, 2);
    } catch {
      return "[]";
    }
  }, [variants]);

  const vList = normalizeVariants(variants);

  return (
    <div className="pm-form-field">
      <label className="pm-label">
        {title} <span style={{ opacity: 0.7 }}>(Color / Size / Stock / SKU)</span>
      </label>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" className="pm-btn pm-btn-secondary" onClick={addRow}>
          + Add Variant
        </button>

        <button
          type="button"
          className="pm-btn pm-btn-secondary"
          onClick={() => {
            setShowImport((s) => !s);
            setImportText(exportJson);
          }}
        >
          {showImport ? "Close JSON" : "Import/Export JSON"}
        </button>
      </div>

      {/* rows */}
      <div style={{ display: "grid", gap: 10 }}>
        {vList.map((v, idx) => (
          <div
            key={`var-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: compact ? "1fr 1fr" : "1.2fr 0.9fr 0.7fr 1.2fr auto",
              gap: 10,
              alignItems: "center",
              border: "1px solid #ececec",
              padding: 10,
              background: "#fff",
            }}
          >
            <div className="pm-form-field" style={{ margin: 0 }}>
              <label className="pm-label" style={{ fontSize: 11, opacity: 0.7 }}>
                Color *
              </label>
              <input
                className="pm-input"
                value={v.color}
                onChange={onChangeVariant(idx, "color")}
                placeholder="red"
              />
            </div>

            <div className="pm-form-field" style={{ margin: 0 }}>
              <label className="pm-label" style={{ fontSize: 11, opacity: 0.7 }}>
                Size *
              </label>
              <input
                className="pm-input"
                value={v.size}
                onChange={onChangeVariant(idx, "size")}
                placeholder="S"
              />
            </div>

            {!compact && (
              <div className="pm-form-field" style={{ margin: 0 }}>
                <label className="pm-label" style={{ fontSize: 11, opacity: 0.7 }}>
                  Stock *
                </label>
                <input
                  className="pm-input"
                  value={String(v.stock ?? 0)}
                  onChange={onChangeVariant(idx, "stock")}
                  inputMode="numeric"
                  placeholder="10"
                />
              </div>
            )}

            {!compact && (
              <div className="pm-form-field" style={{ margin: 0 }}>
                <label className="pm-label" style={{ fontSize: 11, opacity: 0.7 }}>
                  SKU
                </label>
                <input
                  className="pm-input"
                  value={v.sku}
                  onChange={onChangeVariant(idx, "sku")}
                  placeholder="SKU-RED-S"
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="pm-btn pm-btn-danger"
                onClick={() => removeRow(idx)}
                title="Remove this variant"
              >
                Remove
              </button>
            </div>

            {compact && (
              <>
                <div className="pm-form-field" style={{ margin: 0 }}>
                  <label className="pm-label" style={{ fontSize: 11, opacity: 0.7 }}>
                    Stock *
                  </label>
                  <input
                    className="pm-input"
                    value={String(v.stock ?? 0)}
                    onChange={onChangeVariant(idx, "stock")}
                    inputMode="numeric"
                    placeholder="10"
                  />
                </div>
                <div className="pm-form-field" style={{ margin: 0 }}>
                  <label className="pm-label" style={{ fontSize: 11, opacity: 0.7 }}>
                    SKU
                  </label>
                  <input
                    className="pm-input"
                    value={v.sku}
                    onChange={onChangeVariant(idx, "sku")}
                    placeholder="SKU-RED-S"
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* error */}
      {errorText ? (
        <div className="pm-alert pm-alert-error" style={{ marginTop: 10 }}>
          ⚠️ {errorText}
        </div>
      ) : null}

      {/* import/export */}
      {showImport && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <button type="button" className="pm-btn pm-btn-primary" onClick={importJson}>
              Apply JSON → UI
            </button>
            <button
              type="button"
              className="pm-btn pm-btn-secondary"
              onClick={() => setImportText(exportJson)}
            >
              Refresh JSON from UI
            </button>
          </div>

          <textarea
            className="pm-textarea pm-mono"
            rows={10}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            Tip: you can still paste JSON here if you want, but you don’t have to anymore.
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- main component -------------------- */

export default function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // Create form
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const [newProduct, setNewProduct] = useState({
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
  });
  const [newVariants, setNewVariants] = useState([
    { sku: "SKU-RED-S", color: "red", size: "S", stock: 10 },
    { sku: "SKU-RED-M", color: "red", size: "M", stock: 10 },
  ]);
  const [newVariantsErr, setNewVariantsErr] = useState("");

  // Edit form
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(null);
  const [editVariants, setEditVariants] = useState([makeEmptyVariant()]);
  const [editVariantsErr, setEditVariantsErr] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editOk, setEditOk] = useState("");

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

  const canCreate = useMemo(() => {
    const nameOk = String(newProduct.name || "").trim().length > 0;
    const catOk = String(newProduct.category || "").trim().length > 0;
    const priceN = Number(newProduct.basePrice);
    const priceOk = Number.isFinite(priceN) && priceN >= 0;
    const mainImgOk = String(newProduct.mainImageUrl || "").trim().length > 0;

    const vCheck = validateVariants(newVariants);
    return nameOk && catOk && priceOk && mainImgOk && vCheck.ok && !saving;
  }, [newProduct, newVariants, saving]);

  const canEdit = useMemo(() => {
    if (!editForm) return false;

    const nameOk = String(editForm.name || "").trim().length > 0;
    const catOk = String(editForm.category || "").trim().length > 0;

    const priceN = Number(editForm.basePrice);
    const priceOk =
      typeof editForm.basePrice === "string" && editForm.basePrice.trim() !== ""
        ? Number.isFinite(priceN) && priceN >= 0
        : true;

    const mainImgOk = String(editForm.mainImageUrl || "").trim().length > 0;

    const vCheck = validateVariants(editVariants);
    return nameOk && catOk && priceOk && mainImgOk && vCheck.ok && !editSaving;
  }, [editForm, editVariants, editSaving]);

  const onChangeNew = (key) => (e) => {
    setNewProduct((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const onChangeEdit = (key) => (e) => {
    setEditForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  function openEdit(p) {
    const id = getId(p);
    setEditingId(id);
    setEditErr("");
    setEditOk("");
    setEditVariantsErr("");

    const incomingVariants = normalizeVariants(p?.variants);

    setEditForm({
      name: p?.name ?? "",
      description: p?.description ?? "",
      category: p?.category ?? "",
      basePrice: String(p?.basePrice ?? ""),
      mainImageUrl: p?.mainImageUrl ?? "",
      imageUrlsCsv: arrayToCsv(p?.imageUrls),
      fabric: p?.fabric ?? "",
      madeIn: p?.madeIn ?? "",
      warrantyStatus: p?.warrantyStatus ?? "",
      distributorInfo: p?.distributorInfo ?? "",
    });

    setEditVariants(incomingVariants);
  }

  function closeEdit() {
    setEditingId("");
    setEditForm(null);
    setEditVariants([makeEmptyVariant()]);
    setEditVariantsErr("");
    setEditErr("");
    setEditOk("");
  }

  async function submitCreate(e) {
    e.preventDefault();
    setSaveErr("");
    setSaveOk("");
    setNewVariantsErr("");

    const vCheck = validateVariants(newVariants);
    if (!vCheck.ok) {
      setNewVariantsErr(vCheck.msg);
      return;
    }
    if (!canCreate) return;

    const payload = {
      name: String(newProduct.name).trim(),
      description: String(newProduct.description || "").trim(),
      category: String(newProduct.category).trim(),
      basePrice: String(newProduct.basePrice).trim(),
      mainImageUrl: String(newProduct.mainImageUrl).trim(),
      imageUrls: splitCsvToArray(newProduct.imageUrlsCsv),
      variants: normalizeVariants(newVariants),
      fabric: String(newProduct.fabric || "").trim(),
      madeIn: String(newProduct.madeIn || "").trim(),
      warrantyStatus: String(newProduct.warrantyStatus || "").trim(),
      distributorInfo: String(newProduct.distributorInfo || "").trim(),
    };

    setSaving(true);
    try {
      const res = await pmCreateProduct(payload);
      const created = res?.data;
      if (created) setProducts((prev) => [created, ...prev]);
      else await loadProducts();

      setSaveOk("Product created.");
      setShowAdd(false);

      setNewProduct({
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
      });

      setNewVariants([makeEmptyVariant()]);
    } catch (e2) {
      setSaveErr(
        e2?.response?.data?.message ||
          `Failed to create product (status ${e2?.response?.status || "?"})`
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e) {
    e.preventDefault();
    setEditErr("");
    setEditOk("");
    setEditVariantsErr("");

    if (!editingId || !editForm) return;

    const vCheck = validateVariants(editVariants);
    if (!vCheck.ok) {
      setEditVariantsErr(vCheck.msg);
      return;
    }
    if (!canEdit) return;

    const payload = {
      name: String(editForm.name).trim(),
      description: String(editForm.description || "").trim(),
      category: String(editForm.category).trim(),
      basePrice: String(editForm.basePrice ?? "").trim(),
      mainImageUrl: String(editForm.mainImageUrl).trim(),
      imageUrls: splitCsvToArray(editForm.imageUrlsCsv),
      variants: normalizeVariants(editVariants),
      fabric: String(editForm.fabric || "").trim(),
      madeIn: String(editForm.madeIn || "").trim(),
      warrantyStatus: String(editForm.warrantyStatus || "").trim(),
      distributorInfo: String(editForm.distributorInfo || "").trim(),
    };

    setEditSaving(true);
    try {
      const res = await pmUpdateProduct(editingId, payload);
      const updated = res?.data;

      if (updated) {
        setProducts((prev) =>
          prev.map((p) => (getId(p) === editingId ? updated : p))
        );
      } else {
        await loadProducts();
      }

      setEditOk("Saved.");
      closeEdit();
    } catch (e2) {
      setEditErr(
        e2?.response?.data?.message ||
          `Failed to update product (status ${e2?.response?.status || "?"})`
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(p) {
    const id = getId(p);
    const name = p?.name || id;
    const ok = window.confirm(`Delete product "${name}"?\nThis cannot be undone.`);
    if (!ok) return;

    try {
      await pmDeleteProduct(id);
      setProducts((prev) => prev.filter((x) => getId(x) !== id));
      if (editingId === id) closeEdit();
    } catch (e) {
      alert(
        e?.response?.data?.message ||
          `Failed to delete product (status ${e?.response?.status || "?"})`
      );
    }
  }

  if (loading) return <div>Loading products…</div>;
  if (errMsg) return <div>⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Products</h2>

        <div className="pm-tab-actions">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={loadProducts}>
            Refresh
          </button>

          <button
            type="button"
            className="pm-btn pm-btn-secondary"
            onClick={() => {
              setSaveErr("");
              setSaveOk("");
              setNewVariantsErr("");
              setShowAdd((s) => !s);
            }}
          >
            {showAdd ? "Close" : "Add Product"}
          </button>
        </div>
      </div>

      {/* CREATE */}
      {showAdd && (
        <form className="pm-card pm-form" onSubmit={submitCreate}>
          <div className="pm-form-field">
            <label className="pm-label">Name *</label>
            <input className="pm-input" value={newProduct.name} onChange={onChangeNew("name")} />
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Description</label>
            <textarea
              className="pm-textarea"
              value={newProduct.description}
              onChange={onChangeNew("description")}
              rows={3}
            />
          </div>

          <div className="pm-form-grid-2">
            <div className="pm-form-field">
              <label className="pm-label">Category *</label>
              <input
                className="pm-input"
                value={newProduct.category}
                onChange={onChangeNew("category")}
              />
            </div>

            <div className="pm-form-field">
              <label className="pm-label">Base Price *</label>
              <input
                className="pm-input"
                value={newProduct.basePrice}
                onChange={onChangeNew("basePrice")}
                placeholder="35.00"
              />
            </div>
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Main Image URL *</label>
            <input
              className="pm-input"
              value={newProduct.mainImageUrl}
              onChange={onChangeNew("mainImageUrl")}
              placeholder="/products/x.jpg"
            />
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Image URLs (comma-separated)</label>
            <input
              className="pm-input"
              value={newProduct.imageUrlsCsv}
              onChange={onChangeNew("imageUrlsCsv")}
              placeholder="/products/a.jpg, /products/b.jpg"
            />
          </div>

          <div className="pm-form-grid-2">
            <div className="pm-form-field">
              <label className="pm-label">Fabric</label>
              <input className="pm-input" value={newProduct.fabric} onChange={onChangeNew("fabric")} />
            </div>

            <div className="pm-form-field">
              <label className="pm-label">Made In</label>
              <input className="pm-input" value={newProduct.madeIn} onChange={onChangeNew("madeIn")} />
            </div>
          </div>

          <div className="pm-form-grid-2">
            <div className="pm-form-field">
              <label className="pm-label">Warranty Status</label>
              <input
                className="pm-input"
                value={newProduct.warrantyStatus}
                onChange={onChangeNew("warrantyStatus")}
              />
            </div>

            <div className="pm-form-field">
              <label className="pm-label">Distributor Info</label>
              <input
                className="pm-input"
                value={newProduct.distributorInfo}
                onChange={onChangeNew("distributorInfo")}
              />
            </div>
          </div>

          {/* NEW: Variants UI */}
          <VariantsEditor
            variants={newVariants}
            setVariants={setNewVariants}
            errorText={newVariantsErr}
            title="Variants *"
          />

          {saveErr && <div className="pm-alert pm-alert-error">⚠️ {saveErr}</div>}
          {saveOk && <div className="pm-alert pm-alert-success">{saveOk}</div>}

          <button type="submit" disabled={!canCreate} className="pm-btn pm-btn-primary">
            {saving ? "Saving…" : "Create"}
          </button>
        </form>
      )}

      {/* EDIT */}
      {editForm && (
        <form className="pm-card pm-form pm-form-edit" onSubmit={submitEdit}>
          <div className="pm-edit-top">
            <div className="pm-edit-title">Editing: {editingId}</div>
            <button type="button" className="pm-btn pm-btn-secondary" onClick={closeEdit}>
              Cancel
            </button>
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Name *</label>
            <input className="pm-input" value={editForm.name} onChange={onChangeEdit("name")} />
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Description</label>
            <textarea
              className="pm-textarea"
              value={editForm.description}
              onChange={onChangeEdit("description")}
              rows={3}
            />
          </div>

          <div className="pm-form-grid-2">
            <div className="pm-form-field">
              <label className="pm-label">Category *</label>
              <input
                className="pm-input"
                value={editForm.category}
                onChange={onChangeEdit("category")}
              />
            </div>

            <div className="pm-form-field">
              <label className="pm-label">Base Price *</label>
              <input
                className="pm-input"
                value={editForm.basePrice}
                onChange={onChangeEdit("basePrice")}
              />
            </div>
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Main Image URL *</label>
            <input
              className="pm-input"
              value={editForm.mainImageUrl}
              onChange={onChangeEdit("mainImageUrl")}
            />
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Image URLs (comma-separated)</label>
            <input
              className="pm-input"
              value={editForm.imageUrlsCsv}
              onChange={onChangeEdit("imageUrlsCsv")}
            />
          </div>

          <div className="pm-form-grid-2">
            <div className="pm-form-field">
              <label className="pm-label">Fabric</label>
              <input className="pm-input" value={editForm.fabric} onChange={onChangeEdit("fabric")} />
            </div>

            <div className="pm-form-field">
              <label className="pm-label">Made In</label>
              <input className="pm-input" value={editForm.madeIn} onChange={onChangeEdit("madeIn")} />
            </div>
          </div>

          <div className="pm-form-grid-2">
            <div className="pm-form-field">
              <label className="pm-label">Warranty Status</label>
              <input
                className="pm-input"
                value={editForm.warrantyStatus}
                onChange={onChangeEdit("warrantyStatus")}
              />
            </div>

            <div className="pm-form-field">
              <label className="pm-label">Distributor Info</label>
              <input
                className="pm-input"
                value={editForm.distributorInfo}
                onChange={onChangeEdit("distributorInfo")}
              />
            </div>
          </div>

          {/* NEW: Variants UI */}
          <VariantsEditor
            variants={editVariants}
            setVariants={setEditVariants}
            errorText={editVariantsErr}
            title="Variants *"
          />

          {editErr && <div className="pm-alert pm-alert-error">⚠️ {editErr}</div>}
          {editOk && <div className="pm-alert pm-alert-success">{editOk}</div>}

          <button type="submit" disabled={!canEdit} className="pm-btn pm-btn-primary">
            {editSaving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      )}

      {/* TABLE */}
      {!products.length ? (
        <div className="pm-empty">No products found.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Name</th>
              <th align="left">Price</th>
              <th align="left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => {
              const id = getId(p);
              const price = getPriceNumber(p);
              return (
                <tr key={id}>
                  <td className="pm-td-mono">{id}</td>
                  <td>{p.name}</td>
                  <td>${price.toFixed(2)}</td>
                  <td>
                    <div className="pm-row-actions">
                      <button type="button" className="pm-btn pm-btn-secondary" onClick={() => openEdit(p)}>
                        Edit
                      </button>
                      <button type="button" className="pm-btn pm-btn-danger" onClick={() => handleDelete(p)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
