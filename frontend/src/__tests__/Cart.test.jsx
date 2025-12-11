import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Cart from "../pages/cart.jsx";
//updates subtotal when quantity is increased
// Mock API module
vi.mock("../lib/api", () => {
  return {
    meRequest: vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        name: "Test User",
        emailAddress: "test@example.com",
        homeAddress: "Istanbul",
      },
    }),

    getBasket: vi.fn().mockResolvedValue({
      data: {
        orderId: "ORDER-1",
        items: [
          {
            productId: "PANTS-1",
            sku: "PANTS-1-BLACK-S",
            name: "Soft Pants",
            quantity: 1,
            lineTotal: 100,
            unitPrice: 100,
            mainImageUrl: null,
            imageUrls: [],
          },
        ],
        subtotal: 100,
      },
    }),

    updateBasketItem: vi.fn().mockResolvedValue({
      data: {
        orderId: "ORDER-1",
        items: [
          {
            productId: "PANTS-1",
            sku: "PANTS-1-BLACK-S",
            name: "Soft Pants",
            quantity: 2,
            lineTotal: 200,
            unitPrice: 100,
            mainImageUrl: null,
            imageUrls: [],
          },
        ],
        subtotal: 200,
      },
    }),

    removeBasketItem: vi.fn().mockResolvedValue({
      data: {
        orderId: "ORDER-1",
        items: [],
        subtotal: 0,
      },
    }),
  };
});

describe("Cart drawer", () => {
  it("updates subtotal when quantity is increased", async () => {
    window.localStorage.clear();

    render(
      <MemoryRouter>
        <Cart onClose={() => {}} />
      </MemoryRouter>
    );

    // Get ALL instances of '$100.00'
    const all100s = await screen.findAllByText("$100.00");

    // Subtotal is the SECOND instance (footer summary)
    expect(all100s[1]).toBeInTheDocument();

    // Increase quantity (+ button)
    const plusBtn = await screen.findByRole("button", { name: "+" });
    await userEvent.click(plusBtn);

    // After update, subtotal should include $200.00 somewhere
    await waitFor(() => {
      const newTotals = screen.getAllByText("$200.00");
      expect(newTotals.length).toBeGreaterThan(0);
    });
  });
});
