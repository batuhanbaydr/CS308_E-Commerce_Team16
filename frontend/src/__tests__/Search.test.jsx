// src/__tests__/Search.test.jsx


//shows '1 result found for "pants"' and the product card when searching for pants
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Search from "../pages/Search.jsx";

// ---- Mocks ----

// Mock API functions used in Search.jsx
vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: { id: "user-1", name: "Test User" },
  }),
  logoutRequest: vi.fn(),
  listProducts: vi.fn().mockResolvedValue({
    data: [
      {
        id: "1",
        name: "Soft Pants",
        description: "Cozy everyday pants",
        category: "pants",
        fabric: "cotton",
        madeIn: "Turkey",
        basePrice: 99,
        purchaseCount: 10,
        variants: [
          {
            color: "Brown",
            size: "S",
            price: 99,
            stock: 5,
            images: ["test-image.jpg"],
          },
        ],
      },
    ],
  }),
}));

// Mock cart drawer context so the header doesn't crash
vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Search page", () => {
  it("shows '1 result found for “pants”' and the product card when searching for pants", async () => {
    // Open the Search page with ?q=pants in the URL
    render(
      <MemoryRouter initialEntries={["/search?q=pants"]}>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </MemoryRouter>
    );

    // ---- Check the summary text ----
    // It will look like:  '1 result found for “pants”'
    const summary = await screen.findByText((content) => {
      const c = content.toLowerCase();
      return c.includes("1 result") && c.includes("found for") && c.includes("pants");
    });

    expect(summary).toBeInTheDocument();

    // ---- Check that the matching product card is rendered ----
    expect(await screen.findByText(/Soft Pants/i)).toBeInTheDocument();
  });
});
