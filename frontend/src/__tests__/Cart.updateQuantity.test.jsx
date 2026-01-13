// src/__tests__/Cart.updateQuantity.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Cart from "../pages/cart.jsx";

// ---- Mocks ----
const mockGetBasket = vi.fn();
const mockUpdateBasketItem = vi.fn();

vi.mock("../lib/api", () => ({
  meRequest: vi.fn().mockRejectedValue(new Error("Not logged in")), // guest
  getBasket: (...args) => mockGetBasket(...args),
  updateBasketItem: (...args) => mockUpdateBasketItem(...args),
  removeBasketItem: vi.fn().mockResolvedValue({
    data: {
      orderId: "ORDER-1",
      items: [],
      subtotal: 0,
    },
  }),
}));

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

describe("Cart page - quantity update & totals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    // initial basket: 1 item, qty 1, subtotal 100
    mockGetBasket.mockResolvedValue({
      data: {
        orderId: "ORDER-1",
        items: [
          {
            productId: "prod-1",
            sku: "sku-1",
            name: "Test Product",
            quantity: 1,
            unitPrice: 100,
            lineTotal: 100,
          },
        ],
        subtotal: 100,
      },
    });

    // when quantity is updated to 2, API returns updated basket
    mockUpdateBasketItem.mockResolvedValue({
      data: {
        orderId: "ORDER-1",
        items: [
          {
            productId: "prod-1",
            sku: "sku-1",
            name: "Test Product",
            quantity: 2,
            unitPrice: 100,
            lineTotal: 200,
          },
        ],
        subtotal: 200,
      },
    });
  });

  it("updates line total and subtotal when item quantity changes", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <Cart onClose={() => {}} />
      </MemoryRouter>
    );

    // wait for the cart to load (product name appears)
    await screen.findByText("Test Product");

    // ⚙️ grab DOM elements based on existing classes / structure
    const qtyEl = container.querySelector(".cart-qty-value");
    const lineTotalEl = container.querySelector(".cart-line-total");
    const subtotalRow = container.querySelectorAll(".cart-summary-row")[0];
    const subtotalValueEl = subtotalRow.querySelector("span:last-child");

    // sanity check initial values
    expect(qtyEl).toHaveTextContent("1");
    expect(lineTotalEl).toHaveTextContent("$100.00");
    expect(subtotalValueEl).toHaveTextContent("$100.00");

    // click "+" to increase quantity
    const plusButton = container.querySelector(
      ".cart-qty-control .cart-qty-btn:last-child"
    );
    await user.click(plusButton);

    // after API + state update, values should change
    await waitFor(() => {
      expect(container.querySelector(".cart-qty-value")).toHaveTextContent("2");
      expect(container.querySelector(".cart-line-total")).toHaveTextContent(
        "$200.00"
      );
      const updatedSubtotalRow = container.querySelectorAll(
        ".cart-summary-row"
      )[0];
      const updatedSubtotalValue =
        updatedSubtotalRow.querySelector("span:last-child");
      expect(updatedSubtotalValue).toHaveTextContent("$200.00");
    });

    // verify API was called with updated quantity
    expect(mockUpdateBasketItem).toHaveBeenCalledTimes(1);
    expect(mockUpdateBasketItem).toHaveBeenCalledWith({
      userId: undefined,
      cartId: "ORDER-1",
      productId: "prod-1",
      sku: "sku-1",
      quantity: 2,
    });
  });
});