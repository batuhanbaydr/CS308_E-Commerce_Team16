// src/__tests__/ProductDetail.addToCart.test.jsx

// Goal: When you select a size and click ADD TO CART, we call addToBasket with correct productId + sku and quantity.
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetail from "../pages/ProductDetail.jsx";

vi.mock("../context/CartDrawerContext.jsx", () => ({
  useCartDrawer: () => ({ openCart: vi.fn() }),
}));

const mockFetchProduct = vi.fn();
const mockListProducts = vi.fn();
const mockMeRequest = vi.fn();
const mockAddToBasket = vi.fn();
const mockLogoutRequest = vi.fn();
const mockGetReviews = vi.fn();
const mockCreateReview = vi.fn();

vi.mock("../lib/api", () => ({
  fetchProduct: (...args) => mockFetchProduct(...args),
  listProducts: (...args) => mockListProducts(...args),
  meRequest: (...args) => mockMeRequest(...args),
  addToBasket: (...args) => mockAddToBasket(...args),
  logoutRequest: (...args) => mockLogoutRequest(...args),
  getReviewsForProduct: (...args) => mockGetReviews(...args),
  createReview: (...args) => mockCreateReview(...args),
}));

describe("ProductDetail - add to cart", () => {
  beforeEach(() => {
    mockFetchProduct.mockReset();
    mockListProducts.mockReset();
    mockMeRequest.mockReset();
    mockAddToBasket.mockReset();
    mockGetReviews.mockReset();
    mockCreateReview.mockReset();

    mockMeRequest.mockResolvedValue({
      data: { id: "user-1", name: "Batu", emailAddress: "batu@example.com" },
    });

    mockFetchProduct.mockResolvedValue({
      data: {
        id: "prod-1",
        name: "Test Sweatshirt",
        basePrice: "40.00",
        mainImageUrl: "/img.jpg",
        imageUrls: [],
        category: "sweatshirts",
        variants: [
          { size: "S", sku: "SKU-S", stock: 5, price: "40.00" },
          { size: "M", sku: "SKU-M", stock: 3, price: "40.00" },
        ],
      },
    });

    mockListProducts.mockResolvedValue({ data: [] });
    mockGetReviews.mockResolvedValue({ data: [] });
    mockAddToBasket.mockResolvedValue({
      data: { orderId: "order-1" },
    });
  });

  it("calls addToBasket with selected size's SKU", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/product/prod-1"]}>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(mockFetchProduct).toHaveBeenCalledWith("prod-1")
    );

    // select size M
    await user.click(screen.getByRole("button", { name: /^m$/i }));

    // click add to cart
    await user.click(
      screen.getByRole("button", { name: /add to cart/i })
    );

    await waitFor(() => {
      expect(mockAddToBasket).toHaveBeenCalledTimes(1);
    });

    const payload = mockAddToBasket.mock.calls[0][0];
    expect(payload).toMatchObject({
      productId: "prod-1",
      sku: "SKU-M",
      quantity: 1,
      userId: "user-1",
    });
  });
});