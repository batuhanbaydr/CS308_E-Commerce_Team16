// src/__tests__/Checkout.test.jsx

//disables CONFIRM PAYMENT button when basket is empty
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Checkout from "../pages/Checkout.jsx";

vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockResolvedValue({
    data: { id: "user-1", name: "Test User", homeAddress: "" },
  }),
  getBasket: vi.fn().mockResolvedValue({
    data: {
      orderId: "ORDER-1",
      items: [],           // 👈 empty basket
      subtotal: 0,
    },
  }),
  getAccountDetails: vi.fn().mockResolvedValue({ data: {} }),
  checkout: vi.fn(),
  logoutRequest: vi.fn(),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Checkout page", () => {
  it("disables CONFIRM PAYMENT button when basket is empty", async () => {
    // localStorage exists in jsdom; ensure it's clean
    window.localStorage.clear();

    render(
      <MemoryRouter initialEntries={["/checkout"]}>
        <Checkout />
      </MemoryRouter>
    );

    const confirmButton = await screen.findByRole("button", {
      name: /CONFIRM PAYMENT/i,
    });

    expect(confirmButton).toBeDisabled();
  });
});
