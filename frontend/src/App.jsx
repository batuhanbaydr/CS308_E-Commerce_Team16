// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import RequireAuth from "./auth/RequireAuth";

import Sweatshirts from "./pages/category/sweatshirts";
import Shirts from "./pages/category/shirts";
import Pants from "./pages/category/pants";

import ProductDetailMock from "./pages/ProductDetailMock";
import ProductDetail from "./pages/ProductDetail";
import Search from "./pages/Search.jsx";
import Checkout from "./pages/Checkout.jsx";
import Invoice from "./pages/Invoice.jsx";
import Wishlist from "./pages/Wishlist.jsx";

import ProductManagerLayout from "./pages/backoffice/product-manager/ProductManagerLayout";

import AdminHome from "./pages/admin/AdminHome";
import SalesManager from "./pages/admin/SalesManager";

import { CartDrawerProvider } from "./context/CartDrawerContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

import "./index.css";

/** Simple placeholder while we build other backoffice areas */
function Placeholder({ title }) {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      <p style={{ marginTop: 12, color: "#666" }}>
        This is a placeholder. Next we’ll build the real backoffice UI here.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CartDrawerProvider>
          <Routes>
            {/* Default */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Public */}
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Browsing */}
            <Route path="/category/sweatshirts" element={<Sweatshirts />} />
            <Route path="/category/shirts" element={<Shirts />} />
            <Route path="/category/pants" element={<Pants />} />
            <Route path="/shop-the-look" element={<div>TODO: Shop The Look</div>} />
            <Route path="/search" element={<Search />} />
            <Route path="/product/mock" element={<ProductDetailMock />} />
            <Route path="/product/:productId" element={<ProductDetail />} />

            {/* Private (customer) pages */}
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route
              path="/wishlist"
              element={
                <RequireAuth>
                  <Wishlist />
                </RequireAuth>
              }
            />
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <Checkout />
                </RequireAuth>
              }
            />
            <Route
              path="/invoice/:orderId"
              element={
                <RequireAuth>
                  <Invoice />
                </RequireAuth>
              }
            />

            {/* ============================
                Backoffice routes
                (MATCH Login.jsx redirects)
                ============================ */}

            {/* Product Manager backoffice */}
            <Route
              path="/backoffice/product-manager/*"
              element={
                <RequireAuth allowedRoles={["PRODUCT_MANAGER"]}>
                  <ProductManagerLayout />
                </RequireAuth>
              }
            />

            {/* Sales Manager backoffice */}
            <Route
              path="/backoffice/sales-manager/*"
              element={
                <RequireAuth allowedRoles={["SALES_MANAGER"]}>
                  <SalesManager />
                </RequireAuth>
              }
            />

            {/* Support Agent backoffice (placeholder for now) */}
            <Route
              path="/backoffice/support-manager/*"
              element={
                <RequireAuth allowedRoles={["SUPPORT_AGENT"]}>
                  <Placeholder title="Support Agent Backoffice" />
                </RequireAuth>
              }
            />

            {/* Legacy admin routes (keep so old links don't break) */}
            <Route
              path="/admin"
              element={
                <RequireAuth
                  allowedRoles={["PRODUCT_MANAGER", "SALES_MANAGER", "SUPPORT_AGENT"]}
                >
                  <AdminHome />
                </RequireAuth>
              }
            />

            <Route
              path="/admin/sales"
              element={
                <RequireAuth allowedRoles={["SALES_MANAGER"]}>
                  <SalesManager />
                </RequireAuth>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </CartDrawerProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
