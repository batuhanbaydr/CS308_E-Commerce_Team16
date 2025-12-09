// src/__tests__/Cart.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Cart from "../pages/cart.jsx";

const mockMeRequest = vi.fn();
const mockGetBasket = vi.fn();
const mockUpdateBasketItem = vi.fn();
const mockRemoveBasketItem = vi.fn();

vi.mock("../lib/api", () => ({
  meRequest: (...args) => mockMeRequest(...args),
  getBasket: (...args) => mockGetBasket(...args),
  updateBasketItem: (...args) => mockUpdateBasketItem(...args),
  removeBasketItem: (...args) => mockRemoveBasketItem(...args),
}));

describe("Cart drawer", () => {
  beforeEach(() => {
    mockMeRequest.mockReset();
    mockGetBasket.mockReset();
    mockUpdateBasketItem.mockReset();
    mockRemoveBasketItem.mockReset();

    mockMeRequest.mockResolvedValue({
      data: {
        id: "user-1",
        name: "Cart User",
        emailAddress: "cart@example.com",
        homeAddress: "Somewhere",
        phoneNumber: "123",
      },
    });

    mockGetBasket.mockResolvedValue({
      data: {
        orderId: "order-1",
        subtotal: 50, // 1 item * 50
        items: [
          {
            productId: "prod-1",
            sku: "SKU-1",
            name: "Test Pants",
            quantity: 1,
            unitPrice: 50,
            lineTotal: 50,
            mainImageUrl: null,
            imageUrls: [],
          },
        ],
      },
    });

    mockUpdateBasketItem.mockResolvedValue({
      data: {
        orderId: "order-1",
        subtotal: 100, // after quantity 2
        items: [
          {
            productId: "prod-1",
            sku: "SKU-1",
            name: "Test Pants",
            quantity: 2,
            unitPrice: 50,
            lineTotal: 100,
            mainImageUrl: null,
            imageUrls: [],
          },
        ],
      },
    });
  });

  it("updates subtotal when quantity is increased", async () => {
    const user = userEvent.setup();

    render(<Cart />);

    // wait for /me and /basket
    await waitFor(() => expect(mockMeRequest).toHaveBeenCalled());
    await waitFor(() => expect(mockGetBasket).toHaveBeenCalled());

    // find the "Subtotal" row and assert it contains $50.00
    const subtotalRow = screen
      .getByText("Subtotal")
      .closest(".cart-summary-row");
    expect(subtotalRow).toHaveTextContent("$50.00");

    // click the '+' button in qty control
    const plusButton = screen.getByRole("button", { name: "+" });
    await user.click(plusButton);

    await waitFor(() => {
      expect(mockUpdateBasketItem).toHaveBeenCalledTimes(1);
    });

    // now the subtotal row should say $100.00
    const updatedSubtotalRow = screen
      .getByText("Subtotal")
      .closest(".cart-summary-row");
    expect(updatedSubtotalRow).toHaveTextContent("$100.00");
  });
});