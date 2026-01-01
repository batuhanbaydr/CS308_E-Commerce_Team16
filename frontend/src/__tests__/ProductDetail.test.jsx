// src/__tests__/ProductDetail.test.jsx

// Goal: displays product name and price when product detail page loads
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetail from "../pages/ProductDetail.jsx";

vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: { id: "user-1", name: "Test User" },
  }),
  fetchProduct: vi.fn().mockResolvedValue({
    data: {
      id: "product-1",
      name: "Premium Sweatshirt",
      description: "A comfortable premium sweatshirt",
      basePrice: 149.99,
      category: "Sweatshirt",
      variants: [
        {
          sku: "SW-1-BLACK-M",
          color: "Black",
          size: "M",
          price: 149.99,
          stock: 10,
        },
      ],
    },
  }),
  listProducts: vi.fn().mockResolvedValue({
    data: [],
  }),
  getReviewsForProduct: vi.fn().mockResolvedValue({
    data: [],
  }),
  logoutRequest: vi.fn(),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("ProductDetail page", () => {
  it("displays product name and price when product detail page loads", async () => {
    render(
      <MemoryRouter initialEntries={["/product/product-1"]}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for product name to appear (it's in an h1 with class product-title)
    const productName = await screen.findByRole("heading", { 
      name: /Premium Sweatshirt/i 
    }, { timeout: 5000 });
    expect(productName).toBeInTheDocument();

    // Check for price display - formatted price should be in a paragraph with class product-price
    // Price format: $149.99 or similar (formatted with Intl.NumberFormat)
    const priceText = await screen.findByText(/149/i, {}, { timeout: 5000 });
    expect(priceText).toBeInTheDocument();
  });
});

