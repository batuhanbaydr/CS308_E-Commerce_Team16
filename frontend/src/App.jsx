// src/App.jsx
import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import RequireAuth from "./auth/RequireAuth";



// ✅ NEW dynamic category page
import CategoryPage from "./pages/category/CategoryPage.jsx";

import ProductDetail from "./pages/ProductDetail";
import Search from "./pages/Search.jsx";
import Checkout from "./pages/Checkout.jsx";
import Invoice from "./pages/Invoice.jsx";
import Wishlist from "./pages/Wishlist.jsx";

import ProductManagerLayout from "./pages/backoffice/product-manager/ProductManagerLayout";
import SalesManagerLayout from "./pages/backoffice/sales-manager/SalesManagerLayout";
import SupportManagerLayout from "./pages/backoffice/support-manager/SupportManagerLayout";

import SupportFab from "./components/SupportFab.jsx";
import SupportChat from "./pages/SupportChat.jsx";

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

/**
 * Inner shell that has access to `useLocation`.
 * We use this to hide SupportFab on admin/backoffice routes.
 */
function AppShell() {
  const location = useLocation();

  const isAdminRoute =
    location.pathname.startsWith("/backoffice") ||
    location.pathname.startsWith("/admin");

  return (
    <CartDrawerProvider>
      {/* Show FAB only on non-admin pages */}
      {!isAdminRoute && <SupportFab />}

      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Public */}
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Customer support chat (customer side) */}
        <Route path="/support/chat" element={<SupportChat />} />

        {/* ======================
            Browsing (Categories)
            ====================== */}

        {/*  NEW dynamic categories */}
        <Route path="/category/:slug" element={<CategoryPage />} />

       

    

        <Route path="/shop-the-look" element={<div>TODO: Shop The Look</div>} />
        <Route path="/search" element={<Search />} />
       
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
              <SalesManagerLayout />
            </RequireAuth>
          }
        />

        {/* Support Agent backoffice */}
        <Route
          path="/backoffice/support-manager/*"
          element={
            <RequireAuth allowedRoles={["SUPPORT_AGENT"]}>
              <SupportManagerLayout />
            </RequireAuth>
          }
        />

        {/* Legacy admin routes - redirect to appropriate backoffice */}
        <Route
          path="/admin"
          element={
            <RequireAuth
              allowedRoles={["PRODUCT_MANAGER", "SALES_MANAGER", "SUPPORT_AGENT"]}
            >
              <Navigate to="/backoffice/sales-manager" replace />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/sales"
          element={
            <RequireAuth allowedRoles={["SALES_MANAGER"]}>
              <Navigate to="/backoffice/sales-manager" replace />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </CartDrawerProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
