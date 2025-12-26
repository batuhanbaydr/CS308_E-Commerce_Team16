// src/pages/backoffice/product-manager/tabs/ProductsTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  pmListProducts,
  pmCreateProduct,
  pmUpdateProduct,
  pmDeleteProduct,
} from "../../../../lib/api";

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

function safeStringifyJson(val, fallback = "[]") {
  try {
    return JSON.stringify(val ?? [], null, 2);
  } catch {
    return fallback;
  }
}

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
    variantsJson: `[
  { "sku": "SKU-RED-S", "color": "red", "size": "S", "stock": 10 },
  { "sku": "SKU-RED-M", "color": "red", "size": "M", "stock": 10 }
]`,
  });

  // Edit form
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(null); // same shape as payload + helpers
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
    return nameOk && catOk && priceOk && mainImgOk && !saving;
  }, [newProduct, saving]);

  const canEdit = useMemo(() => {
    if (!editForm) return false;
    const nameOk = String(editForm.name || "").trim().length > 0;
    const catOk = String(editForm.category || "").trim().length > 0;
    const priceN = Number(editForm.basePrice);
    const priceOk =
      (typeof editForm.basePrice === "string" && editForm.basePrice.trim() !== "")
        ? Number.isFinite(priceN) && priceN >= 0
        : true; // allow string basePrice, but must be number-like if provided
    const mainImgOk = String(editForm.mainImageUrl || "").trim().length > 0;
    return nameOk && catOk && priceOk && mainImgOk && !editSaving;
  }, [editForm, editSaving]);

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
      variantsJson: safeStringifyJson(p?.variants, "[]"),
  
    });
  }

  function closeEdit() {
    setEditingId("");
    setEditForm(null);
    setEditErr("");
    setEditOk("");
  }

  async function submitCreate(e) {
    e.preventDefault();
    setSaveErr("");
    setSaveOk("");
    if (!canCreate) return;

    let variants = [];
    try {
      const parsed = JSON.parse(newProduct.variantsJson || "[]");
      if (!Array.isArray(parsed)) throw new Error("variants must be a JSON array");
      variants = parsed;
    } catch (err) {
      setSaveErr(`Variants JSON invalid: ${err.message}`);
      return;
    }

    const payload = {
      name: String(newProduct.name).trim(),
      description: String(newProduct.description || "").trim(),
      category: String(newProduct.category).trim(),
      basePrice: String(newProduct.basePrice).trim(),
      mainImageUrl: String(newProduct.mainImageUrl).trim(),
      imageUrls: splitCsvToArray(newProduct.imageUrlsCsv),
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
      if (created) setProducts((prev) => [created, ...prev]);
      else await loadProducts();

      setSaveOk("Product created.");
      setShowAdd(false);
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
  }

  async function submitEdit(e) {
    e.preventDefault();
    setEditErr("");
    setEditOk("");
    if (!canEdit || !editingId || !editForm) return;

    let variants = [];
    try {
      const parsed = JSON.parse(editForm.variantsJson || "[]");
      if (!Array.isArray(parsed)) throw new Error("variants must be a JSON array");
      variants = parsed;
    } catch (err) {
      setEditErr(`Variants JSON invalid: ${err.message}`);
      return;
    }

    const payload = {
      name: String(editForm.name).trim(),
      description: String(editForm.description || "").trim(),
      category: String(editForm.category).trim(),
      basePrice: String(editForm.basePrice ?? "").trim(),
      mainImageUrl: String(editForm.mainImageUrl).trim(),
      imageUrls: splitCsvToArray(editForm.imageUrlsCsv),
      variants,
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
      // keep edit open, or close:
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
            <input className="pm-input" value={newProduct.category} onChange={onChangeNew("category")} />
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

        <div className="pm-form-field">
          <label className="pm-label">Variants (JSON array) *</label>
          <textarea
            className="pm-textarea pm-mono"
            value={newProduct.variantsJson}
            onChange={onChangeNew("variantsJson")}
            rows={10}
          />
        </div>

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
            <input className="pm-input" value={editForm.category} onChange={onChangeEdit("category")} />
          </div>

          <div className="pm-form-field">
            <label className="pm-label">Base Price *</label>
            <input className="pm-input" value={editForm.basePrice} onChange={onChangeEdit("basePrice")} />
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

        <div className="pm-form-field">
          <label className="pm-label">Variants (JSON array) *</label>
          <textarea
            className="pm-textarea pm-mono"
            value={editForm.variantsJson}
            onChange={onChangeEdit("variantsJson")}
            rows={10}
          />
        </div>

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
