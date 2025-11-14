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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Start on Home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />

        {/* Public auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Public browsing */}
        <Route path="/category/sweatshirts" element={<Sweatshirts />} />
        <Route path="/category/shirts" element={<Shirts />} />
        <Route path="/category/pants" element={<Pants />} />
        <Route path="/shop-the-look" element={<div>TODO: Shop The Look</div>} />
        <Route path="/search" element={<div>TODO: Search</div>} />
        <Route path="/cart" element={<div>TODO: Cart (guest ok)</div>} />

        {/* Private pages */}
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        {/* You can also protect /checkout similarly */}
        {/* <Route path="/checkout" element={<RequireAuth><Checkout/></RequireAuth>} /> */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
