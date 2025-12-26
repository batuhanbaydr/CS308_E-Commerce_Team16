import React, { useEffect, useMemo, useState } from "react";
import { pmListCategories, pmCreateCategory, pmDeleteCategory } from "../../../../lib/api";

function getId(c) {
  return c?.id ?? c?._id ?? c?.categoryId ?? "";
}

export default function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  const [deletingId, setDeletingId] = useState("");

  async function load() {
    setLoading(true);
    setErrMsg("");
    try {
      const res = await pmListCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setErrMsg(
        e?.response?.data?.message ||
          `Failed to load categories (status ${e?.response?.status || "?"})`
      );
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  }, [categories]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreateErr("");

    const trimmed = String(name || "").trim();
    if (!trimmed) {
      setCreateErr("Category name is required.");
      return;
    }

    setCreating(true);
    try {
      const res = await pmCreateCategory(trimmed);
      const created = res?.data;

      // backend returns saved CategoryEntity
      if (created) setCategories((prev) => [created, ...prev]);
      else await load();

      setName("");
    } catch (e2) {
      setCreateErr(
        e2?.response?.data?.message ||
          `Failed to create category (status ${e2?.response?.status || "?"})`
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(c) {
    const id = getId(c);
    const catName = c?.name || id;

    const ok = window.confirm(`Delete category "${catName}"?`);
    if (!ok) return;

    setDeletingId(id);
    try {
      await pmDeleteCategory(id);
      setCategories((prev) => prev.filter((x) => getId(x) !== id));
    } catch (e) {
      alert(
        e?.response?.data?.message ||
          `Failed to delete category (status ${e?.response?.status || "?"})`
      );
    } finally {
      setDeletingId("");
    }
  }

  if (loading) return <div>Loading categories…</div>;
  if (errMsg) return <div>⚠️ {errMsg}</div>;

  return (
    <div className="pm-tab">
      <div className="pm-tab-header">
        <h2 className="pm-tab-title">Categories</h2>

        <div className="pm-tab-actions">
          <button type="button" className="pm-btn pm-btn-secondary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <form className="pm-card pm-form" onSubmit={handleCreate}>
        <div className="pm-form-field">
          <label className="pm-label">Add Category</label>
          <input
            className="pm-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Shirt"'
          />
        </div>

        {createErr && <div className="pm-alert pm-alert-error">⚠️ {createErr}</div>}

        <button type="submit" className="pm-btn pm-btn-primary" disabled={creating}>
          {creating ? "Adding…" : "Add"}
        </button>
      </form>

      {!sorted.length ? (
        <div className="pm-empty">No categories found.</div>
      ) : (
        <table className="pm-table">
          <thead>
            <tr>
              <th align="left">ID</th>
              <th align="left">Name</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const id = getId(c);
              return (
                <tr key={id}>
                  <td className="pm-td-mono">{id}</td>
                  <td>{c.name}</td>
                  <td>
                    <button
                      type="button"
                      className="pm-btn pm-btn-danger"
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === id}
                    >
                      {deletingId === id ? "Deleting…" : "Delete"}
                    </button>
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
