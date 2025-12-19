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
import AdminHome from "./pages/admin/AdminHome";
import SalesManager from "./pages/admin/SalesManager";

import { CartDrawerProvider } from "./context/CartDrawerContext.jsx";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <CartDrawerProvider>
        <Routes>
          {/* Start on Home */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />

          {/* Public auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/wishlist" element={<Wishlist />} />

          {/* Public browsing */}
          <Route path="/category/sweatshirts" element={<Sweatshirts />} />
          <Route path="/category/shirts" element={<Shirts />} />
          <Route path="/category/pants" element={<Pants />} />
          <Route
            path="/shop-the-look"
            element={<div>TODO: Shop The Look</div>}
          />
          <Route path="/search" element={<Search />} />

          <Route path="/product/mock" element={<ProductDetailMock />} />
          <Route path="/product/:productId" element={<ProductDetail />} />

          {/* Private pages */}
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
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

          {/* Admin home (for SALES_MANAGER / PRODUCT_MANAGER / SUPPORT_AGENT via menu) */}
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminHome />
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminHome />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/sales"
            element={
              <RequireAuth>
                <SalesManager />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </CartDrawerProvider>
    </BrowserRouter>
  );
}