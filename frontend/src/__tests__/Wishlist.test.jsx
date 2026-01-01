import React from "react";
// src/__tests__/Wishlist.test.jsx

// Goal: removes a product from wishlist when remove button is clicked
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Wishlist from "../pages/Wishlist.jsx";

// ---- mocks ----
const mockGetWishlist = vi.fn();
const mockRemoveWishlistItem = vi.fn();
const mockClearWishlist = vi.fn();
const mockMeRequest = vi.fn();

vi.mock("../lib/api", () => ({
  getWishlist: (...args) => mockGetWishlist(...args),
  removeWishlistItem: (...args) => mockRemoveWishlistItem(...args),
  clearWishlist: (...args) => mockClearWishlist(...args),
  meRequest: (...args) => mockMeRequest(...args),
  logoutRequest: vi.fn(),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Wishlist page", () => {
  beforeEach(() => {
    mockGetWishlist.mockReset();
    mockRemoveWishlistItem.mockReset();
    mockClearWishlist.mockReset();
    mockMeRequest.mockReset();
  });

  it("removes an item from wishlist when heart button is clicked", async () => {
    const user = userEvent.setup();

    // user is logged in
    mockMeRequest.mockResolvedValue({
      data: { id: "u1", name: "Test User", role: "CUSTOMER" },
    });

    // initial wishlist with one product
    mockGetWishlist.mockResolvedValue({
      data: {
        productIds: ["p1"],
        count: 1,
        products: [
          {
            id: "p1",
            name: "Test Shirt",
            basePrice: "30.00",
            mainImageUrl: "",
            imageUrls: [],
            variants: [],
          },
        ],
      },
    });

    mockRemoveWishlistItem.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Wishlist />
      </MemoryRouter>
    );

    // item should appear
    expect(await screen.findByText("Test Shirt")).toBeInTheDocument();
    expect(screen.getByText("1 item(s)")).toBeInTheDocument();

    // click ♥ remove button
    const removeBtn = screen.getByRole("button", {
      name: /remove from wishlist/i,
    });

    await user.click(removeBtn);

    // API should be called
    expect(mockRemoveWishlistItem).toHaveBeenCalledWith("p1");

    // optimistic UI update → item disappears
    await waitFor(() => {
      expect(screen.queryByText("Test Shirt")).not.toBeInTheDocument();
    });

    // count updates
    expect(screen.getByText("0 item(s)")).toBeInTheDocument();
  });
});
