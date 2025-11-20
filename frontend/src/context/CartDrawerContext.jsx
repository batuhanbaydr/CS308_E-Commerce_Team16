// src/context/CartDrawerContext.jsx
import React, { createContext, useContext, useState } from "react";
import Cart from "../pages/cart.jsx";

const CartDrawerContext = createContext(null);

export function CartDrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  return (
    <CartDrawerContext.Provider value={{ openCart, closeCart }}>
      {children}
      {/* 👇 IMPORTANT: pass onClose so Cart can actually close itself */}
      {isOpen && <Cart onClose={closeCart} />}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) {
    throw new Error("useCartDrawer must be used within a CartDrawerProvider");
  }
  return ctx;
}
