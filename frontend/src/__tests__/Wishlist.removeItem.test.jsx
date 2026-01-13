// src/__tests__/Wishlist.removeItem.test.jsx

// Goal: Verifies that the wishlist page loads items from the API, renders them,
// and that clicking the “Remove from wishlist” button for a product calls the
// remove API and removes it from the UI.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Wishlist from "../pages/Wishlist.jsx";

const mockGetWishlist = vi.fn();
const mockRemoveWishlistItem = vi.fn();

// (Optional) AuthContext mock – Wishlist doesn't actually use it, but harmless:
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      emailAddress: "test@example.com",
      name: "Test User",
    },
  }),
}));

// Cart drawer is used in the layout, mock it so we don't need the real provider
vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({
    openCart: vi.fn(),
    closeCart: vi.fn(),
  }),
}));

// ✅ lib/api mock: names MUST match what's imported in Wishlist.jsx
vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: {
      id: "user-1",
      emailAddress: "test@example.com",
      name: "Test User",
    },
  }),
  getWishlist: (...args) => mockGetWishlist(...args),
  removeWishlistItem: (...args) => mockRemoveWishlistItem(...args),
  clearWishlist: vi.fn().mockResolvedValue({}),
  logoutRequest: vi.fn(),
}));

describe("Wishlist – Remove item", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetWishlist.mockResolvedValue({
      data: {
        productIds: ["prod-coat", "prod-jeans"],
        count: 2,
        products: [
          {
            id: "prod-coat",
            name: "Coat",
            price: 0,
            mainImageUrl: null,
          },
          {
            id: "prod-jeans",
            name: "Jeans",
            price: 0,
            mainImageUrl: null,
          },
        ],
      },
    });

    mockRemoveWishlistItem.mockResolvedValue({
      data: {},
    });
  });

  it("calls API and removes product from the list", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Wishlist />
      </MemoryRouter>
    );

    // initial load
    await waitFor(() => {
      expect(mockGetWishlist).toHaveBeenCalled();
    });

    // Both products visible
    await screen.findByText(/coat/i);
    await screen.findByText(/jeans/i);

    // There are 2 "Remove from wishlist" buttons (♥) – first one is for Coat
    const removeButtons = await screen.findAllByRole("button", {
      name: /remove from wishlist/i,
    });
    expect(removeButtons.length).toBe(2);

    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockRemoveWishlistItem).toHaveBeenCalledWith("prod-coat");
    });

    // After removal, Coat should not be visible anymore, Jeans should remain
    await waitFor(() => {
      expect(screen.queryByText(/coat/i)).not.toBeInTheDocument();
      expect(screen.getByText(/jeans/i)).toBeInTheDocument();
    });
  });
});